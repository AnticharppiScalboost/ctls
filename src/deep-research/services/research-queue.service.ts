import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { 
  DEEP_RESEARCH_QUEUE, 
  DEEP_RESEARCH_JOBS, 
  QUEUE_OPTIONS 
} from '../constants/queue.constants';
import type { DeepResearchRequest, DeepResearchJob } from '../types/research.types';

@Injectable()
export class ResearchQueueService {
  private readonly logger = new Logger(ResearchQueueService.name);

  constructor(
    @InjectQueue(DEEP_RESEARCH_QUEUE) 
    private readonly researchQueue: Queue<DeepResearchJob>
  ) {
    this.logger.log('🔧 [RESEARCH_QUEUE] Servicio de cola inicializado');
  }

  /**
   * Encola una nueva petición de investigación profunda
   */
  async enqueueResearch(request: DeepResearchRequest): Promise<string> {
    const startTime = Date.now();
    const requestId = request.requestId || uuidv4();
    
    this.logger.log(`📤 [RESEARCH_QUEUE] === ENCOLANDO INVESTIGACIÓN ===`);
    this.logger.log(`📤 [RESEARCH_QUEUE] Request ID: ${requestId}`);
    this.logger.log(`📤 [RESEARCH_QUEUE] Prompt: "${request.prompt.substring(0, 100)}..."`);
    this.logger.log(`📤 [RESEARCH_QUEUE] Callback URL: ${request.callbackUrl}`);

    try {
      // Validar la petición
      this.validateRequest(request);

      // Preparar los datos del job
      const jobData: DeepResearchJob = {
        id: requestId,
        prompt: request.prompt,
        callbackUrl: request.callbackUrl,
        requestId,
        metadata: request.metadata,
        options: request.options,
        createdAt: new Date(),
      };

      // Encolar el job
      const job = await this.researchQueue.add(
        DEEP_RESEARCH_JOBS.PERPLEXITY_RESEARCH,
        jobData,
        {
          jobId: requestId, // Usar requestId como jobId para fácil tracking
          ...QUEUE_OPTIONS,
          delay: 0, // Ejecutar inmediatamente
        }
      );

      const processingTime = Date.now() - startTime;
      
      this.logger.log(`✅ [RESEARCH_QUEUE] Job encolado exitosamente en ${processingTime}ms`);
      this.logger.log(`📤 [RESEARCH_QUEUE] Job ID: ${job.id}`);

      // Log del estado de la cola
      const waiting = await this.researchQueue.getWaiting();
      const active = await this.researchQueue.getActive();
      this.logger.debug(`📊 [RESEARCH_QUEUE] Estado cola - En espera: ${waiting.length}, Activos: ${active.length}`);

      return requestId;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ [RESEARCH_QUEUE] Error encolando después de ${processingTime}ms: ${error.message}`);
      throw new Error(`Error encolando investigación: ${error.message}`);
    }
  }



  /**
   * Valida una petición de investigación
   */
  private validateRequest(request: DeepResearchRequest): void {
    if (!request.prompt || typeof request.prompt !== 'string' || request.prompt.trim().length === 0) {
      throw new Error('El prompt es requerido y debe ser un string no vacío');
    }

    if (!request.callbackUrl || typeof request.callbackUrl !== 'string') {
      throw new Error('El callbackUrl es requerido y debe ser un string válido');
    }

    // Validar que sea una URL válida
    try {
      new URL(request.callbackUrl);
    } catch {
      throw new Error('El callbackUrl debe ser una URL válida');
    }

    if (request.prompt.length > 10000) {
      throw new Error('El prompt no puede exceder 10,000 caracteres');
    }

    this.logger.debug(`✅ [RESEARCH_QUEUE] Petición validada exitosamente`);
  }
}
