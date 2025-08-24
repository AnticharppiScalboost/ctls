import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Logger,
  HttpException,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { VideoQueueService } from './services/video-queue.service';
import { VideoExtractorService } from './services/video-extractor.service';
import type { 
  VideoExtractionRequestDto,
  EnqueueVideoExtractionResponseDto,
  VideoExtractionResultDto 
} from './dto/video-extractor.dto';

@Controller('video-extractor')
export class VideoExtractorController {
  private readonly logger = new Logger(VideoExtractorController.name);

  constructor(
    private readonly videoQueueService: VideoQueueService,
    private readonly videoExtractorService: VideoExtractorService,
  ) {
    this.logger.log('🔧 [VIDEO_CONTROLLER] Controlador inicializado');
  }

  /**
   * Encola una nueva petición de extracción de thumbnails
   */
  @Post('enqueue')
  async enqueueVideoExtraction(@Body() request: VideoExtractionRequestDto): Promise<EnqueueVideoExtractionResponseDto> {
    const startTime = Date.now();
    
    this.logger.log(`📥 [VIDEO_CONTROLLER] === NUEVA PETICIÓN DE EXTRACCIÓN ===`);
    this.logger.log(`📥 [VIDEO_CONTROLLER] Video URL: ${request.videoUrl}`);
    this.logger.log(`📥 [VIDEO_CONTROLLER] Callback URL: ${request.callbackUrl}`);
    this.logger.debug(`📥 [VIDEO_CONTROLLER] Request completo: ${JSON.stringify(request, null, 2)}`);

    try {
      // Verificar que el servicio esté configurado
      if (!this.videoExtractorService.isConfigured()) {
        throw new HttpException(
          'Video Extractor API no está configurada. Configura VIDEO_EXTRACTOR_API_URL en las variables de entorno.',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      // Encolar la petición
      const requestId = await this.videoQueueService.enqueueVideoExtraction(request);
      
      const processingTime = Date.now() - startTime;
      
      this.logger.log(`✅ [VIDEO_CONTROLLER] Petición encolada exitosamente en ${processingTime}ms`);
      this.logger.log(`📥 [VIDEO_CONTROLLER] Request ID asignado: ${requestId}`);

      const response: EnqueueVideoExtractionResponseDto = {
        success: true,
        requestId,
        message: 'Extracción de thumbnails encolada exitosamente. Recibirás el resultado en el callback URL especificado.',
      };

      return response;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ [VIDEO_CONTROLLER] Error encolando petición después de ${processingTime}ms: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Error encolando extracción de video: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtiene el estado de una petición de extracción
   */
  @Get('status/:requestId')
  async getExtractionStatus(@Param('requestId') requestId: string) {
    const startTime = Date.now();
    
    this.logger.log(`📊 [VIDEO_CONTROLLER] === CONSULTA DE ESTADO ===`);
    this.logger.log(`📊 [VIDEO_CONTROLLER] Request ID: ${requestId}`);

    try {
      const jobStatus = await this.videoQueueService.getJobStatus(requestId);
      
      if (!jobStatus) {
        throw new HttpException(
          `No se encontró la petición con ID: ${requestId}`,
          HttpStatus.NOT_FOUND
        );
      }

      const processingTime = Date.now() - startTime;
      
      this.logger.log(`✅ [VIDEO_CONTROLLER] Estado obtenido en ${processingTime}ms`);
      this.logger.log(`📊 [VIDEO_CONTROLLER] Estado: ${jobStatus.state}, Progreso: ${jobStatus.progress}%`);

      // Mapear el estado interno de Bull a un formato más amigable
      const status = this.mapJobStateToStatus(jobStatus.state);
      
      const response = {
        requestId,
        status,
        state: jobStatus.state,
        progress: jobStatus.progress || 0,
        processedOn: jobStatus.processedOn,
        finishedOn: jobStatus.finishedOn,
        data: jobStatus.data,
        result: jobStatus.returnvalue,
        error: jobStatus.failedReason,
      };

      return response;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ [VIDEO_CONTROLLER] Error consultando estado después de ${processingTime}ms: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Error consultando estado: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtiene estadísticas de la cola
   */
  @Get('queue/stats')
  async getQueueStats() {
    const startTime = Date.now();
    
    this.logger.log(`📈 [VIDEO_CONTROLLER] === ESTADÍSTICAS DE COLA ===`);

    try {
      const stats = await this.videoQueueService.getQueueStats();
      
      if (!stats) {
        throw new HttpException(
          'Error obteniendo estadísticas de la cola',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      const processingTime = Date.now() - startTime;
      
      this.logger.log(`✅ [VIDEO_CONTROLLER] Estadísticas obtenidas en ${processingTime}ms`);
      this.logger.log(`📈 [VIDEO_CONTROLLER] Cola - Activos: ${stats.active}, En espera: ${stats.waiting}, Completados: ${stats.completed}, Fallidos: ${stats.failed}`);

      return {
        ...stats,
        processingTime,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ [VIDEO_CONTROLLER] Error obteniendo estadísticas después de ${processingTime}ms: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Error obteniendo estadísticas: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Verifica el estado de salud del servicio
   */
  @Get('health')
  async checkHealth() {
    const startTime = Date.now();
    
    this.logger.log(`🔍 [VIDEO_CONTROLLER] === HEALTH CHECK ===`);

    try {
      const isConfigured = this.videoExtractorService.isConfigured();
      const apiHealthy = isConfigured ? await this.videoExtractorService.checkApiHealth() : false;
      const queueStats = await this.videoQueueService.getQueueStats();
      
      const processingTime = Date.now() - startTime;
      
      const status = isConfigured && apiHealthy ? 'healthy' : 'degraded';
      
      this.logger.log(`✅ [VIDEO_CONTROLLER] Health check completado en ${processingTime}ms`);
      this.logger.log(`🔍 [VIDEO_CONTROLLER] Estado: ${status}, Configurado: ${isConfigured}, API: ${apiHealthy}`);

      return {
        status,
        videoExtractor: {
          configured: isConfigured,
          apiHealthy,
        },
        queue: queueStats,
        timestamp: new Date().toISOString(),
        processingTime,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ [VIDEO_CONTROLLER] Error en health check después de ${processingTime}ms: ${error.message}`);
      
      return {
        status: 'error',
        videoExtractor: {
          configured: false,
          apiHealthy: false,
        },
        queue: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        processingTime,
      };
    }
  }

  /**
   * Endpoint para recibir resultados de extracción (callback endpoint de ejemplo)
   * Este endpoint puede ser usado para pruebas locales
   */
  @Post('callback/test')
  async receiveExtractionResult(@Body() result: VideoExtractionResultDto) {
    const startTime = Date.now();
    
    this.logger.log(`📨 [VIDEO_CONTROLLER] === CALLBACK RECIBIDO ===`);
    this.logger.log(`📨 [VIDEO_CONTROLLER] Request ID: ${result.requestId}`);
    this.logger.log(`📨 [VIDEO_CONTROLLER] Success: ${result.success}`);
    
    if (result.success) {
      this.logger.log(`📨 [VIDEO_CONTROLLER] Thumbnails: ${result.thumbnails?.length || 0}`);
      this.logger.log(`📨 [VIDEO_CONTROLLER] OpenAI File IDs: ${result.openaiFileIds?.length || 0}`);
      this.logger.log(`📨 [VIDEO_CONTROLLER] Task ID: ${result.taskId}`);
      this.logger.log(`📨 [VIDEO_CONTROLLER] Total thumbnails: ${result.totalThumbnails}`);
      this.logger.log(`📨 [VIDEO_CONTROLLER] Processing time: ${result.processingTime}ms`);
    } else {
      this.logger.error(`📨 [VIDEO_CONTROLLER] Error: ${result.error}`);
    }

    const processingTime = Date.now() - startTime;
    
    this.logger.log(`✅ [VIDEO_CONTROLLER] Callback procesado en ${processingTime}ms`);

    return {
      received: true,
      requestId: result.requestId,
      timestamp: new Date().toISOString(),
      processingTime,
    };
  }

  /**
   * Mapea el estado interno de Bull a un estado más amigable
   */
  private mapJobStateToStatus(state: string): string {
    switch (state) {
      case 'waiting':
        return 'pending';
      case 'active':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'error';
      case 'delayed':
        return 'delayed';
      case 'paused':
        return 'paused';
      default:
        return 'unknown';
    }
  }
}
