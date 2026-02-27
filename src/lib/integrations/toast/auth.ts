/**
 * Toast POS Authentication
 *
 * Handles OAuth 2.0 client credentials flow for Toast API access.
 */

import prisma from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import type {
  ToastCredentials,
  ToastAuthResponse,
  ToastAuthResult,
  ToastIntegrationConfig,
} from "./types";

const TOAST_API_URL = process.env.TOAST_API_URL ?? "https://ws-api.toasttab.com";
const TOAST_AUTH_URL = `${TOAST_API_URL}/authentication/v1/authentication/login`;

// Token cache - uses database for persistence across serverless invocations
// This is critical because Toast limits token requests to 2 per hour

/**
 * Authenticate with Toast API using client credentials
 */
export async function authenticateToast(
  credentials: ToastCredentials
): Promise<ToastAuthResult> {
  try {
    const response = await fetch(TOAST_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        userAccessType: "TOAST_MACHINE_CLIENT",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Toast auth failed:", response.status, errorText);
      return {
        valid: false,
        error: `Authentication failed: ${response.status}`,
      };
    }

    const data: ToastAuthResponse = await response.json();

    if (data.status !== "SUCCESS") {
      return {
        valid: false,
        error: "Authentication unsuccessful",
      };
    }

    const expiresAt = new Date(Date.now() + data.token.expiresIn * 1000);

    return {
      valid: true,
      accessToken: data.token.accessToken,
      expiresAt,
    };
  } catch (error) {
    console.error("Toast authentication error:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

/**
 * Verify Toast credentials by attempting authentication
 */
export async function verifyToastCredentials(credentials: {
  clientId: string;
  clientSecret: string;
  restaurantGuid: string;
}): Promise<{ valid: boolean; error?: string; restaurantName?: string }> {
  // First authenticate
  const authResult = await authenticateToast({
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    restaurantGuid: credentials.restaurantGuid,
  });

  if (!authResult.valid) {
    return { valid: false, error: authResult.error };
  }

  // Then verify restaurant access
  try {
    const response = await fetch(
      `${TOAST_API_URL}/restaurants/v1/restaurants/${credentials.restaurantGuid}`,
      {
        headers: {
          Authorization: `Bearer ${authResult.accessToken}`,
          "Toast-Restaurant-External-ID": credentials.restaurantGuid,
        },
      }
    );

    if (!response.ok) {
      return {
        valid: false,
        error: "Cannot access the specified restaurant",
      };
    }

    const restaurant = await response.json();

    return {
      valid: true,
      restaurantName: restaurant.general?.name,
    };
  } catch (error) {
    return {
      valid: false,
      error: "Failed to verify restaurant access",
    };
  }
}

/**
 * Store encrypted Toast credentials
 */
export async function storeToastCredentials(
  integrationId: string,
  credentials: ToastCredentials
): Promise<void> {
  const encryptedClientId = await encrypt(credentials.clientId);
  const encryptedClientSecret = await encrypt(credentials.clientSecret);

  // Get current config
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });

  const currentConfig = (integration?.config as unknown as ToastIntegrationConfig) ?? {};

  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      config: {
        ...currentConfig,
        restaurantGuid: credentials.restaurantGuid,
      },
      // Store encrypted credentials in apiKey/apiSecret fields
      apiKey: encryptedClientId,
      apiSecret: encryptedClientSecret,
    },
  });
}

/**
 * Get decrypted Toast credentials
 */
export async function getToastCredentials(
  integrationId: string
): Promise<ToastCredentials | null> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });

  if (!integration?.apiKey || !integration?.apiSecret) {
    return null;
  }

  const config = integration.config as unknown as ToastIntegrationConfig;

  try {
    const clientId = await decrypt(integration.apiKey);
    const clientSecret = await decrypt(integration.apiSecret);

    return {
      clientId,
      clientSecret,
      restaurantGuid: config.restaurantGuid,
    };
  } catch (error) {
    console.error("Failed to decrypt Toast credentials:", error);
    return null;
  }
}

/**
 * Get a valid bearer token for Toast API calls
 * Uses database-backed caching to persist across serverless invocations
 * Critical: Toast limits token requests to 2 per hour
 */
export async function getToastBearerToken(integrationId: string): Promise<string> {
  // Check database cache first
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: { accessToken: true, tokenExpiresAt: true },
  });

  // If we have a cached token that's valid for at least 5 more minutes, use it
  if (
    integration?.accessToken &&
    integration?.tokenExpiresAt &&
    new Date(integration.tokenExpiresAt) > new Date(Date.now() + 5 * 60 * 1000)
  ) {
    console.log("[Toast Auth] Using cached token from database");
    return integration.accessToken;
  }

  console.log("[Toast Auth] Token expired or missing, authenticating...");

  // Get credentials and authenticate
  const credentials = await getToastCredentials(integrationId);
  if (!credentials) {
    throw new Error("Toast credentials not found");
  }

  const authResult = await authenticateToast(credentials);
  if (!authResult.valid || !authResult.accessToken) {
    throw new Error(authResult.error ?? "Toast authentication failed");
  }

  // Store the token in database for persistence across invocations
  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      accessToken: authResult.accessToken,
      tokenExpiresAt: authResult.expiresAt,
    },
  });

  console.log("[Toast Auth] New token cached in database, expires:", authResult.expiresAt);
  return authResult.accessToken;
}

/**
 * Get Toast integration config
 */
export async function getToastConfig(
  integrationId: string
): Promise<ToastIntegrationConfig | null> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });

  if (!integration?.config) {
    return null;
  }

  return integration.config as unknown as ToastIntegrationConfig;
}

/**
 * Update Toast integration config
 */
export async function updateToastConfig(
  integrationId: string,
  updates: Partial<ToastIntegrationConfig>
): Promise<void> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });

  const currentConfig = (integration?.config as unknown as ToastIntegrationConfig) ?? {};

  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      config: {
        ...currentConfig,
        ...updates,
      },
    },
  });
}

/**
 * Revoke Toast credentials (disconnect)
 */
export async function revokeToastCredentials(integrationId: string): Promise<void> {
  // Update integration status and clear credentials
  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      status: "DISCONNECTED",
      apiKey: null,
      apiSecret: null,
      accessToken: null,
      tokenExpiresAt: null,
    },
  });
}
