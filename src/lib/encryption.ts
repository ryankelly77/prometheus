import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required for token encryption"
    );
  }
  return key;
}

/**
 * Encrypts sensitive data (e.g., OAuth tokens) using AES-256-GCM.
 * Returns a base64 string containing: salt + iv + authTag + ciphertext
 */
export async function encrypt(plaintext: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  // Derive key from password using scrypt
  const key = (await scryptAsync(getEncryptionKey(), salt, KEY_LENGTH)) as Buffer;

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Combine: salt (32) + iv (16) + authTag (16) + ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypts data encrypted with the encrypt() function.
 * Expects a base64 string containing: salt + iv + authTag + ciphertext
 */
export async function decrypt(encryptedBase64: string): Promise<string> {
  const combined = Buffer.from(encryptedBase64, "base64");

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const ciphertext = combined.subarray(
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );

  // Derive key from password using scrypt
  const key = (await scryptAsync(getEncryptionKey(), salt, KEY_LENGTH)) as Buffer;

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Encrypts an OAuth token object (access_token, refresh_token, etc.)
 * Returns encrypted JSON string.
 */
export async function encryptTokens(tokens: {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}): Promise<string> {
  return encrypt(JSON.stringify(tokens));
}

/**
 * Decrypts an OAuth token object.
 */
export async function decryptTokens(encryptedTokens: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}> {
  const json = await decrypt(encryptedTokens);
  const parsed = JSON.parse(json);

  // Convert expiresAt back to Date if present
  if (parsed.expiresAt) {
    parsed.expiresAt = new Date(parsed.expiresAt);
  }

  return parsed;
}
