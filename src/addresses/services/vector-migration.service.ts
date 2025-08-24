import { Inject, Injectable, Logger } from '@nestjs/common';
import { addresses } from '../../db/schema';
import { DrizzleAsyncProvider } from '../../db/db.provider';
import { EmbeddingService } from './embedding.service';
import { PineconeService, VectorRecord } from './pinecone.service';
import type { Database } from '../../db';
import { sql } from 'drizzle-orm';

export interface MigrationProgress {
  total: number;
  processed: number;
  failed: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemaining: number; // en minutos
}

export interface MigrationOptions {
  batchSize?: number;
  skipExisting?: boolean;
  maxRetries?: number;
  testMode?: boolean; // Solo procesa primeros 100 registros
}

@Injectable()
export class VectorMigrationService {
  private readonly logger = new Logger(VectorMigrationService.name);

  constructor(
    @Inject(DrizzleAsyncProvider)
    private readonly db: Database,
    private readonly embeddingService: EmbeddingService,
    private readonly pineconeService: PineconeService,
  ) {}

  /**
   * Migra todas las direcciones existentes a vectores en Pinecone
   */
  async migrateAllAddressesToVectors(
    options: MigrationOptions = {}
  ): Promise<MigrationProgress> {
    const {
      batchSize = 50,
      skipExisting = false,
      maxRetries = 3,
      testMode = false
    } = options;

    this.logger.log('='.repeat(60));
    this.logger.log('🚀 INICIANDO MIGRACIÓN DE DIRECCIONES A VECTORES');
    this.logger.log('='.repeat(60));

    const startTime = Date.now();

    try {
      // 1. Verificar configuración
      await this.validateServices();

      // 2. Crear índice si no existe
      await this.pineconeService.createIndexIfNotExists();

      // 3. Obtener total de direcciones
      const totalAddresses = await this.getTotalAddresses();
      const addressesToProcess = testMode ? Math.min(totalAddresses, 100) : totalAddresses;
      
      this.logger.log(`📊 Total direcciones en BD: ${totalAddresses}`);
      this.logger.log(`🎯 Direcciones a procesar: ${addressesToProcess}`);
      if (testMode) this.logger.warn('⚠️  MODO TEST ACTIVADO - Solo 100 registros');

      // 4. Procesar en lotes
      const totalBatches = Math.ceil(addressesToProcess / batchSize);
      let processed = 0;
      let failed = 0;

      for (let batch = 0; batch < totalBatches; batch++) {
        const offset = batch * batchSize;
        const limit = Math.min(batchSize, addressesToProcess - offset);

        this.logger.log(`\n📦 Procesando lote ${batch + 1}/${totalBatches} (${limit} direcciones)`);

        try {
          const batchResult = await this.processBatch(offset, limit, skipExisting, maxRetries);
          processed += batchResult.processed;
          failed += batchResult.failed;

          // Mostrar progreso
          const progress = this.calculateProgress(
            addressesToProcess, 
            processed, 
            failed, 
            batch + 1, 
            totalBatches,
            startTime
          );
          
          this.logProgress(progress);

          // Pausa entre lotes para no sobrecargar APIs
          if (batch < totalBatches - 1) {
            this.logger.log('⏱️  Pausa de 2 segundos...');
            await this.delay(2000);
          }

        } catch (error) {
          this.logger.error(`❌ Error en lote ${batch + 1}: ${error.message}`);
          failed += limit;
        }
      }

      // 5. Resultado final
      const finalProgress = this.calculateProgress(
        addressesToProcess, 
        processed, 
        failed, 
        totalBatches, 
        totalBatches,
        startTime
      );

      this.logFinalResult(finalProgress, startTime);
      return finalProgress;

    } catch (error) {
      this.logger.error(`💥 Error crítico en migración: ${error.message}`);
      throw error;
    }
  }

  /**
   * Procesa un lote de direcciones
   */
  private async processBatch(
    offset: number, 
    limit: number, 
    skipExisting: boolean,
    maxRetries: number
  ): Promise<{ processed: number; failed: number }> {
    try {
      // Obtener direcciones del lote
      const addressesBatch = await this.getAddressesBatch(offset, limit);
      
      if (addressesBatch.length === 0) {
        return { processed: 0, failed: 0 };
      }

      // Generar embeddings para el lote
      const embeddingTexts = addressesBatch.map(addr => 
        this.embeddingService.generateAddressEmbeddingText(addr)
      );

      const embeddings = await this.embeddingService.generateEmbeddings(embeddingTexts);

      // Crear records para Pinecone con estructura compatible
      const vectorRecords: VectorRecord[] = addressesBatch.map((addr, index) => ({
        id: addr.id, // Usar ID directo sin prefijo
        values: embeddings[index].vectors,
        metadata: {
          // Estructura nueva (snake_case)
          id: addr.id,
          address_raw: addr.addressRaw || '',
          address_norm: addr.addressNorm,
          address_canonical: addr.addressCanonical,
          municipality: addr.municipality,
          department: addr.department,
          transaction_value_cop: addr.transactionValue?.toString() || '0.0',
          // Campos legacy para compatibilidad
          addressId: addr.id,
          addressRaw: addr.addressRaw || '',
          addressNorm: addr.addressNorm,
          addressCanonical: addr.addressCanonical,
          neighborhood: addr.neighborhood,
          viaCode: addr.viaCode,
          viaLabel: addr.viaLabel,
          primaryNumber: addr.primaryNumber,
          secondaryNumber: addr.secondaryNumber,
          embeddingText: embeddingTexts[index],
        }
      }));

      // Insertar en Pinecone con reintentos
      await this.upsertWithRetries(vectorRecords, maxRetries);

      return { processed: addressesBatch.length, failed: 0 };

    } catch (error) {
      this.logger.error(`Error procesando lote: ${error.message}`);
      return { processed: 0, failed: limit };
    }
  }

  /**
   * Inserta vectores en Pinecone con reintentos
   */
  private async upsertWithRetries(
    vectorRecords: VectorRecord[], 
    maxRetries: number
  ): Promise<void> {
    let attempt = 1;
    
    while (attempt <= maxRetries) {
      try {
        await this.pineconeService.upsertVectors(vectorRecords);
        return;
      } catch (error) {
        this.logger.warn(`⚠️  Intento ${attempt}/${maxRetries} falló: ${error.message}`);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Espera exponencial
        await this.delay(Math.pow(2, attempt) * 1000);
        attempt++;
      }
    }
  }

  /**
   * Obtiene un lote de direcciones de la base de datos
   */
  private async getAddressesBatch(offset: number, limit: number): Promise<any[]> {
    return await this.db
      .select({
        id: addresses.id,
        addressRaw: addresses.addressRaw,
        addressNorm: addresses.addressNorm,
        addressCanonical: addresses.addressCanonical,
        municipality: addresses.municipality,
        neighborhood: addresses.neighborhood,
        viaCode: addresses.viaCode,
        viaLabel: addresses.viaLabel,
        primaryNumber: addresses.primaryNumber,
        secondaryNumber: addresses.secondaryNumber,
        quadrant: addresses.quadrant,
        department: addresses.department,
        transactionValue: addresses.transactionValue,
      })
      .from(addresses)
      .limit(limit)
      .offset(offset);
  }

  /**
   * Obtiene el total de direcciones en la base de datos
   */
  private async getTotalAddresses(): Promise<number> {
    const result = await this.db
      .select({ count: sql`count(*)::int`.as('count') })
      .from(addresses);
    
    return Number(result[0]?.count) || 0;
  }

  /**
   * Calcula el progreso de la migración
   */
  private calculateProgress(
    total: number,
    processed: number,
    failed: number,
    currentBatch: number,
    totalBatches: number,
    startTime: number
  ): MigrationProgress {
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
    const elapsedTime = (Date.now() - startTime) / 1000 / 60; // minutos
    const estimatedTimeRemaining = processed > 0 
      ? Math.round((elapsedTime / processed) * (total - processed))
      : 0;

    return {
      total,
      processed,
      failed,
      percentage,
      currentBatch,
      totalBatches,
      estimatedTimeRemaining,
    };
  }

  /**
   * Muestra el progreso en logs
   */
  private logProgress(progress: MigrationProgress): void {
    const { processed, total, percentage, failed, estimatedTimeRemaining } = progress;
    
    this.logger.log(`📈 Progreso: ${processed}/${total} (${percentage}%)`);
    if (failed > 0) this.logger.warn(`⚠️  Fallidos: ${failed}`);
    if (estimatedTimeRemaining > 0) {
      this.logger.log(`⏱️  Tiempo estimado restante: ${estimatedTimeRemaining} minutos`);
    }
  }

  /**
   * Muestra el resultado final
   */
  private logFinalResult(progress: MigrationProgress, startTime: number): void {
    const totalTime = Math.round((Date.now() - startTime) / 1000 / 60 * 100) / 100;
    
    this.logger.log('\n' + '='.repeat(60));
    this.logger.log('✅ MIGRACIÓN COMPLETADA');
    this.logger.log('='.repeat(60));
    this.logger.log(`📊 Total procesadas: ${progress.processed}/${progress.total}`);
    this.logger.log(`❌ Fallidas: ${progress.failed}`);
    this.logger.log(`🎯 Tasa de éxito: ${Math.round((progress.processed / progress.total) * 100)}%`);
    this.logger.log(`⏱️  Tiempo total: ${totalTime} minutos`);
    this.logger.log('='.repeat(60));
  }

  /**
   * Valida que todos los servicios estén configurados
   */
  private async validateServices(): Promise<void> {
    if (!this.embeddingService.isConfigured()) {
      throw new Error('Servicio de embeddings no configurado (REPLICATE_API_TOKEN)');
    }

    if (!this.pineconeService.isConfigured()) {
      throw new Error('Servicio de Pinecone no configurado (PINECONE_API_KEY)');
    }

    this.logger.log('✅ Servicios configurados correctamente');
  }

  /**
   * Obtiene estadísticas del índice después de la migración
   */
  async getPostMigrationStats(): Promise<any> {
    try {
      return await this.pineconeService.getIndexStats();
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas: ${error.message}`);
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
