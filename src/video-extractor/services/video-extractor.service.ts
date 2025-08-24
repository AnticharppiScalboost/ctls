import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { 
  VideoExtractionRequest,
  ThumbnailExtractionApiRequest,
  ThumbnailExtractionApiResponse,
  ThumbnailExtractionStatus
} from '../types/video-extractor.types';
import { 
  API_ENDPOINTS,
  FPS_LIMITS,
  DIMENSION_LIMITS
} from '../constants/video-extractor.constants';

@Injectable()
export class VideoExtractorService {
  private readonly logger = new Logger(VideoExtractorService.name);
  private readonly apiUrl: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get<string>('videoExtractor.apiUrl');

    if (!this.apiUrl) {
      this.logger.warn('⚠️ [VIDEO_EXTRACTOR] VIDEO_EXTRACTOR_API_URL no configurada - el servicio no estará disponible');
    } else {
      this.logger.log('✅ [VIDEO_EXTRACTOR] Servicio inicializado correctamente');
      this.logger.log(`🔗 [VIDEO_EXTRACTOR] API URL: ${this.apiUrl}`);
    }
  }

  /**
   * Verifica si el servicio está configurado y disponible
   */
  isConfigured(): boolean {
    return !!this.apiUrl;
  }

  /**
   * Inicia la extracción de thumbnails enviando petición a la API externa
   */
  async startThumbnailExtraction(request: VideoExtractionRequest): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Video Extractor API URL no está configurada');
    }

    const startTime = Date.now();
    this.logger.log(`🎬 [VIDEO_EXTRACTOR] === INICIANDO EXTRACCIÓN DE THUMBNAILS ===`);
    this.logger.log(`🎬 [VIDEO_EXTRACTOR] Video URL: ${request.videoUrl}`);
    this.logger.log(`🎬 [VIDEO_EXTRACTOR] Callback URL: ${request.callbackUrl}`);
    
    try {
      const payload: ThumbnailExtractionApiRequest = {
        video_url: request.videoUrl,
        fps: request.options?.fps || FPS_LIMITS.DEFAULT,
        width: request.options?.width || DIMENSION_LIMITS.WIDTH.DEFAULT,
        height: request.options?.height || DIMENSION_LIMITS.HEIGHT.DEFAULT,
        format: request.options?.format || 'jpg',
        webhook_url: request.callbackUrl,
      };

      this.logger.debug(`🎬 [VIDEO_EXTRACTOR] Payload: ${JSON.stringify(payload, null, 2)}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}${API_ENDPOINTS.EXTRACT_THUMBNAILS}`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 segundos timeout
          }
        )
      );

      const data: ThumbnailExtractionApiResponse = response.data;
      const taskId = data.task_id;
      const processingTime = Date.now() - startTime;
      
      this.logger.log(`✅ [VIDEO_EXTRACTOR] Extracción iniciada exitosamente en ${processingTime}ms`);
      this.logger.log(`🎬 [VIDEO_EXTRACTOR] Task ID: ${taskId}`);
      this.logger.log(`📊 [VIDEO_EXTRACTOR] Duración estimada: ${data.duration}s, Thumbnails estimados: ${data.total_thumbnails}`);
      
      return taskId;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ [VIDEO_EXTRACTOR] Error iniciando extracción después de ${processingTime}ms: ${error.message}`);
      
      if (error.response?.data) {
        this.logger.error(`❌ [VIDEO_EXTRACTOR] Detalles del error: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      
      throw new Error(`Error iniciando extracción de thumbnails: ${error.message}`);
    }
  }


}
