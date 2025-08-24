import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: {
    id: string;
    address_raw: string;
    address_norm?: string;
    address_canonical?: string;
    address_struct?: string;
    municipality?: string;
    department?: string;
    transaction_value_cop?: string;
    // Campos legacy para compatibilidad
    addressId?: string;
    addressRaw?: string;
    addressNorm?: string;
    addressCanonical?: string;
    neighborhood?: string;
    viaCode?: string;
    viaLabel?: string;
    primaryNumber?: number;
    secondaryNumber?: number;
    embeddingText?: string;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: VectorRecord['metadata'];
}

@Injectable()
export class PineconeService {
  private readonly logger = new Logger(PineconeService.name);
  private readonly pinecone: Pinecone;
  private readonly indexName: string = 'hability-addresses';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('PINECONE_API_KEY');
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY no configurada en variables de entorno');
    }

    this.pinecone = new Pinecone({
      apiKey: apiKey,
    });
  }

  /**
   * Obtiene el índice de Pinecone
   */
  private async getIndex() {
    try {
      return this.pinecone.index(this.indexName);
    } catch (error) {
      this.logger.error(`Error accediendo al índice ${this.indexName}: ${error.message}`);
      throw new Error(`Error de conexión con Pinecone: ${error.message}`);
    }
  }

  /**
   * Crea el índice si no existe
   */
  async createIndexIfNotExists(): Promise<void> {
    try {
      this.logger.log(`Verificando existencia del índice: ${this.indexName}`);
      
      const existingIndexes = await this.pinecone.listIndexes();
      const indexExists = existingIndexes.indexes?.some(
        index => index.name === this.indexName
      );

      if (!indexExists) {
        this.logger.log(`Creando índice: ${this.indexName}`);
        
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 768, // Dimensión del modelo GTE-base
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });

        this.logger.log(`Índice ${this.indexName} creado exitosamente`);
        
        // Esperar a que el índice esté listo
        await this.waitForIndexReady();
      } else {
        this.logger.log(`Índice ${this.indexName} ya existe`);
      }
    } catch (error) {
      this.logger.error(`Error creando índice: ${error.message}`);
      throw error;
    }
  }

  /**
   * Espera a que el índice esté listo para usar
   */
  private async waitForIndexReady(): Promise<void> {
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const indexStats = await this.pinecone.index(this.indexName).describeIndexStats();
        if (indexStats) {
          this.logger.log('Índice listo para usar');
          return;
        }
      } catch (error) {
        this.logger.log(`Esperando a que el índice esté listo... (intento ${attempts + 1})`);
      }
      
      await this.delay(3000);
      attempts++;
    }
    
    throw new Error('Timeout esperando a que el índice esté listo');
  }

  /**
   * Inserta o actualiza un vector en Pinecone
   */
  async upsertVector(record: VectorRecord): Promise<void> {
    try {
      const index = await this.getIndex();
      
      await index.upsert([{
        id: record.id,
        values: record.values,
        metadata: record.metadata
      }]);

      this.logger.debug(`Vector insertado: ${record.id}`);
    } catch (error) {
      this.logger.error(`Error insertando vector ${record.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Inserta múltiples vectores en batch
   */
  async upsertVectors(records: VectorRecord[]): Promise<void> {
    const startTime = Date.now();
    try {
      this.logger.log(`📤 [PINECONE_UPSERT] Iniciando inserción de ${records.length} vectores`);
      
      if (records.length > 0) {
        this.logger.debug(`📤 [PINECONE_UPSERT] Ejemplo de registro: ID="${records[0].id}", dimensiones=${records[0].values.length}`);
        this.logger.debug(`📤 [PINECONE_UPSERT] Dirección ejemplo: "${records[0].metadata.addressRaw}"`);
      }
      
      const index = await this.getIndex();

      // Procesar en lotes de 100 (límite de Pinecone)
      const batchSize = 100;
      const totalBatches = Math.ceil(records.length / batchSize);
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batchNumber = Math.floor(i / batchSize) + 1;
        const batch = records.slice(i, i + batchSize);
        
        this.logger.log(`📤 [PINECONE_UPSERT] Procesando lote ${batchNumber}/${totalBatches} (${batch.length} vectores)`);
        
        const vectors = batch.map(record => ({
          id: record.id,
          values: record.values,
          metadata: record.metadata
        }));

        const batchStartTime = Date.now();
        await index.upsert(vectors);
        const batchTime = Date.now() - batchStartTime;
        
        this.logger.log(`✅ [PINECONE_UPSERT] Lote ${batchNumber} completado en ${batchTime}ms`);
        
        // Pausa pequeña entre lotes
        if (i + batchSize < records.length) {
          this.logger.debug(`⏱️ [PINECONE_UPSERT] Pausa de 200ms antes del siguiente lote...`);
          await this.delay(200);
        }
      }

      const totalTime = Date.now() - startTime;
      this.logger.log(`✅ [PINECONE_UPSERT] Inserción completada en ${totalTime}ms (promedio: ${Math.round(totalTime / records.length)}ms por vector)`);
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error(`❌ [PINECONE_UPSERT] Error después de ${totalTime}ms: ${error.message}`);
      this.logger.error(`❌ [PINECONE_UPSERT] Stack trace: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Busca direcciones similares usando búsqueda vectorial
   */
  async searchSimilarAddresses(
    queryVector: number[],
    topK: number = 10,
    minScore: number = 0.7,
    filters?: { [key: string]: any }
  ): Promise<SearchResult[]> {
    const startTime = Date.now();
    try {
      this.logger.log(`🔍 [PINECONE_SEARCH] Iniciando búsqueda vectorial`);
      this.logger.debug(`🔍 [PINECONE_SEARCH] Parámetros: topK=${topK}, minScore=${minScore}`);
      this.logger.debug(`🔍 [PINECONE_SEARCH] Vector dimensión: ${queryVector.length}`);
      this.logger.debug(`🔍 [PINECONE_SEARCH] Primeros 5 valores del vector: [${queryVector.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
      
      if (filters) {
        this.logger.debug(`🔍 [PINECONE_SEARCH] Filtros aplicados: ${JSON.stringify(filters)}`);
      }
      
      const index = await this.getIndex();
      
      const queryRequest: any = {
        vector: queryVector,
        topK: topK,
        includeMetadata: true,
        includeValues: false
      };

      if (filters) {
        queryRequest.filter = filters;
      }

      this.logger.debug(`🔍 [PINECONE_SEARCH] Ejecutando consulta en Pinecone...`);
      const queryResponse = await index.query(queryRequest);
      const queryTime = Date.now() - startTime;
      
      this.logger.debug(`🔍 [PINECONE_SEARCH] Respuesta de Pinecone recibida en ${queryTime}ms`);
      this.logger.debug(`🔍 [PINECONE_SEARCH] Matches encontrados: ${queryResponse.matches?.length || 0}`);
      
      if (queryResponse.matches && queryResponse.matches.length > 0) {
        const topScores = queryResponse.matches.slice(0, 3).map(m => ({
          id: m.id,
          score: m.score?.toFixed(4),
          address: (typeof m.metadata?.address_raw === 'string' ? m.metadata.address_raw : 
                   typeof m.metadata?.addressRaw === 'string' ? m.metadata.addressRaw : 'N/A')
        }));
        this.logger.debug(`🔍 [PINECONE_SEARCH] Top 3 matches: ${JSON.stringify(topScores, null, 2)}`);
      }
      
      const results: SearchResult[] = (queryResponse.matches || [])
        .filter(match => {
          const hasScore = match.score && match.score >= minScore;
          if (!hasScore && match.score) {
            this.logger.debug(`🔍 [PINECONE_SEARCH] Descartando resultado con score ${match.score.toFixed(4)} < ${minScore}`);
          }
          return hasScore;
        })
        .map(match => ({
          id: match.id || '',
          score: match.score || 0,
          metadata: match.metadata as VectorRecord['metadata']
        }));

      this.logger.log(`✅ [PINECONE_SEARCH] Completada en ${queryTime}ms: ${results.length} resultados con score >= ${minScore}`);
      
      if (results.length > 0) {
        this.logger.log(`🎯 [PINECONE_SEARCH] Mejor resultado: "${results[0].metadata.addressRaw}" (score: ${results[0].score.toFixed(4)})`);
      }
      
      return results;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.logger.error(`❌ [PINECONE_SEARCH] Error después de ${queryTime}ms: ${error.message}`);
      this.logger.error(`❌ [PINECONE_SEARCH] Stack trace: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Elimina un vector del índice
   */
  async deleteVector(id: string): Promise<void> {
    try {
      const index = await this.getIndex();
      await index.deleteOne(id);
      this.logger.debug(`Vector eliminado: ${id}`);
    } catch (error) {
      this.logger.error(`Error eliminando vector ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas del índice
   */
  async getIndexStats(): Promise<any> {
    try {
      const index = await this.getIndex();
      const stats = await index.describeIndexStats();
      
      this.logger.log(`Estadísticas del índice: ${JSON.stringify(stats, null, 2)}`);
      return stats;
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca direcciones en una región específica
   */
  async searchInRegion(
    queryVector: number[],
    municipality?: string,
    neighborhood?: string,
    topK: number = 10,
    minScore: number = 0.7
  ): Promise<SearchResult[]> {
    const filters: { [key: string]: any } = {};
    
    if (municipality) {
      filters.municipality = municipality;
    }
    
    if (neighborhood) {
      filters.neighborhood = neighborhood;
    }

    return this.searchSimilarAddresses(queryVector, topK, minScore, filters);
  }

  /**
   * Limpia completamente el índice (usar con precaución)
   */
  async clearIndex(): Promise<void> {
    try {
      this.logger.warn('ATENCIÓN: Limpiando completamente el índice');
      const index = await this.getIndex();
      await index.deleteAll();
      this.logger.log('Índice limpiado exitosamente');
    } catch (error) {
      this.logger.error(`Error limpiando índice: ${error.message}`);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validar que la API key de Pinecone esté configurada
   */
  isConfigured(): boolean {
    return !!this.configService.get<string>('PINECONE_API_KEY');
  }
}
