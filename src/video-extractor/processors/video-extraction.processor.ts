import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { VideoExtractorService } from '../services/video-extractor.service';
import type { 
  VideoExtractionJob, 
  VideoExtractionResult 
} from '../types/video-extractor.types';
import { 
  VIDEO_EXTRACTOR_QUEUE, 
  VIDEO_EXTRACTOR_JOBS 
} from '../constants/video-extractor.constants';

@Processor(VIDEO_EXTRACTOR_QUEUE)
export class VideoExtractionProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoExtractionProcessor.name);

  constructor(
    private readonly videoExtractorService: VideoExtractorService,
    private readonly httpService: HttpService,
  ) {
    super();
    this.logger.log('🔧 [VIDEO_PROCESSOR] Procesador inicializado');
  }

  async process(job: Job<VideoExtractionJob>): Promise<void> {
    const { id: jobId, data } = job;
    const startTime = Date.now();

    this.logger.log(`🚀 [VIDEO_PROCESSOR] === PROCESANDO JOB ===`);
    this.logger.log(`🚀 [VIDEO_PROCESSOR] Job ID: ${jobId}`);
    this.logger.log(`🚀 [VIDEO_PROCESSOR] Request ID: ${data.requestId}`);
    this.logger.log(`🚀 [VIDEO_PROCESSOR] Video URL: ${data.videoUrl}`);
    this.logger.log(`🚀 [VIDEO_PROCESSOR] Callback URL: ${data.callbackUrl}`);
    this.logger.log(`🎬 [VIDEO_PROCESSOR] Opciones: FPS=${data.options.fps}, Tamaño=${data.options.width}x${data.options.height}, Formato=${data.options.format}`);

    try {
      // Actualizar progreso del job
      await job.updateProgress(10);

      // 1. Verificar que el servicio esté configurado
      if (!this.videoExtractorService.isConfigured()) {
        throw new Error('Video Extractor no está configurado');
      }

      await job.updateProgress(20);

      // 2. Iniciar la extracción (la API externa manejará el callback directamente)
      this.logger.log(`🎬 [VIDEO_PROCESSOR] Iniciando extracción de thumbnails...`);
      
      const taskId = await this.videoExtractorService.startThumbnailExtraction({
        videoUrl: data.videoUrl,
        callbackUrl: data.callbackUrl,
        requestId: data.requestId,
        options: data.options,
        metadata: data.metadata,
      });

      await job.updateProgress(50);

      // 3. Marcar como enviado - la API externa manejará el resto
      const processingTime = Date.now() - startTime;
      const result = {
        success: true,
        requestId: data.requestId,
        taskId,
        status: 'submitted',
        message: 'Extracción iniciada en API externa. El resultado llegará vía webhook.',
        metadata: {
          ...data.metadata,
          taskId,
          jobId,
          extractionOptions: data.options,
          submittedAt: new Date().toISOString(),
        },
        processingTime,
        completedAt: new Date(),
      };

      await job.updateProgress(100);

      const totalProcessingTime = Date.now() - startTime;
      this.logger.log(`🎉 [VIDEO_PROCESSOR] === EXTRACCIÓN INICIADA EXITOSAMENTE ===`);
      this.logger.log(`🎉 [VIDEO_PROCESSOR] Tiempo de envío: ${totalProcessingTime}ms`);
      this.logger.log(`🎉 [VIDEO_PROCESSOR] Task ID: ${taskId}`);
      this.logger.log(`🔔 [VIDEO_PROCESSOR] La API externa enviará el resultado a: ${data.callbackUrl}`);

      // Guardar el estado inicial en el job para consultas posteriores
      return result as any;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ [VIDEO_PROCESSOR] === JOB FALLÓ ===`);
      this.logger.error(`❌ [VIDEO_PROCESSOR] Job ID: ${jobId}`);
      this.logger.error(`❌ [VIDEO_PROCESSOR] Request ID: ${data.requestId}`);
      this.logger.error(`❌ [VIDEO_PROCESSOR] Error después de ${processingTime}ms: ${error.message}`);

      // Preparar resultado de error para enviar al callback
      const errorResult: VideoExtractionResult = {
        success: false,
        requestId: data.requestId,
        error: error.message,
        metadata: {
          ...data.metadata,
          jobId,
          extractionOptions: data.options,
          errorAt: new Date().toISOString(),
        },
        processingTime,
        completedAt: new Date(),
      };

      // Intentar enviar error al callback
      try {
        this.logger.log(`📡 [VIDEO_PROCESSOR] Enviando error a callback URL: ${data.callbackUrl}`);
        
        await firstValueFrom(
          this.httpService.post(data.callbackUrl, errorResult, {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Video-Extractor-Service/1.0',
            },
            timeout: 30000,
          })
        );

        this.logger.log(`✅ [VIDEO_PROCESSOR] Error callback enviado exitosamente`);
        
      } catch (callbackError) {
        this.logger.error(`❌ [VIDEO_PROCESSOR] Error enviando error callback: ${callbackError.message}`);
      }

      // Re-lanzar el error para que BullMQ lo maneje
      throw error;
    }
  }

  /**
   * Maneja errores del procesador
   */
  async onFailed(job: Job<VideoExtractionJob>, error: Error): Promise<void> {
    this.logger.error(`💥 [VIDEO_PROCESSOR] === JOB FALLÓ DEFINITIVAMENTE ===`);
    this.logger.error(`💥 [VIDEO_PROCESSOR] Job ID: ${job.id}`);
    this.logger.error(`💥 [VIDEO_PROCESSOR] Request ID: ${job.data.requestId}`);
    this.logger.error(`💥 [VIDEO_PROCESSOR] Intentos: ${job.attemptsMade}/${job.opts.attempts}`);
    this.logger.error(`💥 [VIDEO_PROCESSOR] Error final: ${error.message}`);
    
    // Aquí podrías agregar lógica adicional como:
    // - Notificar a un sistema de monitoring
    // - Limpiar recursos
    // - Enviar notificación de falla crítica
  }

  /**
   * Se ejecuta cuando un job se completa exitosamente
   */
  async onCompleted(job: Job<VideoExtractionJob>, result: any): Promise<void> {
    this.logger.log(`🎊 [VIDEO_PROCESSOR] === JOB COMPLETADO ===`);
    this.logger.log(`🎊 [VIDEO_PROCESSOR] Job ID: ${job.id}`);
    this.logger.log(`🎊 [VIDEO_PROCESSOR] Request ID: ${job.data.requestId}`);
    this.logger.log(`🎊 [VIDEO_PROCESSOR] Duración: ${job.finishedOn! - job.processedOn!}ms`);
    
    if (result?.thumbnails) {
      this.logger.log(`🎊 [VIDEO_PROCESSOR] Thumbnails: ${result.thumbnails.length}`);
    }
  }

  /**
   * Se ejecuta cuando un job está siendo procesado
   */
  async onProgress(job: Job<VideoExtractionJob>, progress: number): Promise<void> {
    this.logger.debug(`📈 [VIDEO_PROCESSOR] Job ${job.id} - Progreso: ${progress}%`);
  }
}
