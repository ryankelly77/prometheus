/**
 * Shared types for all integrations
 */

import type { IntegrationType, SyncStatus, IntegrationConnectionStatus } from "@/generated/prisma";

// Re-export Prisma types for convenience
export type { IntegrationType, SyncStatus, IntegrationConnectionStatus };

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    totalCount?: number;
    hasMore?: boolean;
    nextLink?: string;
  };
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  maxConcurrent: number;
}

/**
 * Base client configuration
 */
export interface BaseClientConfig {
  baseUrl: string;
  timeout?: number;
  retry?: Partial<RetryConfig>;
  rateLimit?: Partial<RateLimitConfig>;
}

/**
 * Sync job status
 */
export type SyncJobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

/**
 * Sync job configuration
 */
export interface SyncJobConfig {
  integrationId: string;
  locationId: string;
  startDate: Date;
  endDate: Date;
  fullSync?: boolean;
  dataTypes?: string[];
}

/**
 * Sync job progress
 */
export interface SyncJobProgress {
  jobId: string;
  status: SyncJobStatus;
  progress: number; // 0-100
  currentStep?: string;
  recordsProcessed: number;
  recordsTotal?: number;
  errors: SyncError[];
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Sync error
 */
export interface SyncError {
  timestamp: Date;
  dataType: string;
  message: string;
  code?: string;
  recordId?: string;
  retryable: boolean;
}

/**
 * Date range for syncing
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  top?: number;
  skip?: number;
  orderBy?: string;
}

/**
 * OData query parameters
 */
export interface ODataQueryParams extends PaginationParams {
  filter?: string;
  select?: string;
  expand?: string;
}

/**
 * Location mapping configuration
 */
export interface LocationMapping {
  externalId: string;
  prometheusLocationId: string;
  externalName?: string;
}

/**
 * Integration configuration stored in Integration.config
 */
export interface IntegrationConfig {
  locationMappings?: Record<string, string>;
  customerUrl?: string;
  lastFullSync?: string;
  syncPreferences?: {
    autoSync?: boolean;
    syncFrequency?: "hourly" | "daily" | "weekly";
    dataTypes?: string[];
  };
}

/**
 * Token information
 */
export interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
}

/**
 * API log entry for creating
 */
export interface ApiLogEntry {
  service: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  organizationId?: string;
  locationId?: string;
  requestUrl: string;
  requestBody?: unknown;
  status: "SUCCESS" | "ERROR" | "WARNING" | "RATE_LIMITED" | "TIMEOUT" | "AUTH_ERROR";
  httpStatus?: number;
  responseBody?: unknown;
  responseSizeBytes?: number;
  errorMessage?: string;
  errorCode?: string;
  latencyMs?: number;
  attemptNumber?: number;
  traceId?: string;
}

/**
 * Data mapper interface
 */
export interface DataMapper<TSource, TTarget> {
  map(source: TSource, context: MapperContext): TTarget;
  mapMany(sources: TSource[], context: MapperContext): TTarget[];
}

/**
 * Mapper context with location ID and other metadata
 */
export interface MapperContext {
  locationId: string;
  organizationId?: string;
  syncJobId?: string;
}
