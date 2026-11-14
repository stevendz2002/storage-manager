/** Public API of ngx-storage-manager. */
export type { StorageAdapter } from './lib/interfaces/storage-adapter.interface';
export type { StorageBackend } from './lib/interfaces/storage-backend.type';
export { CACHE_STORAGE_ADAPTER } from './lib/interfaces/cache-storage-adapter.token';
export { StorageManagerService } from './lib/services/storage-manager.service';
export {
  CacheStorageAdapter,
  provideCacheStorage,
  CACHE_STORAGE_NAME_TOKEN,
} from './lib/adapters/cache-storage.adapter';
