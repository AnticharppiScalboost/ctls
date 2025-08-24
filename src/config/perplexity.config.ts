import { registerAs } from '@nestjs/config';

export default registerAs('perplexity', () => ({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseUrl: 'https://api.perplexity.ai',
  model: 'sonar-deep-research',
  maxTokens: 8192,
  temperature: 0.7,
  pollingInterval: 1000, // 1 segundo entre polls
  maxPollingAttempts: 300, // máximo 5 minutos de espera
}));
