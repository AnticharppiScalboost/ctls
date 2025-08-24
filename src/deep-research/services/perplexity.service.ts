import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type {
  PerplexityAsyncRequest,
  PerplexityAsyncResponse,
  PerplexityDeepResearchRequest,
  DeepResearchRequest,
} from '../types/research.types';

@Injectable()
export class PerplexityService {
  private readonly logger = new Logger(PerplexityService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly pollingInterval: number;
  private readonly maxPollingAttempts: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('perplexity.apiKey');
    this.baseUrl =
      this.configService.get<string>('perplexity.baseUrl') ||
      'https://api.perplexity.ai';
    this.defaultModel =
      this.configService.get<string>('perplexity.model') ||
      'sonar-deep-research';
    this.pollingInterval =
      this.configService.get<number>('perplexity.pollingInterval') || 10000;
    this.maxPollingAttempts =
      this.configService.get<number>('perplexity.maxPollingAttempts') || 300;

    if (!this.apiKey) {
      this.logger.warn(
        '⚠️ [PERPLEXITY] PERPLEXITY_API_KEY no configurada - el servicio no estará disponible',
      );
    } else {
      this.logger.log('✅ [PERPLEXITY] Servicio inicializado correctamente');
    }
  }

  /**
   * Verifica si el servicio está configurado y disponible
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Envía una petición de investigación profunda asíncrona a Perplexity
   */
  async startDeepResearch(request: DeepResearchRequest): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Perplexity API key no está configurada');
    }

    const startTime = Date.now();
    this.logger.log(`🔍 [PERPLEXITY] === INICIANDO INVESTIGACIÓN PROFUNDA ===`);
    this.logger.log(
      `🔍 [PERPLEXITY] Prompt: "${request.prompt.substring(0, 100)}..."`,
    );

    try {
      const payload: PerplexityAsyncRequest = {
        model: request.options?.model || this.defaultModel,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        max_tokens:
          request.options?.maxTokens ||
          this.configService.get('perplexity.maxTokens'),
        temperature:
          request.options?.temperature ||
          this.configService.get('perplexity.temperature'),
        return_images: true,
        return_related_questions: true,
        search_recency_filter: 'month',
      };

      // Para el modelo sonar-deep-research, envolver el payload en un campo 'request'
      const requestBody:
        | PerplexityAsyncRequest
        | PerplexityDeepResearchRequest = this.isDeepResearchModel(
        payload.model,
      )
        ? { request: payload }
        : payload;

      this.logger.debug(
        `🔍 [PERPLEXITY] Payload: ${JSON.stringify(requestBody, null, 2)}`,
      );

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/async/chat/completions`,
          requestBody,
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const requestId = response.data.id;
      const processingTime = Date.now() - startTime;

      this.logger.log(
        `✅ [PERPLEXITY] Petición iniciada exitosamente en ${processingTime}ms`,
      );
      this.logger.log(`🔍 [PERPLEXITY] Request ID: ${requestId}`);

      return requestId;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `❌ [PERPLEXITY] Error iniciando investigación después de ${processingTime}ms: ${error.message}`,
      );

      if (error.response?.data) {
        this.logger.error(
          `❌ [PERPLEXITY] Detalles del error: ${JSON.stringify(error.response.data, null, 2)}`,
        );
      }

      throw new Error(
        `Error iniciando investigación en Perplexity: ${error.message}`,
      );
    }
  }

  /**
   * Realiza polling del estado de una petición hasta completarse
   */
  async pollRequestStatus(requestId: string): Promise<PerplexityAsyncResponse> {
    if (!this.isConfigured()) {
      throw new Error('Perplexity API key no está configurada');
    }

    const startTime = Date.now();
    this.logger.log(`⏰ [PERPLEXITY] === INICIANDO POLLING ===`);
    this.logger.log(`⏰ [PERPLEXITY] Request ID: ${requestId}`);
    this.logger.log(
      `⏰ [PERPLEXITY] Intervalo: ${this.pollingInterval}ms, Máximo intentos: ${this.maxPollingAttempts}`,
    );

    let attempts = 0;

    while (attempts < this.maxPollingAttempts) {
      attempts++;

      try {
        this.logger.debug(
          `⏰ [PERPLEXITY] Intento ${attempts}/${this.maxPollingAttempts}...`,
        );

        const response = await firstValueFrom(
          this.httpService.get(
            `${this.baseUrl}/async/chat/completions/${requestId}`,
            {
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
              },
            },
          ),
        );

        const data: PerplexityAsyncResponse = response.data;
        this.logger.debug(`⏰ [PERPLEXITY] Estado actual: ${data.status}`);

        if (data.status === 'COMPLETED') {
          const processingTime = Date.now() - startTime;
          this.logger.log(
            `✅ [PERPLEXITY] Investigación completada en ${processingTime}ms después de ${attempts} intentos`,
          );

          if (data.response?.usage) {
            this.logger.log(
              `📊 [PERPLEXITY] Tokens usados: ${data.response.usage.total_tokens} (prompt: ${data.response.usage.prompt_tokens}, completion: ${data.response.usage.completion_tokens})`,
            );
          }

          if (data.response?.choices?.[0]?.message?.content) {
            const contentLength =
              data.response.choices[0].message.content.length;
            this.logger.log(
              `📝 [PERPLEXITY] Contenido generado: ${contentLength} caracteres`,
            );
          }

          return data;
        }

        if (data.status === 'FAILED') {
          const processingTime = Date.now() - startTime;
          this.logger.error(
            `❌ [PERPLEXITY] Investigación falló después de ${processingTime}ms en intento ${attempts}`,
          );

          if (data.error) {
            this.logger.error(
              `❌ [PERPLEXITY] Error: ${data.error.type} - ${data.error.message}`,
            );
          }

          throw new Error(
            `Investigación falló: ${data.error?.message || 'Error desconocido'}`,
          );
        }

        // Status es PENDING o IN_PROGRESS, continuar polling
        this.logger.debug(
          `⏰ [PERPLEXITY] Estado: ${data.status}, esperando ${this.pollingInterval}ms...`,
        );
        await this.sleep(this.pollingInterval);
      } catch (error) {
        if (error.message.includes('Investigación falló')) {
          throw error; // Re-lanzar errores de falla conocidos
        }

        const processingTime = Date.now() - startTime;
        this.logger.error(
          `❌ [PERPLEXITY] Error en polling después de ${processingTime}ms, intento ${attempts}: ${error.message}`,
        );

        // Si es el último intento, lanzar error
        if (attempts >= this.maxPollingAttempts) {
          throw new Error(
            `Timeout después de ${attempts} intentos: ${error.message}`,
          );
        }

        // Esperar antes del siguiente intento
        await this.sleep(this.pollingInterval);
      }
    }

    const processingTime = Date.now() - startTime;
    this.logger.error(
      `⏰ [PERPLEXITY] Timeout después de ${processingTime}ms y ${attempts} intentos`,
    );
    throw new Error(
      `Timeout: La investigación no se completó después de ${attempts} intentos (${processingTime}ms)`,
    );
  }

  /**
   * Utilidad para pausar ejecución
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Verifica si el modelo es de tipo deep research que requiere estructura especial
   */
  private isDeepResearchModel(model: string): boolean {
    return model.includes('sonar-deep-research');
  }

  /**
   * Método de conveniencia para investigación completa (iniciar + polling)
   */
  async performCompleteResearch(
    request: DeepResearchRequest,
  ): Promise<PerplexityAsyncResponse> {
    this.logger.log(`🚀 [PERPLEXITY] === INVESTIGACIÓN COMPLETA ===`);
    this.logger.log(
      `🚀 [PERPLEXITY] Prompt: "${request.prompt.substring(0, 100)}..."`,
    );

    const requestId = await this.startDeepResearch(request);
    const result = await this.pollRequestStatus(requestId);

    this.logger.log(`🎉 [PERPLEXITY] === INVESTIGACIÓN COMPLETADA ===`);
    return result;
  }
}
