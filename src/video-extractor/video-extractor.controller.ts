import { 
  Controller, 
  Post, 
  Body, 
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { VideoQueueService } from './services/video-queue.service';
import { VideoExtractorService } from './services/video-extractor.service';
import type { 
  VideoExtractionRequestDto,
  EnqueueVideoExtractionResponseDto
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
        message: 'Extracción de thumbnails encolada exitosamente.',
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
}
