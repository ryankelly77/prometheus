/**
 * R365 API Client
 */

import { BaseApiClient } from "../base-client";
import { getR365BearerToken, getR365Config } from "./auth";
import {
  R365_ODATA_BASE_URL,
  buildODataQuery,
  buildDateFilter,
  buildLocationFilter,
  combineFilters,
  LABOR_DETAIL_SELECT_FIELDS,
  LABOR_DETAIL_EXPAND,
  LOCATION_SELECT_FIELDS,
  JOB_TITLE_SELECT_FIELDS,
  DEFAULT_BATCH_SIZE,
} from "./endpoints";
import type {
  R365ODataResponse,
  R365LaborDetail,
  R365Location,
  R365JobTitle,
  R365SalesSummary,
  R365IntegrationConfig,
} from "./types";
import type { DateRange } from "../types";

/**
 * R365 API client for OData access
 */
export class R365Client extends BaseApiClient {
  private readonly integrationId: string;
  private config: R365IntegrationConfig | null = null;

  constructor(integrationId: string) {
    super("R365", {
      baseUrl: R365_ODATA_BASE_URL,
      timeout: 60000, // 60 seconds for large queries
      retry: {
        maxRetries: 3,
        baseDelayMs: 2000,
      },
      rateLimit: {
        requestsPerMinute: 30, // Conservative
        maxConcurrent: 2,
      },
    });
    this.integrationId = integrationId;
  }

  /**
   * Get authorization headers with bearer token
   */
  protected async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await getR365BearerToken(this.integrationId);
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Load R365 config
   */
  private async loadConfig(): Promise<R365IntegrationConfig> {
    if (!this.config) {
      this.config = await getR365Config(this.integrationId);
      if (!this.config) {
        throw new Error("R365 integration not configured");
      }
    }
    return this.config;
  }

  /**
   * Get R365 location ID for a Prometheus location
   */
  private getR365LocationId(prometheusLocationId: string): string | null {
    if (!this.config?.locationMappings) return null;

    // Reverse lookup: find R365 ID that maps to Prometheus ID
    for (const [r365Id, promId] of Object.entries(this.config.locationMappings)) {
      if (promId === prometheusLocationId) {
        return r365Id;
      }
    }
    return null;
  }

  /**
   * Fetch all R365 locations
   */
  async fetchLocations(): Promise<R365Location[]> {
    const url = buildODataQuery(`${R365_ODATA_BASE_URL}/Location`, {
      select: LOCATION_SELECT_FIELDS,
      filter: "isActive eq true",
      orderBy: "name",
    });

    const response = await this.request<R365ODataResponse<R365Location>>(
      "GET",
      url,
      { skipLogging: false }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message ?? "Failed to fetch R365 locations");
    }

    return response.data.value;
  }

  /**
   * Fetch all R365 job titles
   */
  async fetchJobTitles(): Promise<R365JobTitle[]> {
    const url = buildODataQuery(`${R365_ODATA_BASE_URL}/JobTitle`, {
      select: JOB_TITLE_SELECT_FIELDS,
      filter: "isActive eq true",
      orderBy: "name",
    });

    const response = await this.request<R365ODataResponse<R365JobTitle>>(
      "GET",
      url,
      { skipLogging: false }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message ?? "Failed to fetch R365 job titles");
    }

    return response.data.value;
  }

  /**
   * Fetch labor detail for a date range
   */
  async fetchLaborDetail(
    dateRange: DateRange,
    r365LocationIds?: string[]
  ): Promise<R365LaborDetail[]> {
    await this.loadConfig();

    const results: R365LaborDetail[] = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const filters: string[] = [buildDateFilter("dateWorked", dateRange.start, dateRange.end)];

      if (r365LocationIds?.length) {
        filters.push(`(${buildLocationFilter("location_Id", r365LocationIds)})`);
      }

      const url = buildODataQuery(`${R365_ODATA_BASE_URL}/LaborDetail`, {
        select: LABOR_DETAIL_SELECT_FIELDS,
        expand: LABOR_DETAIL_EXPAND,
        filter: combineFilters(...filters),
        orderBy: "dateWorked",
        top: DEFAULT_BATCH_SIZE,
        skip,
      });

      const response = await this.request<R365ODataResponse<R365LaborDetail>>(
        "GET",
        url,
        { skipLogging: false }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? "Failed to fetch labor detail");
      }

      results.push(...response.data.value);

      // Check for more data
      if (response.data["@odata.nextLink"]) {
        skip += DEFAULT_BATCH_SIZE;
      } else if (response.data.value.length < DEFAULT_BATCH_SIZE) {
        hasMore = false;
      } else {
        skip += DEFAULT_BATCH_SIZE;
      }

      // Safety limit
      if (skip > 100000) {
        console.warn("R365 labor fetch hit safety limit");
        break;
      }
    }

    return results;
  }

  /**
   * Fetch labor detail for a specific Prometheus location
   */
  async fetchLaborDetailForLocation(
    prometheusLocationId: string,
    dateRange: DateRange
  ): Promise<R365LaborDetail[]> {
    await this.loadConfig();

    const r365LocationId = this.getR365LocationId(prometheusLocationId);
    if (!r365LocationId) {
      throw new Error(
        `No R365 location mapping found for Prometheus location: ${prometheusLocationId}`
      );
    }

    return this.fetchLaborDetail(dateRange, [r365LocationId]);
  }

  /**
   * Fetch sales summary for a date range (if available)
   * Note: Not all R365 installations expose this view
   */
  async fetchSalesSummary(
    dateRange: DateRange,
    r365LocationIds?: string[]
  ): Promise<R365SalesSummary[]> {
    await this.loadConfig();

    const results: R365SalesSummary[] = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const filters: string[] = [buildDateFilter("date", dateRange.start, dateRange.end)];

      if (r365LocationIds?.length) {
        filters.push(`(${buildLocationFilter("location_Id", r365LocationIds)})`);
      }

      // Note: The exact endpoint name may vary - check $metadata
      const url = buildODataQuery(`${R365_ODATA_BASE_URL}/DailySalesSummary`, {
        filter: combineFilters(...filters),
        orderBy: "date",
        top: DEFAULT_BATCH_SIZE,
        skip,
      });

      try {
        const response = await this.request<R365ODataResponse<R365SalesSummary>>(
          "GET",
          url,
          { skipLogging: false }
        );

        if (!response.success || !response.data) {
          // This endpoint may not exist, return empty
          console.warn("Sales summary endpoint not available");
          return [];
        }

        results.push(...response.data.value);

        if (response.data.value.length < DEFAULT_BATCH_SIZE) {
          hasMore = false;
        } else {
          skip += DEFAULT_BATCH_SIZE;
        }
      } catch {
        // Endpoint may not exist
        console.warn("Sales summary endpoint not available");
        return [];
      }
    }

    return results;
  }

  /**
   * Test connection to R365
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Try to fetch locations - this validates the token works
      const locations = await this.fetchLocations();
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection test failed",
      };
    }
  }
}

/**
 * Create R365 client instance for an integration
 */
export function createR365Client(integrationId: string): R365Client {
  return new R365Client(integrationId);
}
