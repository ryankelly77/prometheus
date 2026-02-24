/**
 * Base API client with retry, rate limiting, and logging
 */

import prisma from "@/lib/prisma";
import type {
  BaseClientConfig,
  RetryConfig,
  RateLimitConfig,
  ApiLogEntry,
  ApiResponse,
} from "./types";

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  requestsPerMinute: 60,
  maxConcurrent: 2,
};

/**
 * Simple rate limiter using sliding window
 */
class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private activeRequests = 0;
  private readonly maxConcurrent: number;

  constructor(config: RateLimitConfig) {
    this.maxRequests = config.requestsPerMinute;
    this.windowMs = 60000; // 1 minute
    this.maxConcurrent = config.maxConcurrent;
  }

  async acquire(): Promise<void> {
    // Wait for concurrent slot
    while (this.activeRequests >= this.maxConcurrent) {
      await this.sleep(100);
    }

    // Wait for rate limit slot
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => t > now - this.windowMs);

    while (this.timestamps.length >= this.maxRequests) {
      const oldestTimestamp = this.timestamps[0];
      const waitTime = oldestTimestamp + this.windowMs - now;
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
      this.timestamps = this.timestamps.filter((t) => t > Date.now() - this.windowMs);
    }

    this.timestamps.push(Date.now());
    this.activeRequests++;
  }

  release(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Base API client with retry logic, rate limiting, and request logging
 */
export abstract class BaseApiClient {
  protected readonly baseUrl: string;
  protected readonly timeout: number;
  protected readonly retryConfig: RetryConfig;
  protected readonly rateLimiter: RateLimiter;
  protected readonly serviceName: string;

  constructor(serviceName: string, config: BaseClientConfig) {
    this.serviceName = serviceName;
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout ?? 30000;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry };
    this.rateLimiter = new RateLimiter({
      ...DEFAULT_RATE_LIMIT_CONFIG,
      ...config.rateLimit,
    });
  }

  /**
   * Get authorization headers - implemented by subclasses
   */
  protected abstract getAuthHeaders(): Promise<Record<string, string>>;

  /**
   * Make an HTTP request with retry and rate limiting
   */
  protected async request<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    endpoint: string,
    options?: {
      body?: unknown;
      params?: Record<string, string>;
      headers?: Record<string, string>;
      organizationId?: string;
      locationId?: string;
      skipLogging?: boolean;
    }
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, options?.params);
    const traceId = this.generateTraceId();
    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.retryConfig.maxRetries) {
      attempt++;

      try {
        await this.rateLimiter.acquire();

        const authHeaders = await this.getAuthHeaders();
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...authHeaders,
            ...options?.headers,
          },
          body: options?.body ? JSON.stringify(options.body) : undefined,
          signal: AbortSignal.timeout(this.timeout),
        });

        const latencyMs = Date.now() - startTime;
        const responseText = await response.text();
        let responseData: T | undefined;

        try {
          responseData = responseText ? JSON.parse(responseText) : undefined;
        } catch {
          // Response is not JSON
        }

        // Log the request
        if (!options?.skipLogging) {
          await this.logRequest({
            service: this.serviceName,
            endpoint,
            method,
            organizationId: options?.organizationId,
            locationId: options?.locationId,
            requestUrl: url,
            requestBody: options?.body,
            status: response.ok ? "SUCCESS" : this.getErrorStatus(response.status),
            httpStatus: response.status,
            responseBody: responseData,
            responseSizeBytes: responseText.length,
            latencyMs,
            attemptNumber: attempt,
            traceId,
          });
        }

        if (!response.ok) {
          // Check if retryable
          if (
            this.retryConfig.retryableStatuses.includes(response.status) &&
            attempt <= this.retryConfig.maxRetries
          ) {
            const delay = this.calculateBackoff(attempt);
            await this.sleep(delay);
            continue;
          }

          return {
            success: false,
            error: {
              code: `HTTP_${response.status}`,
              message: response.statusText,
              details: responseData,
            },
          };
        }

        return {
          success: true,
          data: responseData,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Log error
        if (!options?.skipLogging) {
          await this.logRequest({
            service: this.serviceName,
            endpoint,
            method,
            organizationId: options?.organizationId,
            locationId: options?.locationId,
            requestUrl: url,
            requestBody: options?.body,
            status: this.getErrorStatusFromError(lastError),
            errorMessage: lastError.message,
            latencyMs: Date.now() - startTime,
            attemptNumber: attempt,
            traceId,
          });
        }

        // Retry on network errors
        if (attempt <= this.retryConfig.maxRetries) {
          const delay = this.calculateBackoff(attempt);
          await this.sleep(delay);
          continue;
        }
      } finally {
        this.rateLimiter.release();
      }
    }

    return {
      success: false,
      error: {
        code: "MAX_RETRIES_EXCEEDED",
        message: lastError?.message ?? "Request failed after max retries",
      },
    };
  }

  /**
   * Build URL with query parameters
   */
  protected buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return url.toString();
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const delay = this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(delay + jitter, this.retryConfig.maxDelayMs);
  }

  /**
   * Log request to database
   */
  private async logRequest(entry: ApiLogEntry): Promise<void> {
    try {
      await prisma.apiLog.create({
        data: {
          service: entry.service as never,
          endpoint: entry.endpoint,
          method: entry.method as never,
          organizationId: entry.organizationId,
          locationId: entry.locationId,
          requestUrl: entry.requestUrl,
          requestBody: entry.requestBody as never,
          status: entry.status as never,
          httpStatus: entry.httpStatus,
          responseBody: entry.responseBody as never,
          responseSizeBytes: entry.responseSizeBytes,
          errorMessage: entry.errorMessage,
          errorCode: entry.errorCode,
          latencyMs: entry.latencyMs,
          attemptNumber: entry.attemptNumber ?? 1,
          traceId: entry.traceId,
        },
      });
    } catch (error) {
      // Don't fail request if logging fails
      console.error("Failed to log API request:", error);
    }
  }

  /**
   * Get error status from HTTP status code
   */
  private getErrorStatus(
    httpStatus: number
  ): "ERROR" | "WARNING" | "RATE_LIMITED" | "TIMEOUT" | "AUTH_ERROR" {
    if (httpStatus === 401 || httpStatus === 403) return "AUTH_ERROR";
    if (httpStatus === 429) return "RATE_LIMITED";
    if (httpStatus === 408) return "TIMEOUT";
    return "ERROR";
  }

  /**
   * Get error status from Error object
   */
  private getErrorStatusFromError(
    error: Error
  ): "ERROR" | "WARNING" | "RATE_LIMITED" | "TIMEOUT" | "AUTH_ERROR" {
    if (error.name === "AbortError" || error.message.includes("timeout")) {
      return "TIMEOUT";
    }
    return "ERROR";
  }

  /**
   * Generate a unique trace ID for request tracking
   */
  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
