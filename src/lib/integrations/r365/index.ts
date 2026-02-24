/**
 * R365 Integration - Main exports
 */

// Types
export type {
  R365AuthResponse,
  R365ODataResponse,
  R365LaborDetail,
  R365Employee,
  R365JobTitle,
  R365Location,
  R365Transaction,
  R365TransactionDetail,
  R365GLAccount,
  R365SalesSummary,
  R365POSEmployee,
  R365SalesEmployee,
  R365IntegrationConfig,
  R365ConnectionStatus,
  R365SyncOptions,
  R365DataType,
} from "./types";

export { BOH_POSITION_KEYWORDS, isBackOfHouse } from "./types";

// Authentication
export {
  authenticateR365,
  getR365BearerToken,
  storeR365Credentials,
  verifyR365Credentials,
  revokeR365Credentials,
  getR365Config,
  updateR365Config,
} from "./auth";

// Client
export { R365Client, createR365Client } from "./client";

// Endpoints
export {
  R365_ODATA_BASE_URL,
  R365_ENDPOINTS,
  buildODataQuery,
  buildDateFilter,
  buildLocationFilter,
  combineFilters,
  DEFAULT_BATCH_SIZE,
  MAX_DAYS_PER_QUERY,
} from "./endpoints";

// Mappers
export {
  laborMapper,
  aggregateLaborByPosition,
  mapAggregatedLaborToLaborDetail,
  upsertLaborDetails,
  aggregateTransactionCosts,
  mapCostsToDailyMetrics,
  upsertDailyFoodCosts,
  mapSalesSummaryToTransactionSummary,
  mapSalesSummariesToTransactionSummaries,
  upsertTransactionSummaries,
} from "./mappers";

// Sync
export {
  syncR365Data,
  getR365SyncStatus,
  triggerIncrementalSync,
  triggerHistoricalSync,
} from "./sync";
