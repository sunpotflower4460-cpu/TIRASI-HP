const listeners = new Set<(ids: readonly string[]) => void>();
export function onAssetsStored(
  listener: (ids: readonly string[]) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function notifyAssetsStored(ids: readonly string[]): void {
  if (!ids.length) return;
  for (const listener of listeners) {
    try {
      listener(ids);
    } catch {
      /* A committed asset stays saved even if an optional view listener fails. */
    }
  }
}
