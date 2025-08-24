import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import type { 
  VideoExtractionRequest, 
  VideoExtractionJob,
  VideoExtractionJobData
} from '../types/video-extractor.types';
import { 
  VIDEO_EXTRACTOR_QUEUE, 
  VIDEO_EXTRACTOR_JOBS, 
  QUEUE_OPTIONS,
  FPS_LIMITS,
  DIMENSION_LIMITS,
  THUMBNAIL_LIMITS
} from '../constants/video-extractor.constants';

@Injectable()
export class VideoQueueService {
  private readonly logger = new Logger(VideoQueueService.name);

  constructor(
    @InjectQueue(VIDEO_EXTRACTOR_QUEUE) 
    private readonly videoQueue: Queue<VideoExtractionJobData>
  ) {
    this.logger.log('🔧 [VIDEO_QUEUE] Servicio de cola inicializado');
  }

  /**
   * Encola una nueva petición de extracción de thumbnails
   */
  async enqueueVideoExtraction(request: VideoExtractionRequest): Promise<string> {
    const startTime = Date.now();
    const requestId = request.requestId || uuidv4();
    
    this.logger.log(`📤 [VIDEO_QUEUE] === ENCOLANDO EXTRACCIÓN ===`);
    this.logger.log(`📤 [VIDEO_QUEUE] Request ID: ${requestId}`);
    this.logger.log(`📤 [VIDEO_QUEUE] Video URL: ${request.videoUrl}`);
    this.logger.log(`📤 [VIDEO_QUEUE] Callback URL: ${request.callbackUrl}`);

    try {
      // Validar la petición
      this.validateRequest(request);

      // Normalizar opciones con valores por defecto
      const normalizedOptions = this.normalizeOptions(request.options || {});

      // Preparar los datos del job
      const jobData: VideoExtractionJob = {
        id: requestId,
        videoUrl: request.videoUrl,
        callbackUrl: request.callbackUrl,
        requestId,
        options: normalizedOptions,
        metadata: request.metadata,
        createdAt: new Date(),
      };

      // Encolar el job
      const job = await this.videoQueue.add(
        VIDEO_EXTRACTOR_JOBS.EXTRACT_THUMBNAILS,
        jobData,
        {
          jobId: requestId, // Usar requestId como jobId para fácil tracking
          ...QUEUE_OPTIONS,
          delay: 0, // Ejecutar inmediatamente
        }
      );

      const processingTime = Date.now() - startTime;
      
      this.logger.log(`✅ [VIDEO_QUEUE] Job encolado exitosamente en ${processingTime}ms`);
      this.logger.log(`📤 [VIDEO_QUEUE] Job ID: ${job.id}`);
      this.logger.log(`🎬 [VIDEO_QUEUE] Opciones: FPS=${normalizedOptions.fps}, Tamaño=${normalizedOptions.width}x${normalizedOptions.height}, Formato=${normalizedOptions.format}`);

      // Log del estado de la cola
      const waiting = await this.videoQueue.getWaiting();
      const active = await this.videoQueue.getActive();
      this.logger.debug(`📊 [VIDEO_QUEUE] Estado cola - En espera: ${waiting.length}, Activos: ${active.length}`);

      return requestId;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ [VIDEO_QUEUE] Error encolando después de ${processingTime}ms: ${error.message}`);
      throw new Error(`Error encolando extracción de video: ${error.message}`);
    }
  }



  /**
   * Valida una petición de extracción
   */
  private validateRequest(request: VideoExtractionRequest): void {
    if (!request.videoUrl) {
      throw new Error('Video URL es requerida');
    }

    if (!request.callbackUrl) {
      throw new Error('Callback URL es requerida');
    }

    // Validar formato de URLs
    try {
      new URL(request.videoUrl);
    } catch {
      throw new Error('Video URL no tiene un formato válido');
    }

    try {
      new URL(request.callbackUrl);
    } catch {
      throw new Error('Callback URL no tiene un formato válido');
    }

    // Validar opciones si están presentes
    if (request.options) {
      this.validateOptions(request.options);
    }

    this.logger.debug(`✅ [VIDEO_QUEUE] Petición validada correctamente`);
  }

  /**
   * Valida las opciones de extracción
   */
  private validateOptions(options: any): void {
    if (options.fps !== undefined) {
      if (typeof options.fps !== 'number' || options.fps < FPS_LIMITS.MIN || options.fps > FPS_LIMITS.MAX) {
        throw new Error(`FPS debe estar entre ${FPS_LIMITS.MIN} y ${FPS_LIMITS.MAX}`);
      }
    }

    if (options.width !== undefined) {
      if (typeof options.width !== 'number' || options.width < DIMENSION_LIMITS.WIDTH.MIN || options.width > DIMENSION_LIMITS.WIDTH.MAX) {
        throw new Error(`Ancho debe estar entre ${DIMENSION_LIMITS.WIDTH.MIN} y ${DIMENSION_LIMITS.WIDTH.MAX}`);
      }
    }

    if (options.height !== undefined) {
      if (typeof options.height !== 'number' || options.height < DIMENSION_LIMITS.HEIGHT.MIN || options.height > DIMENSION_LIMITS.HEIGHT.MAX) {
        throw new Error(`Alto debe estar entre ${DIMENSION_LIMITS.HEIGHT.MIN} y ${DIMENSION_LIMITS.HEIGHT.MAX}`);
      }
    }

    if (options.format !== undefined) {
      const validFormats = ['jpg', 'jpeg', 'png', 'webp'];
      if (!validFormats.includes(options.format)) {
        throw new Error(`Formato debe ser uno de: ${validFormats.join(', ')}`);
      }
    }

    if (options.maxThumbnails !== undefined) {
      if (typeof options.maxThumbnails !== 'number' || options.maxThumbnails < THUMBNAIL_LIMITS.MIN || options.maxThumbnails > THUMBNAIL_LIMITS.MAX) {
        throw new Error(`maxThumbnails debe estar entre ${THUMBNAIL_LIMITS.MIN} y ${THUMBNAIL_LIMITS.MAX}`);
      }
    }
  }

  /**
   * Normaliza las opciones aplicando valores por defecto
   */
  private normalizeOptions(options: any) {
    return {
      fps: options.fps || FPS_LIMITS.DEFAULT,
      width: options.width || DIMENSION_LIMITS.WIDTH.DEFAULT,
      height: options.height || DIMENSION_LIMITS.HEIGHT.DEFAULT,
      format: options.format || 'jpg',
      maxThumbnails: options.maxThumbnails || THUMBNAIL_LIMITS.DEFAULT,
    };
  }
}
