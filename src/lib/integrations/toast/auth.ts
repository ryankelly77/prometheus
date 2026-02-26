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

// In-memory token cache
const tokenCache = new Map<
  string,
  {
    accessToken: string;
    expiresAt: Date;
  }
>();

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

  // Clear cached token
  tokenCache.delete(integrationId);
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
 */
export async function getToastBearerToken(integrationId: string): Promise<string> {
  // Check cache first
  const cached = tokenCache.get(integrationId);
  if (cached && cached.expiresAt > new Date(Date.now() + 60000)) {
    // Token valid for at least 1 more minute
    return cached.accessToken;
  }

  // Get credentials and authenticate
  const credentials = await getToastCredentials(integrationId);
  if (!credentials) {
    throw new Error("Toast credentials not found");
  }

  const authResult = await authenticateToast(credentials);
  if (!authResult.valid || !authResult.accessToken) {
    throw new Error(authResult.error ?? "Toast authentication failed");
  }

  // Cache the token
  tokenCache.set(integrationId, {
    accessToken: authResult.accessToken,
    expiresAt: authResult.expiresAt!,
  });

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
  // Clear cached token
  tokenCache.delete(integrationId);

  // Update integration status and clear credentials
  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      status: "DISCONNECTED",
      apiKey: null,
      apiSecret: null,
      accessToken: null,
    },
  });
}
