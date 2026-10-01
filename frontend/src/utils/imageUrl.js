/**
 * Resolves an image URL safely.
 * Supports ImageKit permanent URLs, data URLs, and legacy local /uploads/ paths.
 */
export const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/uploads/')) {
    const apiUrl = import.meta.env?.VITE_API_URL || '';
    if (apiUrl.startsWith('http')) {
      try {
        const origin = new URL(apiUrl).origin;
        return `${origin}${url}`;
      } catch {
        return url;
      }
    }
    if (typeof window !== 'undefined' && window.location.port === '5173') {
      return `http://localhost:5000${url}`;
    }
  }
  return url;
};
