const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function getSafeExternalUrl(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  try {
    const url = new URL(trimmedValue);
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getExternalUrlLabel(value: string) {
  const safeUrl = getSafeExternalUrl(value);
  if (!safeUrl) return value.trim();

  const url = new URL(safeUrl);
  const path = url.pathname === "/" ? "" : url.pathname;
  return `${url.host}${path}${url.search}${url.hash}`;
}
