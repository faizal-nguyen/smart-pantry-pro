type CacheEntry<T> = { value: T; expires: number };

export class TTLCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  constructor(private defaultTtlMs = 15 * 60 * 1000) {}

  get(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expires) {
      this.store.delete(key);
      return undefined;
    }
    return e.value;
  }

  set(key: string, value: T, ttlMs?: number) {
    const expires = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { value, expires });
  }
}

