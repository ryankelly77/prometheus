/**
 * Color utilities for white-label branding.
 * Handles hex color validation, normalization, and HSL conversion.
 */

/**
 * Validates if a string is a valid hex color (3, 4, 6, or 8 characters).
 * Accepts with or without leading #.
 */
export function isValidHex(hex: string): boolean {
  const cleaned = hex.replace(/^#/, "");
  return /^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(
    cleaned
  );
}

/**
 * Normalizes a hex color to 6-character format with leading #.
 * Expands 3-character hex to 6-character.
 * Returns null if invalid.
 */
export function normalizeHex(hex: string): string | null {
  if (!isValidHex(hex)) {
    return null;
  }

  let cleaned = hex.replace(/^#/, "").toLowerCase();

  // Expand 3-char to 6-char (ignore alpha for now)
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split("")
      .map((c) => c + c)
      .join("");
  } else if (cleaned.length === 4) {
    // 4-char with alpha -> expand to 6-char (drop alpha)
    cleaned = cleaned
      .slice(0, 3)
      .split("")
      .map((c) => c + c)
      .join("");
  } else if (cleaned.length === 8) {
    // 8-char with alpha -> take first 6
    cleaned = cleaned.slice(0, 6);
  }

  return `#${cleaned}`;
}

/**
 * Converts a hex color to HSL values.
 * Returns { h, s, l } where h is 0-360, s and l are 0-100.
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return null;
  }

  // Parse RGB values
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    // Achromatic
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
    default:
      h = 0;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Converts hex to CSS HSL string format used by Tailwind/shadcn.
 * Returns format: "h s% l%" (e.g., "239 84% 67%")
 */
export function hexToHslString(hex: string): string | null {
  const hsl = hexToHsl(hex);
  if (!hsl) {
    return null;
  }
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/**
 * Converts HSL values to hex color.
 */
export function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generates a lighter/darker variant of a color.
 * Amount is -100 to 100 (negative = darker, positive = lighter)
 */
export function adjustLightness(hex: string, amount: number): string | null {
  const hsl = hexToHsl(hex);
  if (!hsl) {
    return null;
  }

  const newL = Math.max(0, Math.min(100, hsl.l + amount));
  return hslToHex(hsl.h, hsl.s, newL);
}

/**
 * Determines if a color is "light" (should use dark text) or "dark" (should use light text).
 * Uses relative luminance calculation.
 */
export function isLightColor(hex: string): boolean {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return false;
  }

  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  // Relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
