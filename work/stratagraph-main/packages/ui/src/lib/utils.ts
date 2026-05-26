import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export * from './slot';
export * from './render-as-child';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format file size in human-readable format.
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  // Handle zero, negative, and NaN inputs
  if (bytes <= 0 || !Number.isFinite(bytes)) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const value = bytes / Math.pow(k, i);

  // Use integer for bytes, 1 decimal for larger units (strip trailing .0)
  if (i === 0) return `${value} ${sizes[i]}`;
  const formatted = value.toFixed(1);
  // Remove trailing .0 for cleaner output (e.g., "2 KB" instead of "2.0 KB")
  const clean = formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted;
  return `${clean} ${sizes[i]}`;
}

/**
 * Check if a MIME type represents an image.
 */
export function isImageType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Check if a MIME type represents a video.
 */
export function isVideoType(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}
