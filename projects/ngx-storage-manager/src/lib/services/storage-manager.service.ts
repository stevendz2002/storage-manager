import { inject, Injectable } from '@angular/core';
import { LocalStorageAdapter } from '../adapters/local-storage.adapter';
import { CACHE_STORAGE_ADAPTER } from '../interfaces/cache-storage-adapter.token';
import type { StorageAdapter } from '../interfaces/storage-adapter.interface';
import type { StorageBackend } from '../interfaces/storage-backend.type';

/**
 * Typed asynchronous facade over the library's storage adapters.
 * LocalStorage is available by default. Cache Storage requires registration
 * through CACHE_STORAGE_ADAPTER by the cache module.
 */
@Injectable({ providedIn: 'root' })
export class StorageManagerService {
  private readonly local = inject(LocalStorageAdapter);
  private readonly cache = inject(CACHE_STORAGE_ADAPTER, { optional: true });

  /** Store or replace a JSON value in the selected backend. */
  async set<T>(backend: StorageBackend, key: string, value: T): Promise<void> {
    return this.adapter(backend).set(key, value);
  }

  /** Retrieve a value, or null when absent. T is not a runtime validator. */
  async get<T>(backend: StorageBackend, key: string): Promise<T | null> {
    return this.adapter(backend).get<T>(key);
  }

  /** Remove a key from the selected backend. */
  async remove(backend: StorageBackend, key: string): Promise<void> {
    return this.adapter(backend).remove(key);
  }

  /** Check key existence in the selected backend. */
  async has(backend: StorageBackend, key: string): Promise<boolean> {
    return this.adapter(backend).has(key);
  }

  /** Delete only the selected backend's data owned by this library. */
  async clear(backend: StorageBackend): Promise<void> {
    return this.adapter(backend).clear();
  }

  private adapter(backend: StorageBackend): StorageAdapter {
    switch (backend) {
      case 'local':
        return this.local;
      case 'cache':
        if (!this.cache) {
          throw new Error('Cache Storage is not configured. Register CACHE_STORAGE_ADAPTER.');
        }
        return this.cache;
      default:
        throw new Error(`Unsupported storage backend: ${backend}`);
    }
  }
}
