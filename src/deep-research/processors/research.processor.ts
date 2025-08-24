import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Job } from 'bullmq';
import { firstValueFrom } from 'rxjs';
import { PerplexityService } from '../services/perplexity.service';
import {
  DEEP_RESEARCH_QUEUE,
  DEEP_RESEARCH_JOBS,
} from '../constants/queue.constants';
import type { DeepResearchJob, ResearchResult } from '../types/research.types';

@Processor(DEEP_RESEARCH_QUEUE)
export class ResearchProcessor extends WorkerHost {
  private readonly logger = new Logger(ResearchProcessor.name);

  constructor(
    private readonly perplexityService: PerplexityService,
    private readonly httpService: HttpService,
  ) {
    super();
    this.logger.log('🔧 [RESEARCH_PROCESSOR] Procesador inicializado');
  }

  async process(job: Job<DeepResearchJob>): Promise<void> {
    const { id: jobId, data } = job;
    const startTime = Date.now();

    this.logger.log(`🚀 [RESEARCH_PROCESSOR] === PROCESANDO JOB ===`);
    this.logger.log(`🚀 [RESEARCH_PROCESSOR] Job ID: ${jobId}`);
    this.logger.log(`🚀 [RESEARCH_PROCESSOR] Request ID: ${data.requestId}`);
    this.logger.log(
      `🚀 [RESEARCH_PROCESSOR] Prompt: "${data.prompt.substring(0, 100)}..."`,
    );
    this.logger.log(
      `🚀 [RESEARCH_PROCESSOR] Callback URL: ${data.callbackUrl}`,
    );

    try {
      // Actualizar progreso del job
      await job.updateProgress(10);

      // 1. Verificar que Perplexity esté configurado
      if (!this.perplexityService.isConfigured()) {
        throw new Error('Perplexity no está configurado');
      }

      await job.updateProgress(20);

      // 2. Realizar la investigación completa (iniciar + polling)
      this.logger.log(
        `🔍 [RESEARCH_PROCESSOR] Iniciando investigación en Perplexity...`,
      );

      const perplexityResponse =
        await this.perplexityService.performCompleteResearch({
          prompt: data.prompt,
          callbackUrl: data.callbackUrl,
          requestId: data.requestId,
          metadata: data.metadata,
          options: data.options,
        });

      await job.updateProgress(80);

      // 3. Preparar resultado para enviar al callback
      const processingTime = Date.now() - startTime;
      const result: ResearchResult = {
        success: true,
        requestId: data.requestId,
        content: perplexityResponse.response?.choices?.[0]?.message?.content,
        usage: perplexityResponse.response?.usage,
        metadata: {
          ...data.metadata,
          perplexityId: perplexityResponse.id,
          model: perplexityResponse.model,
          jobId,
        },
        processingTime,
        completedAt: new Date(),
      };

      await job.updateProgress(90);

      // 4. Enviar resultado al callback URL
      this.logger.log(
        `📡 [RESEARCH_PROCESSOR] Enviando resultado a callback: ${data.callbackUrl}`,
      );

      await this.sendResultToCallback(data.callbackUrl, result);

      await job.updateProgress(100);

      this.logger.log(
        `✅ [RESEARCH_PROCESSOR] Job completado exitosamente en ${processingTime}ms`,
      );
      this.logger.log(
        `📊 [RESEARCH_PROCESSOR] Tokens usados: ${result.usage?.total_tokens || 0}`,
      );
      this.logger.log(
        `📝 [RESEARCH_PROCESSOR] Contenido generado: ${result.content?.length || 0} caracteres`,
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `❌ [RESEARCH_PROCESSOR] Error procesando job después de ${processingTime}ms: ${error.message}`,
      );

      // Preparar resultado de error
      const errorResult: ResearchResult = {
        success: false,
        requestId: data.requestId,
        error: error.message,
        metadata: {
          ...data.metadata,
          jobId,
          errorType: error.constructor.name,
        },
        processingTime,
        completedAt: new Date(),
      };

      try {
        // Intentar enviar el error al callback
        await this.sendResultToCallback(data.callbackUrl, errorResult);
        this.logger.log(`📡 [RESEARCH_PROCESSOR] Error enviado al callback`);
      } catch (callbackError) {
        this.logger.error(
          `❌ [RESEARCH_PROCESSOR] Error enviando callback: ${callbackError.message}`,
        );
      }

      // Re-lanzar el error para que BullMQ lo registre
      throw error;
    }
  }

  /**
   * Envía el resultado al callback URL especificado
   */
  private async sendResultToCallback(
    callbackUrl: string,
    result: ResearchResult,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.debug(
        `📡 [RESEARCH_PROCESSOR] Enviando POST a: ${callbackUrl}`,
      );
      this.logger.debug(
        `📡 [RESEARCH_PROCESSOR] Payload: ${JSON.stringify(result, null, 2)}`,
      );

      const response = await firstValueFrom(
        this.httpService.post(callbackUrl, result, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'CTLS-DeepResearch/1.0',
          },
          timeout: 30000, // 30 segundos timeout
        }),
      );

      const processingTime = Date.now() - startTime;

      this.logger.log(
        `✅ [RESEARCH_PROCESSOR] Callback enviado exitosamente en ${processingTime}ms`,
      );
      this.logger.log(`📡 [RESEARCH_PROCESSOR] Status: ${response.status}`);

      if (response.data) {
        this.logger.debug(
          `📡 [RESEARCH_PROCESSOR] Respuesta callback: ${JSON.stringify(response.data, null, 2)}`,
        );
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `❌ [RESEARCH_PROCESSOR] Error enviando callback después de ${processingTime}ms: ${error.message}`,
      );

      if (error.response?.status) {
        this.logger.error(
          `❌ [RESEARCH_PROCESSOR] Status HTTP: ${error.response.status}`,
        );
      }

      if (error.response?.data) {
        this.logger.error(
          `❌ [RESEARCH_PROCESSOR] Respuesta de error: ${JSON.stringify(error.response.data, null, 2)}`,
        );
      }

      throw new Error(`Error enviando callback: ${error.message}`);
    }
  }
}
