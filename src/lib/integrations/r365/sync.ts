/**
 * R365 Data Sync Orchestration
 */

import prisma from "@/lib/prisma";
import { createR365Client } from "./client";
import { getR365Config, updateR365Config } from "./auth";
import {
  aggregateLaborByPosition,
  mapAggregatedLaborToLaborDetail,
  upsertLaborDetails,
  mapSalesSummariesToTransactionSummaries,
  upsertTransactionSummaries,
} from "./mappers";
import {
  createSyncJob,
  updateSyncJobProgress,
  addSyncError,
  completeSyncJob,
  getSyncJobProgress,
  splitDateRangeIntoBatches,
  getMonthlyDateRanges,
  updateIntegrationSyncStatus,
  updateIntegrationStatusHealth,
  shouldBreakCircuit,
  calculateProgress,
} from "../sync-manager";
import type { R365SyncOptions, R365DataType, R365IntegrationConfig } from "./types";
import type { SyncJobProgress, DateRange } from "../types";
import { subDays, subMonths } from "date-fns";

/**
 * Default sync options
 */
const DEFAULT_SYNC_OPTIONS: R365SyncOptions = {
  dataTypes: ["labor"],
  fullSync: false,
};

/**
 * Sync R365 data for an integration
 */
export async function syncR365Data(
  integrationId: string,
  options: R365SyncOptions = {}
): Promise<SyncJobProgress> {
  const opts = { ...DEFAULT_SYNC_OPTIONS, ...options };

  // Create sync job
  const jobId = createSyncJob({
    integrationId,
    locationId: "", // Will be set per location
    startDate: opts.startDate ?? subDays(new Date(), 30),
    endDate: opts.endDate ?? new Date(),
    fullSync: opts.fullSync,
    dataTypes: opts.dataTypes,
  });

  updateSyncJobProgress(jobId, {
    status: "running",
    startedAt: new Date(),
    currentStep: "Initializing",
  });

  try {
    // Get integration and config
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      include: {
        location: {
          include: {
            restaurantGroup: {
              include: { organization: true },
            },
          },
        },
      },
    });

    if (!integration) {
      throw new Error("Integration not found");
    }

    const organizationId = integration.location.restaurantGroup.organizationId;

    // Check circuit breaker
    if (await shouldBreakCircuit("R365", organizationId)) {
      throw new Error("R365 integration is temporarily disabled due to repeated failures");
    }

    const config = (integration.config as unknown as R365IntegrationConfig) ?? {};
    const client = createR365Client(integrationId);

    // Test connection first
    updateSyncJobProgress(jobId, { currentStep: "Testing connection" });
    const connectionTest = await client.testConnection();
    if (!connectionTest.success) {
      throw new Error(`Connection test failed: ${connectionTest.error}`);
    }

    // Determine date ranges
    let dateRanges: DateRange[];
    if (opts.fullSync) {
      // 12 months of historical data
      dateRanges = getMonthlyDateRanges(12);
      updateSyncJobProgress(jobId, {
        currentStep: "Starting full historical sync (12 months)",
      });
    } else {
      // Use provided dates or default to last 30 days
      const startDate = opts.startDate ?? subDays(new Date(), 30);
      const endDate = opts.endDate ?? new Date();
      dateRanges = splitDateRangeIntoBatches(startDate, endDate);
    }

    // Get location mappings
    const locationMappings = config.locationMappings ?? {};
    const prometheusLocationIds = Object.values(locationMappings);

    if (prometheusLocationIds.length === 0) {
      throw new Error("No location mappings configured. Please map R365 locations first.");
    }

    // Calculate total work
    const totalBatches = dateRanges.length;
    const dataTypes = opts.dataTypes ?? ["labor"];
    let completedBatches = 0;
    let totalRecordsProcessed = 0;

    // Process each date range
    for (const dateRange of dateRanges) {
      const rangeLabel = `${dateRange.start.toISOString().split("T")[0]} to ${dateRange.end.toISOString().split("T")[0]}`;

      // Sync each data type
      for (const dataType of dataTypes) {
        updateSyncJobProgress(jobId, {
          currentStep: `Syncing ${dataType} for ${rangeLabel}`,
          progress: calculateProgress(completedBatches, totalBatches, dataTypes.length, dataTypes.indexOf(dataType)),
        });

        try {
          const recordsProcessed = await syncDataType(
            client,
            dataType,
            dateRange,
            integration.locationId,
            config
          );
          totalRecordsProcessed += recordsProcessed;
        } catch (error) {
          addSyncError(jobId, {
            timestamp: new Date(),
            dataType,
            message: error instanceof Error ? error.message : "Unknown error",
            retryable: true,
          });
          // Continue with next data type
        }
      }

      completedBatches++;
      updateSyncJobProgress(jobId, {
        progress: calculateProgress(completedBatches, totalBatches, dataTypes.length, dataTypes.length),
        recordsProcessed: totalRecordsProcessed,
      });
    }

    // Update last full sync date if applicable
    if (opts.fullSync) {
      await updateR365Config(integrationId, {
        lastFullSync: new Date().toISOString(),
      });
    }

    // Mark sync as successful
    await updateIntegrationSyncStatus(integrationId, "SUCCESS");
    await updateIntegrationStatusHealth("R365", organizationId, true);

    completeSyncJob(jobId, "completed");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    addSyncError(jobId, {
      timestamp: new Date(),
      dataType: "general",
      message: errorMessage,
      retryable: false,
    });

    // Update integration status
    await updateIntegrationSyncStatus(integrationId, "FAILED", errorMessage);

    // Get organization ID for health tracking
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      include: { location: { include: { restaurantGroup: true } } },
    });

    if (integration) {
      await updateIntegrationStatusHealth(
        "R365",
        integration.location.restaurantGroup.organizationId,
        false,
        { message: errorMessage }
      );
    }

    completeSyncJob(jobId, "failed");
  }

  return getSyncJobProgress(jobId)!;
}

/**
 * Sync a specific data type
 */
async function syncDataType(
  client: ReturnType<typeof createR365Client>,
  dataType: R365DataType,
  dateRange: DateRange,
  locationId: string,
  config: R365IntegrationConfig
): Promise<number> {
  switch (dataType) {
    case "labor":
      return syncLaborData(client, dateRange, locationId, config);
    case "sales":
      return syncSalesData(client, dateRange, locationId, config);
    case "transactions":
    case "invoices":
      // Transaction sync would go here
      return 0;
    default:
      console.warn(`Unknown data type: ${dataType}`);
      return 0;
  }
}

/**
 * Sync labor data
 */
async function syncLaborData(
  client: ReturnType<typeof createR365Client>,
  dateRange: DateRange,
  locationId: string,
  config: R365IntegrationConfig
): Promise<number> {
  // Get R365 location IDs for this Prometheus location
  const r365LocationIds: string[] = [];
  for (const [r365Id, promId] of Object.entries(config.locationMappings ?? {})) {
    if (promId === locationId) {
      r365LocationIds.push(r365Id);
    }
  }

  if (r365LocationIds.length === 0) {
    return 0;
  }

  // Fetch labor data
  const laborRecords = await client.fetchLaborDetail(dateRange, r365LocationIds);

  if (laborRecords.length === 0) {
    return 0;
  }

  // Aggregate by position
  const aggregates = aggregateLaborByPosition(laborRecords, locationId);

  // Map to Prometheus format
  const laborDetails = mapAggregatedLaborToLaborDetail(aggregates, {
    locationId,
  });

  // Upsert to database
  const result = await upsertLaborDetails(prisma, locationId, laborDetails);

  return result.updated;
}

/**
 * Sync sales data
 */
async function syncSalesData(
  client: ReturnType<typeof createR365Client>,
  dateRange: DateRange,
  locationId: string,
  config: R365IntegrationConfig
): Promise<number> {
  // Get R365 location IDs
  const r365LocationIds: string[] = [];
  for (const [r365Id, promId] of Object.entries(config.locationMappings ?? {})) {
    if (promId === locationId) {
      r365LocationIds.push(r365Id);
    }
  }

  if (r365LocationIds.length === 0) {
    return 0;
  }

  // Try to fetch sales summary
  const salesRecords = await client.fetchSalesSummary(dateRange, r365LocationIds);

  if (salesRecords.length === 0) {
    return 0;
  }

  // Map to transaction summaries
  const summaries = mapSalesSummariesToTransactionSummaries(salesRecords, {
    locationId,
  });

  // Upsert to database
  const result = await upsertTransactionSummaries(prisma, locationId, summaries);

  return result.updated;
}

/**
 * Get sync status for an integration
 */
export async function getR365SyncStatus(
  integrationId: string
): Promise<{
  isConnected: boolean;
  lastSyncAt?: Date;
  lastSyncStatus?: string;
  lastSyncError?: string;
  r365Locations?: Array<{ id: string; name: string }>;
  mappedLocations: number;
}> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: {
      status: true,
      lastSyncAt: true,
      lastSyncStatus: true,
      lastSyncError: true,
      config: true,
    },
  });

  if (!integration) {
    return { isConnected: false, mappedLocations: 0 };
  }

  const config = (integration.config as unknown as R365IntegrationConfig) ?? {};
  const mappedLocations = Object.keys(config.locationMappings ?? {}).length;

  return {
    isConnected: integration.status === "CONNECTED",
    lastSyncAt: integration.lastSyncAt ?? undefined,
    lastSyncStatus: integration.lastSyncStatus ?? undefined,
    lastSyncError: integration.lastSyncError ?? undefined,
    mappedLocations,
  };
}

/**
 * Trigger incremental sync (last day)
 */
export async function triggerIncrementalSync(integrationId: string): Promise<string> {
  const result = await syncR365Data(integrationId, {
    startDate: subDays(new Date(), 1),
    endDate: new Date(),
    dataTypes: ["labor", "sales"],
  });

  return result.jobId;
}

/**
 * Trigger full historical sync (12 months)
 */
export async function triggerHistoricalSync(integrationId: string): Promise<string> {
  const result = await syncR365Data(integrationId, {
    fullSync: true,
    dataTypes: ["labor", "sales"],
  });

  return result.jobId;
}
