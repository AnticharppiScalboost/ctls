import { registerAs } from '@nestjs/config';

export default registerAs('perplexity', () => ({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseUrl: 'https://api.perplexity.ai',
  model: 'sonar-deep-research',
  maxTokens: 8192,
  temperature: 0.7,
  pollingInterval: 4000, // 4 segundos entre polls
  maxPollingAttempts: 700, // máximo 10 minutos de espera
}));
