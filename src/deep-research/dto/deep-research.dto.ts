import { IsString, IsUrl, IsOptional, IsObject, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ResearchOptionsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8192)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsString()
  model?: string;
}

export class DeepResearchRequestDto {
  @IsString()
  @MaxLength(10000, { message: 'El prompt no puede exceder 10,000 caracteres' })
  prompt: string;

  @IsUrl({}, { message: 'El callbackUrl debe ser una URL válida' })
  callbackUrl: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @Type(() => ResearchOptionsDto)
  options?: ResearchOptionsDto;
}



export class EnqueueResponseDto {
  success: boolean;
  requestId: string;
  message: string;
  queuePosition?: number;
}

export class ResearchResultDto {
  success: boolean;
  requestId: string;
  content?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  metadata?: Record<string, any>;
  error?: string;
  processingTime?: number;
  completedAt: Date;
}
