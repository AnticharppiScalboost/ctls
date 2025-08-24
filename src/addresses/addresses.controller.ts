import { Controller, Get, ParseIntPipe, Query, Post, Body, Logger } from '@nestjs/common';
import { AddressesService } from './addresses.services';
import { ProximitySearchService } from './services/proximity-search.service';
import { SemanticSearchService } from './services/semantic-search.service';
import { VectorMigrationService } from './services/vector-migration.service';
import type { MigrationOptions } from './services/vector-migration.service';
import type { ProximitySearchRequest } from './dto/proximity-search.dto';

@Controller('addresses')
export class AddressesController {
  private readonly logger = new Logger(AddressesController.name);

  constructor(
    private readonly addressesService: AddressesService,
    private readonly proximitySearchService: ProximitySearchService,
    private readonly semanticSearchService: SemanticSearchService,
    private readonly vectorMigrationService: VectorMigrationService,
  ) {}

  @Get()
  public async findPaginated(
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    
    return this.addressesService.findPaginated(page, limit);
  }

  @Post('search/proximity')
  public async searchProximity(@Body() request: ProximitySearchRequest) {
    this.logger.log(`🔍 [CONTROLLER] === BÚSQUEDA DE PROXIMIDAD ===`);
    this.logger.log(`🔍 [CONTROLLER] Dirección: "${request.address}"`);
    this.logger.debug(`🔍 [CONTROLLER] Opciones: ${JSON.stringify(request.options)}`);
    
    const startTime = Date.now();
    
    // Usar búsqueda semántica si está configurada, sino fallback a la tradicional
    if (this.semanticSearchService.isConfigured()) {
      this.logger.log(`🧠 [CONTROLLER] Usando búsqueda SEMÁNTICA (APIs configuradas)`);
      try {
        const result = await this.semanticSearchService.searchNearbyAddresses(request);
        const processingTime = Date.now() - startTime;
        this.logger.log(`✅ [CONTROLLER] Búsqueda semántica completada en ${processingTime}ms - ${result.nearbyAddresses.length} resultados`);
        return result;
      } catch (error) {
        this.logger.error(`❌ [CONTROLLER] Error en búsqueda semántica: ${error.message}`);
        
        // Verificar si es un error que requiere fallback o si puede continuar con Pinecone
        if (error.message.includes('unable to connect') || error.message.includes('Failed query')) {
          this.logger.warn(`⚠️ [CONTROLLER] Error de BD detectado, pero búsqueda semántica puede continuar solo con Pinecone`);
          // No hacer throw aquí, la búsqueda semántica debe manejar esto internamente
        }
        
        this.logger.warn(`🔄 [CONTROLLER] Fallback a búsqueda tradicional...`);
        try {
          const result = await this.proximitySearchService.searchNearbyAddresses(request);
          const processingTime = Date.now() - startTime;
          this.logger.log(`✅ [CONTROLLER] Búsqueda tradicional (fallback) completada en ${processingTime}ms - ${result.nearbyAddresses.length} resultados`);
          return result;
        } catch (fallbackError) {
          this.logger.error(`❌ [CONTROLLER] Fallback también falló: ${fallbackError.message}`);
          throw new Error(`Tanto búsqueda semántica como tradicional fallaron: ${error.message} | ${fallbackError.message}`);
        }
      }
    } else {
      this.logger.log(`📊 [CONTROLLER] Usando búsqueda TRADICIONAL (APIs no configuradas)`);
      const result = await this.proximitySearchService.searchNearbyAddresses(request);
      const processingTime = Date.now() - startTime;
      this.logger.log(`✅ [CONTROLLER] Búsqueda tradicional completada en ${processingTime}ms - ${result.nearbyAddresses.length} resultados`);
      return result;
    }
  }

  @Post('search/semantic')
  public async searchSemantic(@Body() request: ProximitySearchRequest) {
    this.logger.log(`🧠 [CONTROLLER] === BÚSQUEDA SEMÁNTICA EXPLÍCITA ===`);
    this.logger.log(`🧠 [CONTROLLER] Dirección: "${request.address}"`);
    this.logger.debug(`🧠 [CONTROLLER] Opciones: ${JSON.stringify(request.options)}`);
    
    if (!this.semanticSearchService.isConfigured()) {
      this.logger.error(`❌ [CONTROLLER] Búsqueda semántica no configurada (falta PINECONE_API_KEY o REPLICATE_API_TOKEN)`);
      throw new Error('Búsqueda semántica no configurada. Verifica las variables de entorno.');
    }
    
    const startTime = Date.now();
    const result = await this.semanticSearchService.searchNearbyAddresses(request);
    const processingTime = Date.now() - startTime;
    this.logger.log(`✅ [CONTROLLER] Búsqueda semántica explícita completada en ${processingTime}ms - ${result.nearbyAddresses.length} resultados`);
    return result;
  }

  @Post('admin/migrate-vectors')
  public async migrateToVectors(@Body() options: MigrationOptions = {}) {
    this.logger.log(`🔄 [CONTROLLER] === MIGRACIÓN DE VECTORES ===`);
    this.logger.log(`🔄 [CONTROLLER] Opciones: ${JSON.stringify(options)}`);
    
    if (options.testMode) {
      this.logger.warn(`⚠️ [CONTROLLER] MODO TEST activado - solo procesará 100 registros`);
    } else {
      this.logger.warn(`🚨 [CONTROLLER] MIGRACIÓN COMPLETA - procesará TODAS las direcciones`);
    }
    
    const result = await this.vectorMigrationService.migrateAllAddressesToVectors(options);
    this.logger.log(`✅ [CONTROLLER] Migración completada: ${result.processed}/${result.total} direcciones procesadas`);
    return result;
  }

  @Get('admin/vector-stats')
  public async getVectorStats() {
    this.logger.log(`📊 [CONTROLLER] === ESTADÍSTICAS DE VECTORES ===`);
    const stats = await this.vectorMigrationService.getPostMigrationStats();
    
    if (stats) {
      this.logger.log(`📊 [CONTROLLER] Estadísticas obtenidas: ${JSON.stringify(stats, null, 2)}`);
    } else {
      this.logger.warn(`⚠️ [CONTROLLER] No se pudieron obtener estadísticas (índice no configurado?)`);
    }
    
    return stats;
  }

  @Post('admin/test-existing-vectors')
  public async testExistingVectors(@Body() request: { query: string; limit?: number }) {
    this.logger.log(`🧪 [CONTROLLER] === TEST CON VECTORES EXISTENTES ===`);
    this.logger.log(`🧪 [CONTROLLER] Query: "${request.query}"`);
    
    try {
      // Test directo con el servicio semántico usando datos existentes
      const testRequest = {
        address: request.query,
        options: {
          searchRadius: 10,
          page: 1,
          limit: request.limit || 5
        }
      };
      
      const result = await this.semanticSearchService.searchNearbyAddresses(testRequest);
      
      this.logger.log(`✅ [CONTROLLER] Test completado: ${result.nearbyAddresses.length} resultados encontrados`);
      
      // Log de los resultados para debug
      result.nearbyAddresses.forEach((item, index) => {
        this.logger.log(`🎯 [CONTROLLER] Resultado ${index + 1}: "${item.address.addressRaw}" (similarity: ${item.similarity.toFixed(4)})`);
      });
      
      return {
        success: true,
        query: request.query,
        results: result.nearbyAddresses.length,
        data: result
      };
      
    } catch (error) {
      this.logger.error(`❌ [CONTROLLER] Error en test: ${error.message}`);
      return {
        success: false,
        query: request.query,
        error: error.message
      };
    }
  }
}
