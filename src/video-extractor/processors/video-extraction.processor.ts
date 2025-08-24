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

      // 2. Realizar la extracción completa (iniciar + polling)
      this.logger.log(`🎬 [VIDEO_PROCESSOR] Iniciando extracción de thumbnails...`);
      
      const extractionResponse = await this.videoExtractorService.performCompleteExtraction({
        videoUrl: data.videoUrl,
        callbackUrl: data.callbackUrl,
        requestId: data.requestId,
        options: data.options,
        metadata: data.metadata,
      });

      await job.updateProgress(80);

      // 3. Preparar resultado para enviar al callback
      const processingTime = Date.now() - startTime;
      const result: VideoExtractionResult = {
        success: true,
        requestId: data.requestId,
        taskId: extractionResponse.task_id,
        thumbnails: extractionResponse.thumbnails || [],
        openaiFileIds: extractionResponse.openai_file_ids || [],
        totalThumbnails: extractionResponse.thumbnails?.length || 0,
        metadata: {
          ...data.metadata,
          taskId: extractionResponse.task_id,
          webhookDelivered: extractionResponse.webhook_delivered,
          jobId,
          extractionOptions: data.options,
        },
        processingTime,
        completedAt: new Date(),
      };

      await job.updateProgress(90);

      // 4. Enviar resultado al callback URL
      this.logger.log(`📡 [VIDEO_PROCESSOR] Enviando resultado a callback URL: ${data.callbackUrl}`);
      
      try {
        const callbackResponse = await firstValueFrom(
          this.httpService.post(data.callbackUrl, result, {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Video-Extractor-Service/1.0',
            },
            timeout: 30000, // 30 segundos timeout
          })
        );

        this.logger.log(`✅ [VIDEO_PROCESSOR] Callback enviado exitosamente - Status: ${callbackResponse.status}`);
        
      } catch (callbackError) {
        this.logger.error(`❌ [VIDEO_PROCESSOR] Error enviando callback: ${callbackError.message}`);
        
        // No lanzamos error aquí para que el job se marque como exitoso
        // pero registramos que hubo problema con el callback
        result.metadata = {
          ...result.metadata,
          callbackError: callbackError.message,
          callbackDelivered: false,
        };
      }

      await job.updateProgress(100);

      const totalProcessingTime = Date.now() - startTime;
      this.logger.log(`🎉 [VIDEO_PROCESSOR] === JOB COMPLETADO EXITOSAMENTE ===`);
      this.logger.log(`🎉 [VIDEO_PROCESSOR] Tiempo total: ${totalProcessingTime}ms`);
      this.logger.log(`🎉 [VIDEO_PROCESSOR] Thumbnails generados: ${result.thumbnails?.length || 0}`);
      this.logger.log(`🎉 [VIDEO_PROCESSOR] OpenAI File IDs: ${result.openaiFileIds?.length || 0}`);

      // Guardar el resultado en el job para consultas posteriores
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
