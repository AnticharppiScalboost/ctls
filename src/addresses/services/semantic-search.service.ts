import { Inject, Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { PineconeService, SearchResult } from './pinecone.service';
import { AddressNormalizerService } from './address-normalizer.service';
import { addresses } from '../../db/schema';
import { DrizzleAsyncProvider } from '../../db/db.provider';
import { eq, inArray } from 'drizzle-orm';
import type { Database } from '../../db';
import type { 
  ProximitySearchRequest, 
  ProximitySearchResult,
  AddressSummary 
} from '../dto/proximity-search.dto';

@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name);

  constructor(
    @Inject(DrizzleAsyncProvider)
    private readonly db: Database,
    private readonly embeddingService: EmbeddingService,
    private readonly pineconeService: PineconeService,
    private readonly addressNormalizer: AddressNormalizerService,
  ) {}

  /**
   * Búsqueda semántica principal que combina Pinecone y la base de datos
   */
  async searchNearbyAddresses(
    request: ProximitySearchRequest,
  ): Promise<ProximitySearchResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`🧠 [SEMANTIC_SEARCH] ===========================================`);
      this.logger.log(`🧠 [SEMANTIC_SEARCH] Iniciando búsqueda semántica`);
      this.logger.log(`🧠 [SEMANTIC_SEARCH] Consulta: "${request.address}"`);
      this.logger.debug(`🧠 [SEMANTIC_SEARCH] Opciones: ${JSON.stringify(request.options, null, 2)}`);

      // 1. Generar embedding directo de la consulta (sin normalizar)
      this.logger.debug(`🧠 [SEMANTIC_SEARCH] Paso 1: Generando embedding directo...`);
      this.logger.log(`🧠 [SEMANTIC_SEARCH] Texto original para embedding: "${request.address}"`);
      
      const embeddingResult = await this.embeddingService.generateEmbedding(request.address);
      this.logger.log(`🧠 [SEMANTIC_SEARCH] Embedding generado: ${embeddingResult.dimensions} dimensiones`);

      // 2. Buscar en Pinecone
      this.logger.debug(`🧠 [SEMANTIC_SEARCH] Paso 2: Búsqueda vectorial en Pinecone...`);
      const semanticResults = await this.performSemanticSearch(
        embeddingResult.vectors,
        request.options
      );
      this.logger.log(`🧠 [SEMANTIC_SEARCH] Resultados vectoriales: ${semanticResults.length} encontrados`);

      if (semanticResults.length === 0) {
        this.logger.warn(`🧠 [SEMANTIC_SEARCH] Sin resultados vectoriales - fallback a normalización...`);
        
        // 3. Fallback: normalizar dirección y buscar nuevamente
        this.logger.debug(`🧠 [SEMANTIC_SEARCH] Paso 3: Normalizando dirección como fallback...`);
        const normalizedAddress = this.addressNormalizer.normalizeAddress(request.address);
        this.logger.debug(`🧠 [SEMANTIC_SEARCH] Dirección normalizada: ${JSON.stringify(normalizedAddress, null, 2)}`);
        
        const queryText = this.embeddingService.generateAddressEmbeddingText({
          addressRaw: request.address,
          ...normalizedAddress
        });
        this.logger.log(`🧠 [SEMANTIC_SEARCH] Texto normalizado para embedding: "${queryText}"`);
        
        const fallbackEmbedding = await this.embeddingService.generateEmbedding(queryText);
        const fallbackResults = await this.performSemanticSearch(
          fallbackEmbedding.vectors,
          request.options
        );
        
        this.logger.log(`🧠 [SEMANTIC_SEARCH] Resultados fallback: ${fallbackResults.length} encontrados`);
        
        if (fallbackResults.length === 0) {
          return this.buildEmptyResult(normalizedAddress, Date.now() - startTime, request.options);
        }
        
        // Usar resultados del fallback
        return this.processSemanticResults(fallbackResults, normalizedAddress, request, startTime);
      }

      // 4. Procesar resultados directos de Pinecone
      this.logger.debug(`🧠 [SEMANTIC_SEARCH] Paso 4: Procesando resultados directos...`);
      
      // Normalizar solo para cálculos de distancia, no para búsqueda
      const normalizedAddress = this.addressNormalizer.normalizeAddress(request.address);
      this.logger.debug(`🧠 [SEMANTIC_SEARCH] Dirección normalizada (solo para cálculos): ${JSON.stringify(normalizedAddress, null, 2)}`);
      
      return this.processSemanticResults(semanticResults, normalizedAddress, request, startTime);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ [SEMANTIC_SEARCH] Error después de ${processingTime}ms: ${error.message}`);
      this.logger.error(`❌ [SEMANTIC_SEARCH] Stack trace: ${error.stack}`);
      this.logger.log(`🧠 [SEMANTIC_SEARCH] ===========================================`);
      throw new Error(`Error en búsqueda semántica: ${error.message}`);
    }
  }

  /**
   * Procesa los resultados semánticos obtenidos de Pinecone
   */
  private async processSemanticResults(
    semanticResults: SearchResult[],
    normalizedAddress: any,
    request: ProximitySearchRequest,
    startTime: number
  ): Promise<ProximitySearchResult> {
    // 1. Obtener datos completos de la base de datos
    this.logger.debug(`🧠 [SEMANTIC_SEARCH] Paso: Obteniendo datos completos de BD...`);
    const addressIds = semanticResults.map(result => 
      String(result.metadata.id || result.metadata.addressId || result.id)
    ).filter(id => id && id !== 'undefined'); // Filtrar IDs válidos y convertir a string
    this.logger.debug(`🧠 [SEMANTIC_SEARCH] IDs a consultar: [${addressIds.join(', ')}]`);
    
    const fullAddresses = await this.getFullAddressData(addressIds);
    this.logger.log(`🧠 [SEMANTIC_SEARCH] Datos de BD obtenidos: ${fullAddresses.length} registros de ${addressIds.length} solicitados`);

    // 2. Combinar resultados semánticos con datos completos
    this.logger.debug(`🧠 [SEMANTIC_SEARCH] Paso: Enriqueciendo resultados...`);
    const enrichedResults = this.enrichSemanticResults(
      semanticResults,
      fullAddresses,
      normalizedAddress
    );
    this.logger.log(`🧠 [SEMANTIC_SEARCH] Resultados enriquecidos: ${enrichedResults.length} direcciones`);

    // Log de los mejores resultados
    if (enrichedResults.length > 0) {
      const topResults = enrichedResults.slice(0, 3).map(r => ({
        id: r.address.id,
        address: r.address.addressRaw,
        similarity: r.similarity.toFixed(4),
        distance: r.distance
      }));
      this.logger.log(`🧠 [SEMANTIC_SEARCH] Top 3 resultados: ${JSON.stringify(topResults, null, 2)}`);
    }

    // 3. Aplicar paginación
    this.logger.debug(`🧠 [SEMANTIC_SEARCH] Paso: Aplicando paginación...`);
    const paginatedResults = this.applyPagination(
      enrichedResults,
      request.options.page || 1,
      request.options.limit || 10
    );
    this.logger.log(`🧠 [SEMANTIC_SEARCH] Paginación: página ${request.options.page || 1}, mostrando ${paginatedResults.addresses.length} de ${enrichedResults.length}`);

    const processingTime = Date.now() - startTime;
    const response: ProximitySearchResult = {
      normalizedAddress,
      nearbyAddresses: paginatedResults.addresses,
      searchMetadata: {
        totalFound: enrichedResults.length,
        searchRadius: request.options.searchRadius,
        processingTime,
        page: request.options.page || 1,
        limit: request.options.limit || 10,
        hasNextPage: paginatedResults.hasNextPage,
        hasPrevPage: paginatedResults.hasPrevPage,
      },
    };

    this.logger.log(`✅ [SEMANTIC_SEARCH] Búsqueda completada en ${processingTime}ms: ${enrichedResults.length} resultados totales`);
    this.logger.log(`🧠 [SEMANTIC_SEARCH] ===========================================`);
    return response;
  }

  /**
   * Realiza la búsqueda vectorial en Pinecone
   */
  private async performSemanticSearch(
    queryVector: number[],
    options: any
  ): Promise<SearchResult[]> {
    const topK = Math.min((options.limit || 10) * 3, 100); // Buscar más para luego filtrar
    const minScore = this.calculateMinScore(options.searchRadius);

    this.logger.debug(`🔎 [VECTOR_SEARCH] topK calculado: ${topK} (limit: ${options.limit})`);
    this.logger.debug(`🔎 [VECTOR_SEARCH] minScore calculado: ${minScore} (radio: ${options.searchRadius})`);

    let results: SearchResult[] = [];

    // Si hay filtros geográficos, usar búsqueda filtrada
    if (options.municipality || options.neighborhood) {
      this.logger.log(`🔎 [VECTOR_SEARCH] Búsqueda regional: municipio="${options.municipality}", barrio="${options.neighborhood}"`);
      results = await this.pineconeService.searchInRegion(
        queryVector,
        options.municipality,
        options.neighborhood,
        topK,
        minScore
      );
    } else {
      this.logger.log(`🔎 [VECTOR_SEARCH] Búsqueda global sin filtros geográficos`);
      results = await this.pineconeService.searchSimilarAddresses(
        queryVector,
        topK,
        minScore
      );
    }

    this.logger.log(`🔎 [VECTOR_SEARCH] Resultados vectoriales obtenidos: ${results.length}`);
    if (results.length > 0) {
      const scoreRange = {
        max: Math.max(...results.map(r => r.score)).toFixed(4),
        min: Math.min(...results.map(r => r.score)).toFixed(4)
      };
      this.logger.debug(`🔎 [VECTOR_SEARCH] Rango de scores: ${scoreRange.min} - ${scoreRange.max}`);
    }

    return results;
  }

  /**
   * Calcula el score mínimo basado en el radio de búsqueda
   */
  private calculateMinScore(searchRadius: number): number {
    // A menor radio, mayor score requerido
    if (searchRadius <= 5) return 0.8;
    if (searchRadius <= 10) return 0.7;
    if (searchRadius <= 20) return 0.6;
    return 0.5;
  }

  /**
   * Obtiene datos completos de direcciones desde la base de datos
   */
  private async getFullAddressData(addressIds: string[]): Promise<any[]> {
    if (addressIds.length === 0) return [];

    try {
      this.logger.debug(`🗃️ [SEMANTIC_SEARCH] Consultando BD con IDs: [${addressIds.join(', ')}]`);
      
      const fullAddresses = await this.db
        .select({
          id: addresses.id,
          addressRaw: addresses.addressRaw,
          addressNorm: addresses.addressNorm,
          addressCanonical: addresses.addressCanonical,
          municipality: addresses.municipality,
          neighborhood: addresses.neighborhood,
          transactionValue: addresses.transactionValue,
          areaPrivM2: addresses.areaPrivM2,
          areaConstM2: addresses.areaConstM2,
          viaCode: addresses.viaCode,
          viaLabel: addresses.viaLabel,
          primaryNumber: addresses.primaryNumber,
          secondaryNumber: addresses.secondaryNumber,
          tertiaryNumber: addresses.tertiaryNumber,
          quadrant: addresses.quadrant,
          department: addresses.department,
        })
        .from(addresses)
        .where(inArray(addresses.id, addressIds));

      this.logger.debug(`✅ [SEMANTIC_SEARCH] BD consultada exitosamente: ${fullAddresses.length} registros encontrados`);
      return fullAddresses;
      
    } catch (error) {
      this.logger.error(`❌ [SEMANTIC_SEARCH] Error consultando BD: ${error.message}`);
      this.logger.warn(`⚠️ [SEMANTIC_SEARCH] Continuando solo con metadata de Pinecone...`);
      
      // Si falla la BD, retornar array vacío para que se use solo metadata de Pinecone
      return [];
    }
  }

  /**
   * Combina resultados semánticos con datos completos de la BD
   */
  private enrichSemanticResults(
    semanticResults: SearchResult[],
    fullAddresses: any[],
    normalizedQuery: any
  ): Array<{
    address: AddressSummary;
    similarity: number;
    distance: number;
  }> {
    const addressMap = new Map(fullAddresses.map(addr => [addr.id, addr]));

    return semanticResults
      .map(result => {
        // Priorizar ID de metadata Pinecone, luego BD (convertir a string)
        const addressId = String(result.metadata.id || result.metadata.addressId || result.id);
        const fullAddress = addressMap.get(addressId);
        
        if (!fullAddress) {
          // Si no encontramos en BD, usar datos de Pinecone
          this.logger.debug(`📌 [SEMANTIC_SEARCH] ID ${addressId} no encontrado en BD local, usando metadata de Pinecone`);
          return {
            address: this.mapPineconeMetadataToSummary(result.metadata, addressId),
            similarity: result.score,
            distance: this.calculateSemanticDistanceFromMetadata(normalizedQuery, result.metadata),
          };
        }

        const normalizedResult = this.addressNormalizer.normalizeAddress(
          fullAddress.addressRaw || ''
        );

        return {
          address: this.mapDbAddressToSummary(fullAddress),
          similarity: result.score, // Score semántico de Pinecone
          distance: this.calculateSemanticDistance(normalizedQuery, normalizedResult),
        };
      })
      .filter(result => result !== null)
      .sort((a, b) => b!.similarity - a!.similarity); // Ordenar por similitud semántica
  }

  /**
   * Calcula distancia semántica (complementaria al score de Pinecone)
   */
  private calculateSemanticDistance(address1: any, address2: any): number {
    let distance = 0;

    // Distancia basada en componentes estructurales
    if (address1.primaryNumber && address2.primaryNumber) {
      distance += Math.abs(address1.primaryNumber - address2.primaryNumber) / 100;
    }

    if (address1.viaLabel && address2.viaLabel) {
      const via1 = parseInt(address1.viaLabel.match(/\d+/)?.[0] || '0');
      const via2 = parseInt(address2.viaLabel.match(/\d+/)?.[0] || '0');
      distance += Math.abs(via1 - via2) / 10;
    }

    // Bonificación por mismo barrio/municipio
    if (address1.neighborhood === address2.neighborhood && address1.neighborhood) {
      distance *= 0.5;
    }
    if (address1.municipality === address2.municipality && address1.municipality) {
      distance *= 0.8;
    }

    return Math.round(distance * 10) / 10;
  }

  /**
   * Aplica paginación a los resultados
   */
  private applyPagination(
    results: any[],
    page: number,
    limit: number
  ): { addresses: any[]; hasNextPage: boolean; hasPrevPage: boolean } {
    const offset = (page - 1) * limit;
    const paginatedAddresses = results.slice(offset, offset + limit);
    
    return {
      addresses: paginatedAddresses,
      hasNextPage: offset + limit < results.length,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Construye respuesta vacía
   */
  private buildEmptyResult(
    normalizedAddress: any,
    processingTime: number,
    options: any
  ): ProximitySearchResult {
    return {
      normalizedAddress,
      nearbyAddresses: [],
      searchMetadata: {
        totalFound: 0,
        searchRadius: options.searchRadius,
        processingTime,
        page: options.page || 1,
        limit: options.limit || 10,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  /**
   * Mapea dirección de BD a formato de respuesta
   */
  private mapDbAddressToSummary(dbAddress: any): AddressSummary {
    return {
      id: dbAddress.id,
      addressRaw: dbAddress.addressRaw,
      addressNorm: dbAddress.addressNorm,
      addressCanonical: dbAddress.addressCanonical,
      municipality: dbAddress.municipality,
      neighborhood: dbAddress.neighborhood,
      transactionValue: dbAddress.transactionValue,
      areaPrivM2: dbAddress.areaPrivM2,
      areaConstM2: dbAddress.areaConstM2,
    };
  }

  /**
   * Mapea metadata de Pinecone a formato de respuesta cuando no hay datos en BD
   */
  private mapPineconeMetadataToSummary(metadata: any, addressId: string): AddressSummary {
    return {
      id: addressId,
      addressRaw: metadata.address_raw || metadata.addressRaw || 'Dirección no disponible',
      addressNorm: metadata.address_norm || metadata.addressNorm || undefined,
      addressCanonical: metadata.address_canonical || metadata.addressCanonical || undefined,
      municipality: metadata.municipality || undefined,
      neighborhood: metadata.neighborhood || undefined,
      transactionValue: metadata.transaction_value_cop ? parseFloat(metadata.transaction_value_cop) : undefined,
      areaPrivM2: undefined, // No disponible en metadata
      areaConstM2: undefined, // No disponible en metadata
    };
  }

  /**
   * Calcula distancia semántica usando datos de metadata de Pinecone
   */
  private calculateSemanticDistanceFromMetadata(normalizedQuery: any, metadata: any): number {
    let distance = 0;

    // Intentar extraer información estructurada de address_struct si existe
    if (metadata.address_struct) {
      try {
        const parsed = JSON.parse(metadata.address_struct);
        
        if (normalizedQuery.primaryNumber && parsed.primary) {
          distance += Math.abs(normalizedQuery.primaryNumber - (parsed.primary || 0)) / 100;
        }
        
        if (normalizedQuery.viaLabel && parsed.via_label) {
          const via1 = parseInt(normalizedQuery.viaLabel.match(/\d+/)?.[0] || '0');
          const via2 = parseInt(parsed.via_label.match(/\d+/)?.[0] || '0');
          distance += Math.abs(via1 - via2) / 10;
        }
      } catch (error) {
        this.logger.debug(`🧠 [SEMANTIC_SEARCH] Error parsing address_struct: ${error.message}`);
      }
    }

    // Bonificación por mismo municipio
    if (normalizedQuery.municipality && metadata.municipality && 
        normalizedQuery.municipality.toLowerCase() === metadata.municipality.toLowerCase()) {
      distance *= 0.8;
    }

    return Math.round(distance * 10) / 10;
  }

  /**
   * Verifica si los servicios están configurados correctamente
   */
  isConfigured(): boolean {
    return this.embeddingService.isConfigured() && this.pineconeService.isConfigured();
  }
}
