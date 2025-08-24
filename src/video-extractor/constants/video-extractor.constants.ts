export const VIDEO_EXTRACTOR_QUEUE = 'video-extractor-queue';

export const VIDEO_EXTRACTOR_JOBS = {
  EXTRACT_THUMBNAILS: 'extract-thumbnails',
} as const;

export const QUEUE_OPTIONS = {
  removeOnComplete: 50,
  removeOnFail: 20,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
} as const;

export const API_ENDPOINTS = {
  EXTRACT_THUMBNAILS: '/extract-thumbnails',
  STATUS: '/status',
  DOWNLOAD: '/download',
  CLEANUP: '/cleanup',
  HEALTH: '/health',
} as const;

export const SUPPORTED_VIDEO_FORMATS = [
  'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'
] as const;

export const SUPPORTED_IMAGE_FORMATS = [
  'jpg', 'jpeg', 'png', 'webp'
] as const;

export const FPS_LIMITS = {
  MIN: 0.1,
  MAX: 30.0,
  DEFAULT: 1.0,
} as const;

export const DIMENSION_LIMITS = {
  WIDTH: {
    MIN: 64,
    MAX: 1920,
    DEFAULT: 320,
  },
  HEIGHT: {
    MIN: 64,
    MAX: 1080,
    DEFAULT: 240,
  },
} as const;

export const THUMBNAIL_LIMITS = {
  MIN: 1,
  MAX: 100,
  DEFAULT: 10,
} as const;

export const POLLING_CONFIG = {
  INTERVAL: 2000, // 2 segundos
  MAX_ATTEMPTS: 300, // 10 minutos máximo
  TIMEOUT_MULTIPLIER: 1.5,
} as const;
