/**
 * Toast POS API Client
 *
 * Extends BaseApiClient with Toast-specific endpoints and rate limiting.
 */

import { BaseApiClient } from "../base-client";
import { getToastBearerToken, getToastConfig } from "./auth";
import type {
  ToastOrder,
  ToastOrdersResponse,
  ToastTimeEntry,
  ToastTimeEntriesResponse,
  ToastEmployee,
  ToastEmployeesResponse,
  ToastMenu,
  ToastMenusResponse,
  ToastRestaurant,
  ToastSalesCategory,
  ToastRestaurantService,
  ToastRevenueCenter,
} from "./types";

const TOAST_BASE_URL = process.env.TOAST_API_URL ?? "https://ws-api.toasttab.com";

/**
 * Parse RFC 5988 Link header to extract pagination URLs
 * Example: '<url1>; rel="first", <url2>; rel="next"'
 */
function parseLinkHeader(linkHeader: string): { next?: string; first?: string; self?: string; last?: string } {
  const links: { [key: string]: string } = {};
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) {
      links[match[2]] = match[1];
    }
  }
  return links;
}

/**
 * Format date for Toast API (requires format: yyyy-MM-dd'T'HH:mm:ss.SSSZ)
 * Example: 2025-01-31T00:00:00.000+0000
 */
function formatToastDate(date: Date): string {
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  const ms = pad(date.getUTCMilliseconds(), 3);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}+0000`;
}

export class ToastClient extends BaseApiClient {
  private integrationId: string;
  private restaurantGuid: string | null = null;

  constructor(integrationId: string) {
    super("TOAST", {
      baseUrl: TOAST_BASE_URL,
      timeout: 30000,
      // Toast rate limits: 20 req/sec, 10,000 req/15 min
      rateLimit: {
        requestsPerMinute: 900, // 15 req/sec * 60 = stay under 20/sec limit
        maxConcurrent: 5,
      },
      retry: {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        retryableStatuses: [408, 429, 500, 502, 503, 504],
      },
    });
    this.integrationId = integrationId;
  }

  /**
   * Get authorization headers for Toast API
   */
  protected async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await getToastBearerToken(this.integrationId);

    // Get restaurant GUID from config if not cached
    if (!this.restaurantGuid) {
      const config = await getToastConfig(this.integrationId);
      this.restaurantGuid = config?.restaurantGuid ?? null;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (this.restaurantGuid) {
      headers["Toast-Restaurant-External-ID"] = this.restaurantGuid;
    }

    return headers;
  }

  /**
   * Fetch restaurant info
   */
  async fetchRestaurant(): Promise<ToastRestaurant> {
    if (!this.restaurantGuid) {
      const config = await getToastConfig(this.integrationId);
      this.restaurantGuid = config?.restaurantGuid ?? null;
    }

    if (!this.restaurantGuid) {
      throw new Error("Restaurant GUID not configured");
    }

    const response = await this.request<ToastRestaurant>(
      "GET",
      `/restaurants/v1/restaurants/${this.restaurantGuid}`
    );

    if (!response.success) {
      throw new Error(response.error?.message ?? "Failed to fetch restaurant");
    }

    return response.data!;
  }

  /**
   * Fetch orders for a date range
   * Toast uses RFC 5988 Link headers for pagination with rel="next"
   */
  async fetchOrders(params: {
    startDate: Date;
    endDate: Date;
    nextUrl?: string; // Full URL for pagination
  }): Promise<ToastOrdersResponse> {
    let endpoint: string;

    if (params.nextUrl) {
      // Use the full next URL from Link header (extract path + query)
      const url = new URL(params.nextUrl);
      endpoint = url.pathname + url.search;
      console.log(`[Toast Client] Fetching next page: ${endpoint}`);
    } else {
      // First page - build the URL
      const queryParams = new URLSearchParams({
        startDate: formatToastDate(params.startDate),
        endDate: formatToastDate(params.endDate),
        pageSize: "100",
      });
      endpoint = `/orders/v2/ordersBulk?${queryParams.toString()}`;
      console.log(`[Toast Client] Fetching orders: ${endpoint}`);
    }

    const response = await this.request<unknown>("GET", endpoint);

    if (!response.success) {
      console.error(`[Toast Client] Orders request failed:`, response.error);
      throw new Error(response.error?.message ?? "Failed to fetch orders");
    }

    const rawData = response.data;
    let orders: ToastOrder[] = [];
    let nextUrl: string | undefined;

    // Parse Link header for pagination (RFC 5988)
    const linkHeader = response.headers?.["link"];
    if (linkHeader) {
      const links = parseLinkHeader(linkHeader);
      nextUrl = links.next;
      if (nextUrl) {
        console.log(`[Toast Client] Link header contains next URL`);
      }
    }

    // Extract orders from response
    if (Array.isArray(rawData)) {
      orders = rawData as ToastOrder[];
      console.log(`[Toast Client] Direct array response: ${orders.length} orders`);
    } else if (rawData && typeof rawData === 'object') {
      const wrapped = rawData as Record<string, unknown>;
      if (Array.isArray(wrapped.orders)) {
        orders = wrapped.orders as ToastOrder[];
        console.log(`[Toast Client] Wrapped response: ${orders.length} orders`);
      }
    }

    console.log(`[Toast Client] Result: ${orders.length} orders, hasNextPage: ${!!nextUrl}`);
    return { orders, nextPageToken: nextUrl }; // Reuse nextPageToken field for URL
  }

  /**
   * Progress callback for fetchAllOrders
   */
  onFetchProgress?: (progress: { page: number; ordersLoaded: number }) => void;

  /**
   * Fetch all orders for a date range with pagination
   * Uses RFC 5988 Link header with rel="next" for pagination
   */
  async fetchAllOrders(params: {
    startDate: Date;
    endDate: Date;
    onProgress?: (progress: { page: number; ordersLoaded: number }) => void;
  }): Promise<ToastOrder[]> {
    const allOrders: ToastOrder[] = [];
    let nextUrl: string | undefined;
    let pageNumber = 0;

    console.log(`[Toast Client] Starting order fetch from ${formatToastDate(params.startDate)} to ${formatToastDate(params.endDate)}`);

    do {
      pageNumber++;
      // Slower rate for ordersBulk (5 req/sec/location limit)
      await this.delay(250);

      const response = await this.fetchOrders({
        startDate: params.startDate,
        endDate: params.endDate,
        nextUrl,
      });

      const ordersInPage = response.orders?.length ?? 0;
      console.log(`[Toast Client] Page ${pageNumber}: ${ordersInPage} orders, hasNext: ${!!response.nextPageToken}`);

      if (response.orders && Array.isArray(response.orders)) {
        allOrders.push(...response.orders);
      }

      // Send progress callback if provided
      if (params.onProgress) {
        params.onProgress({ page: pageNumber, ordersLoaded: allOrders.length });
      }

      nextUrl = response.nextPageToken; // Contains full URL from Link header

      // Safety check - if we got less than pageSize orders and no next link, we're done
      if (ordersInPage < 100 && !nextUrl) {
        console.log(`[Toast Client] Last page reached (${ordersInPage} < 100 orders, no next link)`);
        break;
      }
    } while (nextUrl);

    console.log(`[Toast Client] Pagination complete - ${pageNumber} pages, ${allOrders.length} total orders`);
    return allOrders;
  }

  /**
   * Fetch time entries for a date range
   */
  async fetchTimeEntries(params: {
    modifiedStartDate: Date;
    modifiedEndDate: Date;
    pageToken?: string;
  }): Promise<ToastTimeEntriesResponse> {
    const queryParams = new URLSearchParams({
      modifiedStartDate: formatToastDate(params.modifiedStartDate),
      modifiedEndDate: formatToastDate(params.modifiedEndDate),
    });

    if (params.pageToken) {
      queryParams.set("pageToken", params.pageToken);
    }

    const response = await this.request<ToastTimeEntriesResponse>(
      "GET",
      `/labor/v1/timeEntries?${queryParams.toString()}`
    );

    if (!response.success) {
      throw new Error(response.error?.message ?? "Failed to fetch time entries");
    }

    return response.data!;
  }

  /**
   * Fetch all time entries for a date range with pagination
   */
  async fetchAllTimeEntries(params: {
    modifiedStartDate: Date;
    modifiedEndDate: Date;
  }): Promise<ToastTimeEntry[]> {
    const allEntries: ToastTimeEntry[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.fetchTimeEntries({
        modifiedStartDate: params.modifiedStartDate,
        modifiedEndDate: params.modifiedEndDate,
        pageToken,
      });

      allEntries.push(...response.timeEntries);
      pageToken = response.nextPageToken;
    } while (pageToken);

    return allEntries;
  }

  /**
   * Fetch employees
   */
  async fetchEmployees(pageToken?: string): Promise<ToastEmployeesResponse> {
    const queryParams = new URLSearchParams();
    if (pageToken) {
      queryParams.set("pageToken", pageToken);
    }

    const url = pageToken
      ? `/labor/v1/employees?${queryParams.toString()}`
      : "/labor/v1/employees";

    const response = await this.request<ToastEmployeesResponse>("GET", url);

    if (!response.success) {
      throw new Error(response.error?.message ?? "Failed to fetch employees");
    }

    return response.data!;
  }

  /**
   * Fetch all employees with pagination
   */
  async fetchAllEmployees(): Promise<ToastEmployee[]> {
    const allEmployees: ToastEmployee[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.fetchEmployees(pageToken);
      allEmployees.push(...response.employees);
      pageToken = response.nextPageToken;
    } while (pageToken);

    return allEmployees;
  }

  /**
   * Fetch menus
   */
  async fetchMenus(): Promise<ToastMenu[]> {
    const response = await this.request<ToastMenusResponse>("GET", "/menus/v2/menus");

    if (!response.success) {
      throw new Error(response.error?.message ?? "Failed to fetch menus");
    }

    return response.data?.menus ?? [];
  }

  /**
   * Fetch sales categories configuration
   * Returns GUID → name mapping for categorizing order items
   */
  async fetchSalesCategories(): Promise<ToastSalesCategory[]> {
    console.log("[Toast Client] Fetching sales categories from /config/v2/salesCategories");
    const response = await this.request<ToastSalesCategory[]>(
      "GET",
      "/config/v2/salesCategories"
    );

    console.log("[Toast Client] Sales categories response:", {
      success: response.success,
      error: response.error?.message,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      rawData: JSON.stringify(response.data)?.slice(0, 500),
    });

    if (!response.success) {
      console.warn("[Toast Client] Failed to fetch sales categories:", response.error?.message);
      return [];
    }

    // API may return array directly or wrapped
    const data = response.data;
    if (Array.isArray(data)) {
      console.log(`[Toast Client] Returning ${data.length} sales categories`);
      return data;
    }
    console.log("[Toast Client] Sales categories data is not an array, returning empty");
    return [];
  }

  /**
   * Fetch restaurant services (dayparts) configuration
   * Returns GUID → name mapping for service periods like "Lunch", "Dinner"
   */
  async fetchRestaurantServices(): Promise<ToastRestaurantService[]> {
    console.log("[Toast Client] Fetching restaurant services from /config/v2/restaurantServices");
    const response = await this.request<ToastRestaurantService[]>(
      "GET",
      "/config/v2/restaurantServices"
    );

    console.log("[Toast Client] Restaurant services response:", {
      success: response.success,
      error: response.error?.message,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      rawData: JSON.stringify(response.data)?.slice(0, 500),
    });

    if (!response.success) {
      console.warn("[Toast Client] Failed to fetch restaurant services:", response.error?.message);
      return [];
    }

    const data = response.data;
    if (Array.isArray(data)) {
      console.log(`[Toast Client] Returning ${data.length} restaurant services`);
      return data;
    }
    console.log("[Toast Client] Restaurant services data is not an array, returning empty");
    return [];
  }

  /**
   * Fetch revenue centers configuration
   * Returns GUID → name mapping for revenue centers
   */
  async fetchRevenueCenters(): Promise<ToastRevenueCenter[]> {
    console.log("[Toast Client] Fetching revenue centers from /config/v2/revenueCenters");
    const response = await this.request<ToastRevenueCenter[]>(
      "GET",
      "/config/v2/revenueCenters"
    );

    console.log("[Toast Client] Revenue centers response:", {
      success: response.success,
      error: response.error?.message,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      rawData: JSON.stringify(response.data)?.slice(0, 500),
    });

    if (!response.success) {
      console.warn("[Toast Client] Failed to fetch revenue centers:", response.error?.message);
      return [];
    }

    const data = response.data;
    if (Array.isArray(data)) {
      console.log(`[Toast Client] Returning ${data.length} revenue centers`);
      return data;
    }
    console.log("[Toast Client] Revenue centers data is not an array, returning empty");
    return [];
  }

  /**
   * Fetch all configuration data needed for order mapping
   * Returns GUID → name maps for sales categories, services, and revenue centers
   */
  async fetchConfigurationMappings(): Promise<{
    salesCategories: Record<string, string>;
    restaurantServices: Record<string, string>;
    revenueCenters: Record<string, string>;
  }> {
    const [categories, services, centers] = await Promise.all([
      this.fetchSalesCategories(),
      this.fetchRestaurantServices(),
      this.fetchRevenueCenters(),
    ]);

    return {
      salesCategories: Object.fromEntries(
        categories.map((c) => [c.guid, c.name])
      ),
      restaurantServices: Object.fromEntries(
        services.map((s) => [s.guid, s.name])
      ),
      revenueCenters: Object.fromEntries(
        centers.map((r) => [r.guid, r.name])
      ),
    };
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a Toast client instance for an integration
 */
export function createToastClient(integrationId: string): ToastClient {
  return new ToastClient(integrationId);
}
