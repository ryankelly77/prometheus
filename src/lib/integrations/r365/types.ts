/**
 * R365-specific types
 */

/**
 * R365 Authentication response
 */
export interface R365AuthResponse {
  SessionId: string;
  UserName: string;
  BearerToken: string;
}

/**
 * R365 OData response wrapper
 */
export interface R365ODataResponse<T> {
  "@odata.context"?: string;
  "@odata.nextLink"?: string;
  "@odata.count"?: number;
  value: T[];
}

/**
 * R365 Labor Detail record from OData
 */
export interface R365LaborDetail {
  id: string;
  dateWorked: string; // ISO date
  employee_Id: string;
  jobTitle_Id?: string;
  location_Id?: string;
  scheduledHours?: number;
  hours: number; // Actual hours worked
  overtimeHours?: number;
  regularHours?: number;
  doubleTimeHours?: number;
  laborCost: number;
  regularPay?: number;
  overtimePay?: number;
  doubleTimePay?: number;
  tips?: number;
  // Expanded relations
  Employee?: R365Employee;
  JobTitle?: R365JobTitle;
  Location?: R365Location;
}

/**
 * R365 Employee record
 */
export interface R365Employee {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  employeeNumber?: string;
  isActive?: boolean;
  hireDate?: string;
  terminationDate?: string;
  defaultJobTitle_Id?: string;
  defaultLocation_Id?: string;
}

/**
 * R365 Job Title record
 */
export interface R365JobTitle {
  id: string;
  name: string;
  code?: string;
  laborType?: string; // May help identify FOH/BOH
  isActive?: boolean;
}

/**
 * R365 Location record
 */
export interface R365Location {
  id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isActive?: boolean;
  company_Id?: string;
}

/**
 * R365 Transaction record
 */
export interface R365Transaction {
  id: string;
  transactionDate: string;
  transactionType: string;
  location_Id?: string;
  vendor_Id?: string;
  amount: number;
  description?: string;
  referenceNumber?: string;
  postedDate?: string;
  isPosted?: boolean;
  glAccount_Id?: string;
}

/**
 * R365 Transaction Detail record
 */
export interface R365TransactionDetail {
  id: string;
  transaction_Id: string;
  lineNumber?: number;
  amount: number;
  quantity?: number;
  unitCost?: number;
  description?: string;
  glAccount_Id?: string;
  item_Id?: string;
  category_Id?: string;
}

/**
 * R365 GL Account record
 */
export interface R365GLAccount {
  id: string;
  accountNumber: string;
  name: string;
  accountType?: string;
  isActive?: boolean;
  parentAccount_Id?: string;
}

/**
 * R365 Sales Summary record
 */
export interface R365SalesSummary {
  id: string;
  date: string;
  location_Id: string;
  grossSales?: number;
  netSales?: number;
  discounts?: number;
  comps?: number;
  voids?: number;
  refunds?: number;
  tax?: number;
  tips?: number;
  checkCount?: number;
  guestCount?: number;
}

/**
 * R365 POS Employee record (for time worked via POS)
 */
export interface R365POSEmployee {
  id: string;
  employee_Id?: string;
  posEmployeeId?: string;
  firstName?: string;
  lastName?: string;
  location_Id?: string;
}

/**
 * R365 Sales Employee (sales attributed to employees)
 */
export interface R365SalesEmployee {
  id: string;
  date: string;
  employee_Id?: string;
  location_Id?: string;
  netSales?: number;
  checkCount?: number;
  guestCount?: number;
  tips?: number;
  salesCategory?: string;
}

/**
 * R365 config stored in Integration.config
 */
export interface R365IntegrationConfig {
  customerUrl: string; // e.g., "acme.restaurant365.com"
  locationMappings: Record<string, string>; // r365LocationId → prometheusLocationId
  username?: string; // Stored separately from password
  lastFullSync?: string; // ISO date of last full historical sync
  syncPreferences?: {
    autoSync: boolean;
    syncTime?: string; // e.g., "06:00" for 6 AM
    dataTypes: string[]; // ['labor', 'sales', 'transactions']
  };
}

/**
 * R365 connection status check response
 */
export interface R365ConnectionStatus {
  isConnected: boolean;
  customerUrl?: string;
  lastSyncAt?: Date;
  lastSyncStatus?: string;
  mappedLocations: number;
  unmappedLocations: number;
  errors?: string[];
}

/**
 * R365 sync options
 */
export interface R365SyncOptions {
  startDate?: Date;
  endDate?: Date;
  fullSync?: boolean; // Pull 12 months
  dataTypes?: Array<"labor" | "sales" | "transactions" | "invoices">;
  locationIds?: string[]; // Specific locations to sync
}

/**
 * R365 data type for sync
 */
export type R365DataType = "labor" | "sales" | "transactions" | "invoices";

/**
 * BOH position keywords for categorization
 */
export const BOH_POSITION_KEYWORDS = [
  "cook",
  "chef",
  "prep",
  "dish",
  "kitchen",
  "line",
  "grill",
  "fry",
  "pantry",
  "garde",
  "sous",
  "expo",
  "pastry",
  "baker",
  "butcher",
  "steward",
];

/**
 * Check if a position is BOH based on title
 */
export function isBackOfHouse(jobTitle: string): boolean {
  const titleLower = jobTitle.toLowerCase();
  return BOH_POSITION_KEYWORDS.some((keyword) => titleLower.includes(keyword));
}
