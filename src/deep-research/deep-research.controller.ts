import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ResearchQueueService } from './services/research-queue.service';
import { PerplexityService } from './services/perplexity.service';
import type { 
  DeepResearchRequestDto,
  EnqueueResponseDto,
  ResearchResultDto 
} from './dto/deep-research.dto';

@Controller('deep-research')
export class DeepResearchController {
  private readonly logger = new Logger(DeepResearchController.name);

  constructor(
    private readonly researchQueueService: ResearchQueueService,
    private readonly perplexityService: PerplexityService,
  ) {
    this.logger.log('🔧 [DEEP_RESEARCH_CONTROLLER] Controlador inicializado');
  }

  /**
   * Encola una nueva petición de investigación profunda
   */
  @Post('enqueue')
  async enqueueResearch(@Body() request: DeepResearchRequestDto): Promise<EnqueueResponseDto> {
    const startTime = Date.now();
    
    this.logger.log(`📥 [CONTROLLER] === NUEVA PETICIÓN DE INVESTIGACIÓN ===`);
    this.logger.log(`📥 [CONTROLLER] Prompt: "${request.prompt.substring(0, 100)}..."`);
    this.logger.log(`📥 [CONTROLLER] Callback URL: ${request.callbackUrl}`);
    this.logger.debug(`📥 [CONTROLLER] Request completo: ${JSON.stringify(request, null, 2)}`);

    try {
      // Verificar que Perplexity esté configurado
      if (!this.perplexityService.isConfigured()) {
        throw new HttpException(
          'Perplexity API no está configurada. Configura PERPLEXITY_API_KEY en las variables de entorno.',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      // Encolar la petición
      const requestId = await this.researchQueueService.enqueueResearch(request);
      
      const processingTime = Date.now() - startTime;
      
      this.logger.log(`✅ [CONTROLLER] Petición encolada exitosamente en ${processingTime}ms`);
      this.logger.log(`📥 [CONTROLLER] Request ID asignado: ${requestId}`);

      const response: EnqueueResponseDto = {
        success: true,
        requestId,
        message: 'Investigación encolada exitosamente. Recibirás el resultado en el callback URL especificado.',
      };

      return response;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ [CONTROLLER] Error encolando petición después de ${processingTime}ms: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Error encolando investigación: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }



  /**
   * Endpoint para recibir resultados de investigación (callback endpoint de ejemplo)
   * Este endpoint puede ser usado para pruebas locales
   */
  @Post('callback/test')
  async receiveResult(@Body() result: ResearchResultDto): Promise<{ received: boolean; message: string }> {
    this.logger.log(`📡 [CONTROLLER] === CALLBACK RECIBIDO ===`);
    this.logger.log(`📡 [CONTROLLER] Request ID: ${result.requestId}`);
    this.logger.log(`📡 [CONTROLLER] Success: ${result.success}`);
    
    if (result.success) {
      this.logger.log(`📡 [CONTROLLER] Contenido: ${result.content?.length || 0} caracteres`);
      this.logger.log(`📡 [CONTROLLER] Tokens: ${result.usage?.total_tokens || 0}`);
      this.logger.log(`📡 [CONTROLLER] Tiempo: ${result.processingTime}ms`);
    } else {
      this.logger.error(`📡 [CONTROLLER] Error: ${result.error}`);
    }

    this.logger.debug(`📡 [CONTROLLER] Resultado completo: ${JSON.stringify(result, null, 2)}`);

    return {
      received: true,
      message: `Resultado recibido exitosamente para request ${result.requestId}`,
    };
  }

  /**
   * Endpoint de salud para verificar configuración
   */
  @Get('health')
  async healthCheck(): Promise<{
    status: string;
    perplexity: boolean;
    timestamp: string;
  }> {
    this.logger.log(`🏥 [CONTROLLER] === HEALTH CHECK ===`);

    const perplexityConfigured = this.perplexityService.isConfigured();
    
    this.logger.log(`🏥 [CONTROLLER] Perplexity configurado: ${perplexityConfigured}`);

    return {
      status: perplexityConfigured ? 'healthy' : 'degraded',
      perplexity: perplexityConfigured,
      timestamp: new Date().toISOString(),
    };
  }
}
