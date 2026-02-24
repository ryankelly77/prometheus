/**
 * Sync Manager - orchestrates data sync jobs with progress tracking
 */

import prisma from "@/lib/prisma";
import type {
  SyncJobConfig,
  SyncJobProgress,
  SyncJobStatus,
  SyncError,
  DateRange,
} from "./types";
import { startOfMonth, endOfMonth, subMonths, differenceInDays, addDays } from "date-fns";

/**
 * Maximum days per batch (R365 limit is 31 days)
 */
const MAX_DAYS_PER_BATCH = 31;

/**
 * Active sync jobs (in-memory for now, could be Redis)
 */
const activeSyncJobs = new Map<string, SyncJobProgress>();

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  return `sync-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Get current progress for a sync job
 */
export function getSyncJobProgress(jobId: string): SyncJobProgress | null {
  return activeSyncJobs.get(jobId) ?? null;
}

/**
 * Create a new sync job and return its ID
 */
export function createSyncJob(config: SyncJobConfig): string {
  const jobId = generateJobId();

  const progress: SyncJobProgress = {
    jobId,
    status: "pending",
    progress: 0,
    recordsProcessed: 0,
    errors: [],
  };

  activeSyncJobs.set(jobId, progress);
  return jobId;
}

/**
 * Update sync job progress
 */
export function updateSyncJobProgress(
  jobId: string,
  updates: Partial<Omit<SyncJobProgress, "jobId">>
): void {
  const current = activeSyncJobs.get(jobId);
  if (current) {
    activeSyncJobs.set(jobId, { ...current, ...updates });
  }
}

/**
 * Add an error to sync job
 */
export function addSyncError(jobId: string, error: SyncError): void {
  const current = activeSyncJobs.get(jobId);
  if (current) {
    current.errors.push(error);
    activeSyncJobs.set(jobId, current);
  }
}

/**
 * Mark sync job as completed
 */
export function completeSyncJob(jobId: string, status: "completed" | "failed"): void {
  const current = activeSyncJobs.get(jobId);
  if (current) {
    activeSyncJobs.set(jobId, {
      ...current,
      status,
      progress: status === "completed" ? 100 : current.progress,
      completedAt: new Date(),
    });
  }
}

/**
 * Clean up old sync jobs from memory
 */
export function cleanupOldSyncJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
  const now = Date.now();
  for (const [jobId, progress] of activeSyncJobs.entries()) {
    if (
      progress.completedAt &&
      now - progress.completedAt.getTime() > maxAgeMs
    ) {
      activeSyncJobs.delete(jobId);
    }
  }
}

/**
 * Split a date range into batches respecting max days limit
 */
export function splitDateRangeIntoBatches(
  startDate: Date,
  endDate: Date,
  maxDays: number = MAX_DAYS_PER_BATCH
): DateRange[] {
  const batches: DateRange[] = [];
  const totalDays = differenceInDays(endDate, startDate);

  if (totalDays <= maxDays) {
    return [{ start: startDate, end: endDate }];
  }

  let currentStart = startDate;
  while (currentStart < endDate) {
    const currentEnd = new Date(
      Math.min(
        addDays(currentStart, maxDays - 1).getTime(),
        endDate.getTime()
      )
    );
    batches.push({ start: currentStart, end: currentEnd });
    currentStart = addDays(currentEnd, 1);
  }

  return batches;
}

/**
 * Get monthly date ranges for historical sync
 */
export function getMonthlyDateRanges(monthsBack: number): DateRange[] {
  const ranges: DateRange[] = [];
  const now = new Date();

  for (let i = 0; i < monthsBack; i++) {
    const monthDate = subMonths(now, i);
    ranges.push({
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
    });
  }

  return ranges.reverse(); // Oldest first
}

/**
 * Update integration sync status in database
 */
export async function updateIntegrationSyncStatus(
  integrationId: string,
  status: "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED",
  error?: string
): Promise<void> {
  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      lastSyncAt: new Date(),
      lastSyncStatus: status,
      lastSyncError: error ?? null,
    },
  });
}

/**
 * Update integration status health metrics
 */
export async function updateIntegrationStatusHealth(
  service: string,
  organizationId: string,
  success: boolean,
  error?: { message: string; code?: string }
): Promise<void> {
  const existing = await prisma.integrationStatus.findUnique({
    where: {
      service_organizationId: {
        service: service as never,
        organizationId,
      },
    },
  });

  if (existing) {
    await prisma.integrationStatus.update({
      where: { id: existing.id },
      data: {
        status: success ? "HEALTHY" : "DEGRADED",
        lastSuccessAt: success ? new Date() : undefined,
        lastErrorAt: !success ? new Date() : undefined,
        lastErrorMessage: error?.message ?? null,
        lastErrorCode: error?.code ?? null,
        consecutiveFailures: success ? 0 : existing.consecutiveFailures + 1,
        lastSyncAt: new Date(),
      },
    });
  } else {
    await prisma.integrationStatus.create({
      data: {
        service: service as never,
        organizationId,
        status: success ? "HEALTHY" : "DEGRADED",
        lastSuccessAt: success ? new Date() : null,
        lastErrorAt: !success ? new Date() : null,
        lastErrorMessage: error?.message ?? null,
        lastErrorCode: error?.code ?? null,
        consecutiveFailures: success ? 0 : 1,
        lastSyncAt: new Date(),
      },
    });
  }
}

/**
 * Check if integration should use circuit breaker (too many failures)
 */
export async function shouldBreakCircuit(
  service: string,
  organizationId: string,
  maxFailures: number = 5
): Promise<boolean> {
  const status = await prisma.integrationStatus.findUnique({
    where: {
      service_organizationId: {
        service: service as never,
        organizationId,
      },
    },
  });

  if (!status) return false;

  // Circuit is open if too many consecutive failures
  if (status.consecutiveFailures >= maxFailures) {
    // Check if circuit should reset (after 5 minutes)
    if (status.lastErrorAt) {
      const timeSinceError = Date.now() - status.lastErrorAt.getTime();
      if (timeSinceError > 5 * 60 * 1000) {
        // Reset circuit breaker
        await prisma.integrationStatus.update({
          where: { id: status.id },
          data: {
            circuitState: "HALF_OPEN",
            consecutiveFailures: 0,
          },
        });
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Calculate sync progress percentage
 */
export function calculateProgress(
  completedBatches: number,
  totalBatches: number,
  dataTypes: number,
  completedDataTypes: number
): number {
  if (totalBatches === 0) return 100;

  const batchProgress = (completedBatches / totalBatches) * 100;
  const typeProgress = dataTypes > 1 ? (completedDataTypes / dataTypes) * 100 : 100;

  // Weight batch progress more heavily (70/30)
  return Math.round((batchProgress * 0.7 + typeProgress * 0.3) * 10) / 10;
}
