"use client";

type CacheEntry = {
  value?: unknown;
  expiresAt: number;
  promise?: Promise<unknown>;
};

type GetCachedValueOptions = {
  forceRefresh?: boolean;
};

const clientCache = new Map<string, CacheEntry>();

export async function getCachedValue<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number,
  options?: GetCachedValueOptions
): Promise<T> {
  const forceRefresh = options?.forceRefresh ?? false;
  const now = Date.now();
  const existingEntry = clientCache.get(key);

  if (!forceRefresh && existingEntry) {
    if (existingEntry.value !== undefined && existingEntry.expiresAt > now) {
      return existingEntry.value as T;
    }

    if (existingEntry.promise) {
      return existingEntry.promise as Promise<T>;
    }
  }

  const loadPromise = loader()
    .then((value) => {
      clientCache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      return value;
    })
    .catch((error) => {
      const currentEntry = clientCache.get(key);
      if (currentEntry?.promise === loadPromise) {
        clientCache.delete(key);
      }
      throw error;
    });

  clientCache.set(key, {
    value: existingEntry?.value,
    expiresAt: existingEntry?.expiresAt ?? 0,
    promise: loadPromise,
  });

  return loadPromise;
}

export function invalidateClientCache(key: string) {
  clientCache.delete(key);
}

export function invalidateClientCacheByPrefix(prefix: string) {
  for (const key of clientCache.keys()) {
    if (key.startsWith(prefix)) {
      clientCache.delete(key);
    }
  }
}

export function clearClientCache() {
  clientCache.clear();
}
