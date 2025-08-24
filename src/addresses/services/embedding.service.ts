import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Replicate from 'replicate';

export interface EmbeddingResult {
  text: string;
  vectors: number[];
  dimensions: number;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly replicate: Replicate;

  constructor(private readonly configService: ConfigService) {
    const replicateToken = this.configService.get<string>('REPLICATE_API_TOKEN');
    if (!replicateToken) {
      throw new Error('REPLICATE_API_TOKEN no configurada en variables de entorno');
    }
    
    this.replicate = new Replicate({
      auth: replicateToken,
    });
  }

  /**
   * Genera embeddings para un texto usando el modelo GTE-base de Replicate
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now();
    try {
      this.logger.log(`🔧 [EMBEDDING] Iniciando generación para texto: "${text}"`);
      this.logger.debug(`🔧 [EMBEDDING] Texto completo: "${text}"`);
      
      // Limpiar texto suavemente manteniendo contexto geográfico
      const cleanText = this.cleanAddressForEmbedding(text);
      this.logger.debug(`🔧 [EMBEDDING] Texto limpio: "${cleanText}"`);
      this.logger.debug(`🔧 [EMBEDDING] Longitud texto: ${cleanText.length} caracteres`);
      
      const output = await this.replicate.run(
        "mark3labs/embeddings-gte-base:d619cff29338b9a37c3d06605042e1ff0594a8c3eff0175fd6967f5643fc4d47",
        {
          input: {
            text: cleanText
          }
        }
      ) as { text: string; vectors: number[] };

      const processingTime = Date.now() - startTime;

      const result: EmbeddingResult = {
        text: output.text,
        vectors: output.vectors,
        dimensions: output.vectors.length
      };

      this.logger.log(`✅ [EMBEDDING] Generado exitosamente en ${processingTime}ms (${result.dimensions} dimensiones)`);
      this.logger.debug(`🔧 [EMBEDDING] Primeros 5 valores del vector: [${result.vectors.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
      
      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ [EMBEDDING] Error después de ${processingTime}ms: ${error.message}`);
      this.logger.error(`❌ [EMBEDDING] Stack trace: ${error.stack}`);
      throw new Error(`No se pudo generar embedding: ${error.message}`);
    }
  }

  /**
   * Genera embeddings para múltiples textos en batch
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const startTime = Date.now();
    this.logger.log(`📦 [BATCH_EMBEDDING] Iniciando generación para ${texts.length} textos`);
    
    const results: EmbeddingResult[] = [];
    
    // Procesar en lotes para evitar rate limits
    const batchSize = 5;
    const totalBatches = Math.ceil(texts.length / batchSize);
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batch = texts.slice(i, i + batchSize);
      
      this.logger.log(`📦 [BATCH_EMBEDDING] Procesando lote ${batchNumber}/${totalBatches} (${batch.length} textos)`);
      this.logger.debug(`📦 [BATCH_EMBEDDING] Textos del lote: ${batch.map(t => `"${t}"`).join(', ')}`);
      
      const batchStartTime = Date.now();
      const batchPromises = batch.map(text => this.generateEmbedding(text));
      const batchResults = await Promise.all(batchPromises);
      const batchTime = Date.now() - batchStartTime;
      
      results.push(...batchResults);
      
      this.logger.log(`✅ [BATCH_EMBEDDING] Lote ${batchNumber} completado en ${batchTime}ms`);
      
      // Pausa pequeña entre lotes
      if (i + batchSize < texts.length) {
        this.logger.debug(`⏱️ [BATCH_EMBEDDING] Pausa de 500ms antes del siguiente lote...`);
        await this.delay(500);
      }
    }
    
    const totalTime = Date.now() - startTime;
    this.logger.log(`✅ [BATCH_EMBEDDING] Completados ${results.length} embeddings en ${totalTime}ms (promedio: ${Math.round(totalTime / results.length)}ms por embedding)`);
    return results;
  }

  /**
   * Limpia una dirección para embedding sin perder información contextual
   */
  cleanAddressForEmbedding(rawAddress: string): string {
    return rawAddress
      .trim()
      // Solo normalizar espacios múltiples
      .replace(/\s+/g, ' ')
      // Remover caracteres no alfanuméricos excepto espacios, #, -, y acentos
      .replace(/[^\w\s#\-áéíóúñüÁÉÍÓÚÑÜ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normaliza una dirección para generar embeddings más consistentes (solo para fallback)
   */
  normalizeAddressForEmbedding(rawAddress: string): string {
    return rawAddress
      .toLowerCase()
      .trim()
      // Normalizar abreviaciones comunes
      .replace(/\bcalle\b/g, 'cl')
      .replace(/\bcarrera\b/g, 'kr')
      .replace(/\bavenida\b/g, 'av')
      .replace(/\btransversal\b/g, 'tv')
      .replace(/\bdiagonal\b/g, 'dg')
      // Normalizar conectores
      .replace(/\s+no\s+/g, ' # ')
      .replace(/\s+num\s+/g, ' # ')
      .replace(/\s+numero\s+/g, ' # ')
      // Normalizar espacios
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Genera un texto optimizado para embedding que incluye variaciones de la dirección
   */
  generateAddressEmbeddingText(address: {
    addressRaw?: string;
    addressNorm?: string;
    addressCanonical?: string;
    municipality?: string;
    neighborhood?: string;
    viaCode?: string;
    viaLabel?: string;
    primaryNumber?: number;
    secondaryNumber?: number;
  }): string {
    const parts: string[] = [];

    // Incluir todas las variaciones de la dirección
    if (address.addressRaw) {
      parts.push(this.normalizeAddressForEmbedding(address.addressRaw));
    }
    if (address.addressNorm && address.addressNorm !== address.addressRaw) {
      parts.push(this.normalizeAddressForEmbedding(address.addressNorm));
    }
    if (address.addressCanonical && 
        address.addressCanonical !== address.addressNorm && 
        address.addressCanonical !== address.addressRaw) {
      parts.push(this.normalizeAddressForEmbedding(address.addressCanonical));
    }

    // Incluir forma estructurada
    if (address.viaCode && address.viaLabel && address.primaryNumber) {
      let structured = `${address.viaCode} ${address.viaLabel} ${address.primaryNumber}`;
      if (address.secondaryNumber) {
        structured += ` ${address.secondaryNumber}`;
      }
      parts.push(structured);
    }

    // Incluir contexto geográfico
    if (address.neighborhood) {
      parts.push(address.neighborhood.toLowerCase());
    }
    if (address.municipality) {
      parts.push(address.municipality.toLowerCase());
    }

    return parts.join(' | ');
  }

  /**
   * Calcula similitud coseno entre dos vectores
   */
  calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Los vectores deben tener la misma dimensión');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validar que la API key de Replicate esté configurada
   */
  isConfigured(): boolean {
    return !!this.configService.get<string>('REPLICATE_API_TOKEN');
  }
}
