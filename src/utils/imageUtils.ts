import { Platform } from 'react-native';

/**
 * The backend stores image URLs with the origin it sees at upload time
 * (e.g. http://localhost:3000/uploads/...). On Android the LAN IP must be
 * used instead. This helper swaps the stored origin for the platform-correct one.
 */
const BACKEND_ORIGIN =
  Platform.OS === 'android'
    ? 'http://192.168.1.195:3000'
    : 'http://localhost:3000';

export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${BACKEND_ORIGIN}${parsed.pathname}`;
  } catch {
    // Already a relative path – just prepend the origin
    return `${BACKEND_ORIGIN}/${url.replace(/^\//, '')}`;
  }
}
