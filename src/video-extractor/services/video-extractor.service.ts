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
  DIMENSION_LIMITS,
  THUMBNAIL_LIMITS,
  POLLING_CONFIG
} from '../constants/video-extractor.constants';

@Injectable()
export class VideoExtractorService {
  private readonly logger = new Logger(VideoExtractorService.name);
  private readonly apiUrl: string | undefined;
  private readonly pollingInterval: number;
  private readonly maxPollingAttempts: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get<string>('videoExtractor.apiUrl');
    this.pollingInterval = this.configService.get<number>('videoExtractor.pollingInterval') || POLLING_CONFIG.INTERVAL;
    this.maxPollingAttempts = this.configService.get<number>('videoExtractor.maxPollingAttempts') || POLLING_CONFIG.MAX_ATTEMPTS;

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
        max_thumbnails: request.options?.maxThumbnails || THUMBNAIL_LIMITS.DEFAULT,
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

  /**
   * Realiza polling del estado de extracción hasta completarse
   */
  async pollExtractionStatus(taskId: string): Promise<ThumbnailExtractionStatus> {
    if (!this.isConfigured()) {
      throw new Error('Video Extractor API URL no está configurada');
    }

    const startTime = Date.now();
    this.logger.log(`⏰ [VIDEO_EXTRACTOR] === INICIANDO POLLING ===`);
    this.logger.log(`⏰ [VIDEO_EXTRACTOR] Task ID: ${taskId}`);
    this.logger.log(`⏰ [VIDEO_EXTRACTOR] Intervalo: ${this.pollingInterval}ms, Máximo intentos: ${this.maxPollingAttempts}`);

    let attempts = 0;

    while (attempts < this.maxPollingAttempts) {
      attempts++;
      
      try {
        this.logger.debug(`⏰ [VIDEO_EXTRACTOR] Intento ${attempts}/${this.maxPollingAttempts}...`);

        const response = await firstValueFrom(
          this.httpService.get(
            `${this.apiUrl}${API_ENDPOINTS.STATUS}/${taskId}`,
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 10000, // 10 segundos timeout para polling
            }
          )
        );

        const data: ThumbnailExtractionStatus = response.data;
        this.logger.debug(`⏰ [VIDEO_EXTRACTOR] Estado actual: ${data.status} - Progreso: ${data.progress}%`);

        if (data.status === 'completed') {
          const processingTime = Date.now() - startTime;
          this.logger.log(`✅ [VIDEO_EXTRACTOR] Extracción completada en ${processingTime}ms después de ${attempts} intentos`);
          
          if (data.thumbnails && data.thumbnails.length > 0) {
            this.logger.log(`🖼️ [VIDEO_EXTRACTOR] Thumbnails generados: ${data.thumbnails.length}`);
            this.logger.debug(`🖼️ [VIDEO_EXTRACTOR] Lista: ${data.thumbnails.join(', ')}`);
          }
          
          if (data.openai_file_ids && data.openai_file_ids.length > 0) {
            this.logger.log(`☁️ [VIDEO_EXTRACTOR] OpenAI File IDs: ${data.openai_file_ids.length}`);
            this.logger.debug(`☁️ [VIDEO_EXTRACTOR] IDs: ${data.openai_file_ids.join(', ')}`);
          }

          if (data.webhook_delivered) {
            this.logger.log(`🔔 [VIDEO_EXTRACTOR] Webhook entregado exitosamente`);
          }
          
          return data;
        }

        if (data.status === 'error') {
          const processingTime = Date.now() - startTime;
          this.logger.error(`❌ [VIDEO_EXTRACTOR] Extracción falló después de ${processingTime}ms en intento ${attempts}`);
          
          if (data.error) {
            this.logger.error(`❌ [VIDEO_EXTRACTOR] Error: ${data.error}`);
          }
          
          throw new Error(`Extracción falló: ${data.error || data.message || 'Error desconocido'}`);
        }

        // Status es pending o processing, continuar polling
        this.logger.debug(`⏰ [VIDEO_EXTRACTOR] Estado: ${data.status}, progreso: ${data.progress}%, esperando ${this.pollingInterval}ms...`);
        await this.sleep(this.pollingInterval);

      } catch (error) {
        if (error.message.includes('Extracción falló')) {
          throw error; // Re-lanzar errores de falla conocidos
        }

        const processingTime = Date.now() - startTime;
        this.logger.error(`❌ [VIDEO_EXTRACTOR] Error en polling después de ${processingTime}ms, intento ${attempts}: ${error.message}`);
        
        // Si es el último intento, lanzar error
        if (attempts >= this.maxPollingAttempts) {
          throw new Error(`Timeout después de ${attempts} intentos: ${error.message}`);
        }
        
        // Esperar antes del siguiente intento
        await this.sleep(this.pollingInterval);
      }
    }

    const processingTime = Date.now() - startTime;
    this.logger.error(`⏰ [VIDEO_EXTRACTOR] Timeout después de ${processingTime}ms y ${attempts} intentos`);
    throw new Error(`Timeout: La extracción no se completó después de ${attempts} intentos (${processingTime}ms)`);
  }

  /**
   * Utilidad para pausar ejecución
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Método de conveniencia para extracción completa (iniciar + polling)
   */
  async performCompleteExtraction(request: VideoExtractionRequest): Promise<ThumbnailExtractionStatus> {
    this.logger.log(`🚀 [VIDEO_EXTRACTOR] === EXTRACCIÓN COMPLETA ===`);
    this.logger.log(`🚀 [VIDEO_EXTRACTOR] Video: ${request.videoUrl}`);
    
    const taskId = await this.startThumbnailExtraction(request);
    const result = await this.pollExtractionStatus(taskId);
    
    this.logger.log(`🎉 [VIDEO_EXTRACTOR] === EXTRACCIÓN COMPLETADA ===`);
    return result;
  }

  /**
   * Verifica el estado de salud de la API externa
   */
  async checkApiHealth(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiUrl}${API_ENDPOINTS.HEALTH}`,
          {
            timeout: 5000, // 5 segundos timeout para health check
          }
        )
      );

      return response.status === 200;
    } catch (error) {
      this.logger.warn(`⚠️ [VIDEO_EXTRACTOR] Health check falló: ${error.message}`);
      return false;
    }
  }
}
