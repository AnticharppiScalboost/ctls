export interface DeepResearchRequest {
  prompt: string;
  callbackUrl: string;
  requestId?: string;
  metadata?: Record<string, any>;
  options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  };
}

export interface DeepResearchJob {
  id: string;
  prompt: string;
  callbackUrl: string;
  requestId: string;
  metadata?: Record<string, any>;
  options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  };
  createdAt: Date;
}

export interface PerplexityAsyncRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  search_domain_filter?: string[];
  return_images?: boolean;
  return_related_questions?: boolean;
  search_recency_filter?: 'month' | 'week' | 'day' | 'hour';
}

export interface PerplexityDeepResearchRequest {
  request: PerplexityAsyncRequest;
}

export interface PerplexityAsyncResponse {
  id: string;
  model: string;
  created: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  response?: {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
      index: number;
      finish_reason: string;
      message: {
        role: string;
        content: string;
      };
      delta?: {
        role?: string;
        content?: string;
      };
    }>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
  error?: {
    type: string;
    message: string;
  };
}

export interface ResearchResult {
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
