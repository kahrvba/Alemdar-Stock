export function normalizeImageFilename(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/assets/')) return trimmed;
  if (trimmed.startsWith('assets/')) return `/${trimmed}`;
  if (trimmed.startsWith('/opt/assets/')) return `/assets/${trimmed.slice('/opt/assets/'.length)}`;

  try {
    const url = new URL(trimmed);
    if (url.hostname.endsWith('.public.blob.vercel-storage.com')) {
      return `/assets${url.pathname}`;
    }
  } catch {
    // Not a URL; keep relative path inputs as-is.
  }

  return trimmed;
}
