// API Response types for tests
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  token?: string;
  user?: {
    role: string;
    permissions: string[];
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
  metadata?: {
    performance?: {
      totalTime: number;
      validationTime?: number;
    };
    requestId?: string;
    timestamp?: string;
    version?: string;
  };
}

export interface FandomResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tag_count?: number;
  plot_block_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TagResponse {
  id: string;
  name: string;
  slug?: string;
  fandom_id: string;
  description?: string;
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlotBlockResponse {
  id: string;
  name: string;
  slug?: string;
  fandom_id: string;
  category?: string;
  description?: string;
  complexity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: PlotBlockResponse[];
}

export interface ValidationResponse {
  isValid: boolean;
  complexity?: string;
  conflicts?: Array<{
    type: string;
    message: string;
    items: string[];
  }>;
  suggestions?: Array<{
    type: string;
    message: string;
    action: string;
  }>;
}

// Test HTTP client response wrapper
export interface TestHttpResponse<T = any> {
  status: number;
  data: T;
  responseTime?: number;
}
