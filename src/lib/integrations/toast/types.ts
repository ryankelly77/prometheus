/**
 * Toast POS Integration Types
 */

// Authentication
export interface ToastCredentials {
  clientId: string;
  clientSecret: string;
  restaurantGuid: string;
}

export interface ToastAuthResponse {
  token: {
    tokenType: string;
    scope: string;
    expiresIn: number;
    accessToken: string;
  };
  status: "SUCCESS" | "FAILURE";
}

export interface ToastAuthResult {
  valid: boolean;
  accessToken?: string;
  expiresAt?: Date;
  error?: string;
}

// Integration config stored in database
export interface ToastIntegrationConfig {
  restaurantGuid: string;
  restaurantName?: string;
  timezone?: string;
  locationMappings: Record<string, string>; // Toast GUID -> Prometheus location ID
  lastFullSync?: string;
  syncEnabled?: boolean;
  // GUID → Name mappings for order data
  salesCategories?: Record<string, string>; // GUID → "Food", "Beer", "Wine", etc.
  restaurantServices?: Record<string, string>; // GUID → "Lunch", "Dinner", etc.
  revenueCenters?: Record<string, string>; // GUID → "Main Dining", "Bar", etc.
}

// Toast Configuration API types
export interface ToastSalesCategory {
  guid: string;
  name: string;
  behavior?: string;
}

export interface ToastRestaurantService {
  guid: string;
  name: string;
  servicePeriod?: {
    startTime: string;
    endTime: string;
  };
}

export interface ToastRevenueCenter {
  guid: string;
  name: string;
  description?: string;
}

// Restaurant
export interface ToastRestaurant {
  guid: string;
  managementGroupGuid?: string;
  location?: {
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  general?: {
    name: string;
    timeZone?: string;
  };
}

// Orders
export interface ToastOrder {
  guid: string;
  entityType: "Order";
  externalId?: string;
  openedDate: string;
  closedDate?: string;
  businessDate: number; // YYYYMMDD format
  server?: ToastEmployee;
  checks: ToastCheck[];
  diningOption?: {
    guid: string;
    entityType: "DiningOption";
    name: string;
  };
  table?: {
    guid: string;
    entityType: "RestaurantTable";
    name: string;
  };
  // Service period/daypart from Toast (e.g., "Lunch", "Dinner", "Brunch")
  // This is the primary field for daypart - GUID must be looked up in config.restaurantServices
  restaurantService?: {
    guid: string;
    entityType?: "RestaurantService";
  };
  // Revenue center (may also indicate service period)
  revenueCenter?: {
    guid: string;
    name?: string;
  };
  // Alternative service area field
  serviceArea?: {
    guid: string;
    name?: string;
  };
  // Shift reference (may contain daypart info)
  shift?: {
    guid: string;
    name?: string;
  };
  voidDate?: string;
  voided?: boolean;
  deleted?: boolean;
}

export interface ToastCheck {
  guid: string;
  entityType: "Check";
  displayNumber?: string;
  amount: number; // Subtotal before tax/discounts
  totalAmount: number; // Total after everything
  taxAmount: number;
  // Net sales = amount - discounts (no tax)
  netAmount?: number;
  // Voided check flag
  voided?: boolean;
  // Discount breakdown
  appliedDiscounts?: Array<{
    guid: string;
    name?: string;
    amount: number;
    discountType?: string;
  }>;
  // Service charges (may include auto-grat)
  appliedServiceCharges?: Array<{
    guid: string;
    name?: string;
    amount: number;
  }>;
  selections: ToastSelection[];
  payments: ToastPayment[];
  voidDate?: string;
  deleted?: boolean;
}

export interface ToastSelection {
  guid: string;
  entityType: "MenuItemSelection";
  item?: {
    guid: string;
    entityType: "MenuItem";
    name: string;
  };
  quantity: number;
  unitOfMeasure?: string;
  price: number;
  preDiscountPrice?: number;
  modifiers?: ToastModifier[];
  voidDate?: string;
  voided?: boolean;
  // Sales category from Toast (e.g., "Food", "Beer", "Wine", "Liquor", "Non-Alcohol")
  salesCategory?: {
    guid: string;
    name: string;
  };
  // Alternative field name
  itemGroup?: {
    guid: string;
    name: string;
  };
  // Net price after discounts
  netPrice?: number;
  // Discount amount
  discountAmount?: number;
}

export interface ToastModifier {
  guid: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ToastPayment {
  guid: string;
  entityType: "Payment";
  paidDate: string;
  type: "CASH" | "CREDIT" | "GIFTCARD" | "HOUSE_ACCOUNT" | "OTHER";
  amount: number;
  tipAmount: number;
  refundAmount?: number;
  // Additional refund-related fields to investigate
  refundStatus?: string; // Could be 'FULL', 'PARTIAL', 'NONE', etc.
  refund?: {
    refundAmount?: number;
    refundDate?: string;
    refundTransaction?: unknown;
  };
  originalPaymentGuid?: string; // For tracking refund payments
  voidInfo?: {
    voidDate?: string;
    voidReason?: string;
    voidUser?: unknown;
  };
}

export interface ToastOrdersResponse {
  orders: ToastOrder[];
  nextPageToken?: string;
}

// Labor
export interface ToastTimeEntry {
  guid: string;
  employeeGuid: string;
  jobGuid: string;
  jobCode?: string;
  jobTitle: string;
  inDate: string;
  outDate?: string;
  businessDate: number; // YYYYMMDD format
  regularHours: number;
  overtimeHours: number;
  hourlyWage: number;
  totalWages: number;
  deleted?: boolean;
}

export interface ToastTimeEntriesResponse {
  timeEntries: ToastTimeEntry[];
  nextPageToken?: string;
}

export interface ToastEmployee {
  guid: string;
  entityType: "Employee" | "RestaurantUser";
  firstName?: string;
  lastName?: string;
  email?: string;
  jobs?: ToastJob[];
}

export interface ToastJob {
  guid: string;
  code: string;
  title: string;
  wage?: number;
  wageType?: "HOURLY" | "SALARY";
}

export interface ToastEmployeesResponse {
  employees: ToastEmployee[];
  nextPageToken?: string;
}

// Menus
export interface ToastMenu {
  guid: string;
  name: string;
  groups: ToastMenuGroup[];
}

export interface ToastMenuGroup {
  guid: string;
  name: string;
  items: ToastMenuItem[];
}

export interface ToastMenuItem {
  guid: string;
  name: string;
  price: number;
  description?: string;
  plu?: string;
  sku?: string;
  visibility?: "POS_ONLY" | "ONLINE_ONLY" | "POS_AND_ONLINE" | "NONE";
  modifierGroups?: ToastModifierGroup[];
}

export interface ToastModifierGroup {
  guid: string;
  name: string;
  modifiers: ToastModifierItem[];
}

export interface ToastModifierItem {
  guid: string;
  name: string;
  price: number;
}

export interface ToastMenusResponse {
  menus: ToastMenu[];
}

// Sync types
export type ToastDataType = "orders" | "labor" | "menus";

export interface ToastSyncOptions {
  startDate?: Date;
  endDate?: Date;
  dataTypes?: ToastDataType[];
  fullSync?: boolean;
}

export interface ToastSyncResult {
  jobId: string;
  ordersProcessed?: number;
  laborEntriesProcessed?: number;
  menuItemsProcessed?: number;
  errors?: string[];
}
