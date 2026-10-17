/** Use the frontend's proxy by default, including when opened from a phone. */
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

/** Repair legacy localhost media URLs without changing third-party images. */
export function resolveMediaUrl(value: string): string {
  try {
    const url = new URL(value, window.location.origin);
    const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((isLoopback || value.startsWith('/media/')) && url.pathname.startsWith('/media/')) {
      const api = new URL(API_BASE_URL, window.location.origin);
      const prefix = api.pathname.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
      return `${api.origin}${prefix}${url.pathname}${url.search}${url.hash}`;
    }
    return /^https?:$/.test(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}
