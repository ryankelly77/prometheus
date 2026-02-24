/**
 * R365 API endpoint definitions
 */

/**
 * R365 OData base URL
 */
export const R365_ODATA_BASE_URL = "https://odata.restaurant365.net/api/v2/views";

/**
 * R365 API endpoints
 */
export const R365_ENDPOINTS = {
  // OData Views
  odata: {
    metadata: `${R365_ODATA_BASE_URL}/$metadata`,
    laborDetail: `${R365_ODATA_BASE_URL}/LaborDetail`,
    employee: `${R365_ODATA_BASE_URL}/Employee`,
    jobTitle: `${R365_ODATA_BASE_URL}/JobTitle`,
    posEmployee: `${R365_ODATA_BASE_URL}/POSEmployee`,
    salesEmployee: `${R365_ODATA_BASE_URL}/SalesEmployee`,
    location: `${R365_ODATA_BASE_URL}/Location`,
    company: `${R365_ODATA_BASE_URL}/Company`,
    glAccount: `${R365_ODATA_BASE_URL}/GLAccount`,
    transaction: `${R365_ODATA_BASE_URL}/Transaction`,
    transactionDetail: `${R365_ODATA_BASE_URL}/TransactionDetail`,
  },

  // REST API (relative paths, prepend customer URL)
  rest: {
    authenticate: "/APIv1/Authenticate/JWT",
    apInvoice: "/APIv1/APInvoice",
    journalEntry: "/APIv1/JournalEntry",
  },
} as const;

/**
 * Build OData query URL with filters
 */
export function buildODataQuery(
  endpoint: string,
  options: {
    filter?: string;
    select?: string[];
    expand?: string[];
    orderBy?: string;
    top?: number;
    skip?: number;
  }
): string {
  const params = new URLSearchParams();

  if (options.filter) {
    params.set("$filter", options.filter);
  }
  if (options.select?.length) {
    params.set("$select", options.select.join(","));
  }
  if (options.expand?.length) {
    params.set("$expand", options.expand.join(","));
  }
  if (options.orderBy) {
    params.set("$orderby", options.orderBy);
  }
  if (options.top !== undefined) {
    params.set("$top", options.top.toString());
  }
  if (options.skip !== undefined) {
    params.set("$skip", options.skip.toString());
  }

  const queryString = params.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
}

/**
 * Build date filter for OData
 * Uses ISO date format: YYYY-MM-DD
 */
export function buildDateFilter(
  fieldName: string,
  startDate: Date,
  endDate: Date
): string {
  const start = startDate.toISOString().split("T")[0];
  const end = endDate.toISOString().split("T")[0];
  return `${fieldName} ge ${start} and ${fieldName} le ${end}`;
}

/**
 * Build location filter for OData
 */
export function buildLocationFilter(
  fieldName: string,
  locationIds: string[]
): string {
  if (locationIds.length === 0) return "";
  if (locationIds.length === 1) {
    return `${fieldName} eq '${locationIds[0]}'`;
  }
  // Multiple locations: location_Id eq 'id1' or location_Id eq 'id2'
  return locationIds.map((id) => `${fieldName} eq '${id}'`).join(" or ");
}

/**
 * Combine multiple filters with 'and'
 */
export function combineFilters(...filters: (string | undefined)[]): string {
  return filters.filter(Boolean).join(" and ");
}

/**
 * Default fields to select for labor detail queries
 */
export const LABOR_DETAIL_SELECT_FIELDS = [
  "id",
  "dateWorked",
  "employee_Id",
  "jobTitle_Id",
  "location_Id",
  "scheduledHours",
  "hours",
  "overtimeHours",
  "regularHours",
  "laborCost",
  "regularPay",
  "overtimePay",
  "tips",
];

/**
 * Default expand for labor detail to get job title names
 */
export const LABOR_DETAIL_EXPAND = ["JobTitle", "Location"];

/**
 * Default fields to select for employee queries
 */
export const EMPLOYEE_SELECT_FIELDS = [
  "id",
  "firstName",
  "lastName",
  "displayName",
  "employeeNumber",
  "isActive",
  "defaultJobTitle_Id",
  "defaultLocation_Id",
];

/**
 * Default fields for job title queries
 */
export const JOB_TITLE_SELECT_FIELDS = ["id", "name", "code", "laborType", "isActive"];

/**
 * Default fields for location queries
 */
export const LOCATION_SELECT_FIELDS = [
  "id",
  "name",
  "code",
  "address",
  "city",
  "state",
  "zipCode",
  "isActive",
];

/**
 * Batch size for paginated queries
 */
export const DEFAULT_BATCH_SIZE = 500;

/**
 * Maximum days per query (R365 limit)
 */
export const MAX_DAYS_PER_QUERY = 31;
