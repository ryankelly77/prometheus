/**
 * R365 Authentication handler
 */

import prisma from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import type { R365AuthResponse, R365IntegrationConfig } from "./types";

// Re-export async encrypt/decrypt for proper typing
const encryptAsync = encrypt;
const decryptAsync = decrypt;

/**
 * R365 authentication credentials
 */
interface R365Credentials {
  customerUrl: string;
  username: string;
  password: string;
}

/**
 * Stored token info
 */
interface R365TokenInfo {
  bearerToken: string;
  sessionId: string;
  obtainedAt: Date;
}

/**
 * Token cache (in-memory, per integration)
 */
const tokenCache = new Map<string, R365TokenInfo>();

/**
 * Token validity duration (assume 23 hours to be safe)
 */
const TOKEN_VALIDITY_MS = 23 * 60 * 60 * 1000;

/**
 * Authenticate with R365 and get bearer token
 */
export async function authenticateR365(
  credentials: R365Credentials
): Promise<R365AuthResponse> {
  const authUrl = `https://${credentials.customerUrl}/APIv1/Authenticate/JWT?format=json`;

  const response = await fetch(authUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: credentials.username,
      password: credentials.password,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`R365 authentication failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.BearerToken) {
    throw new Error("R365 authentication response missing BearerToken");
  }

  return data as R365AuthResponse;
}

/**
 * Get or refresh bearer token for an integration
 */
export async function getR365BearerToken(integrationId: string): Promise<string> {
  // Check cache first
  const cached = tokenCache.get(integrationId);
  if (cached && Date.now() - cached.obtainedAt.getTime() < TOKEN_VALIDITY_MS) {
    return cached.bearerToken;
  }

  // Get integration from database
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: {
      id: true,
      accessToken: true,
      config: true,
    },
  });

  if (!integration) {
    throw new Error(`Integration not found: ${integrationId}`);
  }

  // Decrypt stored credentials
  const config = integration.config as unknown as R365IntegrationConfig;
  if (!config?.customerUrl) {
    throw new Error("R365 integration missing customerUrl in config");
  }

  if (!integration.accessToken) {
    throw new Error("R365 integration missing credentials");
  }

  // Decrypt the stored credentials (we store encrypted password in accessToken)
  const decrypted = await decryptAsync(integration.accessToken);
  const credentials: { username: string; password: string } = JSON.parse(decrypted);

  // Authenticate to get fresh token
  const authResponse = await authenticateR365({
    customerUrl: config.customerUrl,
    username: credentials.username,
    password: credentials.password,
  });

  // Cache the token
  tokenCache.set(integrationId, {
    bearerToken: authResponse.BearerToken,
    sessionId: authResponse.SessionId,
    obtainedAt: new Date(),
  });

  return authResponse.BearerToken;
}

/**
 * Store R365 credentials for an integration
 * Encrypts and stores username/password
 */
export async function storeR365Credentials(
  integrationId: string,
  credentials: R365Credentials
): Promise<void> {
  // Encrypt credentials
  const encrypted = await encryptAsync(
    JSON.stringify({
      username: credentials.username,
      password: credentials.password,
    })
  );

  // Get existing config or create new
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: { config: true },
  });

  const existingConfig = (integration?.config as unknown as R365IntegrationConfig) ?? {};

  // Update integration with encrypted credentials and config
  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      accessToken: encrypted,
      config: {
        ...existingConfig,
        customerUrl: credentials.customerUrl,
      },
      status: "PENDING",
    },
  });

  // Clear any cached token
  tokenCache.delete(integrationId);
}

/**
 * Verify R365 credentials are valid
 */
export async function verifyR365Credentials(
  credentials: R365Credentials
): Promise<{ valid: boolean; error?: string }> {
  try {
    const authResponse = await authenticateR365(credentials);
    return { valid: !!authResponse.BearerToken };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

/**
 * Revoke/clear R365 credentials
 */
export async function revokeR365Credentials(integrationId: string): Promise<void> {
  // Clear cache
  tokenCache.delete(integrationId);

  // Update integration to disconnected
  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      accessToken: null,
      refreshToken: null,
      status: "DISCONNECTED",
      connectedAt: null,
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
    },
  });
}

/**
 * Get R365 config from integration
 */
export async function getR365Config(
  integrationId: string
): Promise<R365IntegrationConfig | null> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: { config: true },
  });

  return (integration?.config as unknown as R365IntegrationConfig) ?? null;
}

/**
 * Update R365 config
 */
export async function updateR365Config(
  integrationId: string,
  updates: Partial<R365IntegrationConfig>
): Promise<void> {
  const existing = await getR365Config(integrationId);
  const newConfig: R365IntegrationConfig = {
    customerUrl: updates.customerUrl ?? existing?.customerUrl ?? "",
    locationMappings: updates.locationMappings ?? existing?.locationMappings ?? {},
    syncPreferences: updates.syncPreferences ?? existing?.syncPreferences,
    lastFullSync: updates.lastFullSync ?? existing?.lastFullSync,
  };

  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      config: newConfig as never,
    },
  });
}
