export interface VideoExtractionRequest {
  videoUrl: string;
  callbackUrl: string;
  requestId?: string;
  options?: VideoExtractionOptions;
  metadata?: Record<string, any>;
}

export interface VideoExtractionOptions {
  fps?: number;
  width?: number;
  height?: number;
  format?: 'jpg' | 'jpeg' | 'png' | 'webp';
}

export interface VideoExtractionJob {
  id: string;
  videoUrl: string;
  callbackUrl: string;
  requestId: string;
  options: VideoExtractionOptions;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ThumbnailExtractionApiRequest {
  video_url: string;
  fps?: number;
  width?: number;
  height?: number;
  format?: string;
  webhook_url?: string;
}

export interface ThumbnailExtractionApiResponse {
  task_id: string;
  message: string;
  total_thumbnails: number;
  duration: number;
}

export interface ThumbnailExtractionStatus {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  thumbnails?: string[];
  openai_file_ids?: string[];
  webhook_delivered?: boolean;
  error?: string;
}

export interface VideoExtractionResult {
  success: boolean;
  requestId: string;
  taskId?: string;
  thumbnails?: string[];
  openaiFileIds?: string[];
  totalThumbnails?: number;
  duration?: number;
  metadata?: Record<string, any>;
  error?: string;
  processingTime?: number;
  completedAt: Date;
}

export interface ThumbnailWebhookPayload {
  task_id: string;
  video_url: string;
  openai_file_ids: string[];
  timestamp: number;
  status: string;
}

export type VideoExtractionJobData = VideoExtractionJob;
export type VideoFormat = typeof import('../constants/video-extractor.constants').SUPPORTED_VIDEO_FORMATS[number];
export type ImageFormat = typeof import('../constants/video-extractor.constants').SUPPORTED_IMAGE_FORMATS[number];
