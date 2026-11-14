import { InjectionToken } from '@angular/core';
import type { StorageAdapter } from './storage-adapter.interface';

/**
 * Integration point for the Cache Storage adapter supplied by the cache module.
 * Register { provide: CACHE_STORAGE_ADAPTER, useExisting: CacheStorageAdapter }.
 */
export const CACHE_STORAGE_ADAPTER = new InjectionToken<StorageAdapter>(
  'ngx-storage-manager.cache-adapter',
);
