import { 
  IsString, 
  IsUrl, 
  IsOptional, 
  IsNumber, 
  IsEnum, 
  IsObject, 
  Min, 
  Max,
  IsBoolean
} from 'class-validator';
import { Transform } from 'class-transformer';
import type { VideoExtractionOptions } from '../types/video-extractor.types';

export class VideoExtractionOptionsDto implements VideoExtractionOptions {
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(30.0)
  fps?: number;

  @IsOptional()
  @IsNumber()
  @Min(64)
  @Max(1920)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(64)
  @Max(1080)
  height?: number;

  @IsOptional()
  @IsEnum(['jpg', 'jpeg', 'png', 'webp'])
  format?: 'jpg' | 'jpeg' | 'png' | 'webp';
}

export class VideoExtractionRequestDto {
  @IsString()
  @IsUrl()
  videoUrl: string;

  @IsString()
  @IsUrl()
  callbackUrl: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsObject()
  @Transform(({ value }) => value || {})
  options?: VideoExtractionOptionsDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class EnqueueVideoExtractionResponseDto {
  @IsBoolean()
  success: boolean;

  @IsString()
  requestId: string;

  @IsString()
  message: string;
}

export class VideoExtractionResultDto {
  @IsBoolean()
  success: boolean;

  @IsString()
  requestId: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString({ each: true })
  thumbnails?: string[];

  @IsOptional()
  @IsString({ each: true })
  openaiFileIds?: string[];

  @IsOptional()
  @IsNumber()
  totalThumbnails?: number;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsNumber()
  processingTime?: number;

  @IsString()
  completedAt: string;
}
