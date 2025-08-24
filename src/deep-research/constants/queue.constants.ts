export const DEEP_RESEARCH_QUEUE = 'deep-research-queue';

export const DEEP_RESEARCH_JOBS = {
  PERPLEXITY_RESEARCH: 'perplexity-research',
} as const;

export const QUEUE_OPTIONS = {
  removeOnComplete: 100, // Mantener los últimos 100 jobs completados
  removeOnFail: 50,      // Mantener los últimos 50 jobs fallidos
  attempts: 3,           // Número de reintentos
  backoff: {
    type: 'exponential',
    delay: 2000,         // Delay inicial de 2 segundos
  },
} as const;
