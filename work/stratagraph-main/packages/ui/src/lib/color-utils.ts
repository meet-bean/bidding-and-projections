/**
 * Color utility functions shared across UI components.
 */

/**
 * Determines if a hex background color is light and needs dark text.
 * Handles both 3-character and 6-character hex, with or without '#'.
 */
export function isLightColor(hexColor: string): boolean {
  const c = hexColor.replace(/^#/, '');
  // Handle shorthand hex (e.g., `#fff` -> `ffffff`)
  const fullHex =
    c.length === 3
      ? c
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : c;
  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) {
    return true; // Default to dark text on invalid input
  }
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
