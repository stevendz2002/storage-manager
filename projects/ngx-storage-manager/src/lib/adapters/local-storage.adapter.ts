import { Injectable } from '@angular/core';
import type { StorageAdapter } from '../interfaces/storage-adapter.interface';
import { LOCAL_STORAGE_PREFIX } from '../storage.constants';

/** Internal JSON adapter. Only keys in the library namespace are managed. */
@Injectable({ providedIn: 'root' })
export class LocalStorageAdapter implements StorageAdapter {
  /**
   * Store or replace a JSON value. Rejects values without a JSON representation,
   * circular objects, BigInt and browser storage failures. JSON rules apply to
   * nested undefined values, non-finite numbers and objects with toJSON methods.
   */
  set<T>(key: string, value: T): Promise<void> {
    return this.execute('set', () => {
      const serialized = JSON.stringify(value);
      if (serialized === undefined) {
        throw new TypeError('The value has no JSON representation.');
      }
      this.storage.setItem(LOCAL_STORAGE_PREFIX + key, serialized);
    });
  }

  /**
   * Read and parse a JSON value, or return null for a missing key.
   * T describes the expected shape; it does not perform runtime validation.
   * Corrupt JSON rejects the operation and is left intact for recovery.
   */
  get<T>(key: string): Promise<T | null> {
    return this.execute('get', () => {
      const serialized = this.storage.getItem(LOCAL_STORAGE_PREFIX + key);
      return serialized === null ? null : (JSON.parse(serialized) as T);
    });
  }

  /** Remove a managed key. Removing a missing key succeeds. */
  remove(key: string): Promise<void> {
    return this.execute('remove', () => {
      this.storage.removeItem(LOCAL_STORAGE_PREFIX + key);
    });
  }

  /** Test key existence without parsing its value, including stored JSON null. */
  has(key: string): Promise<boolean> {
    return this.execute('has', () => this.storage.getItem(LOCAL_STORAGE_PREFIX + key) !== null);
  }

  /**
   * Remove only keys prefixed with ngxsm:. Snapshot keys before deleting them
   * so changing Storage indexes cannot cause adjacent keys to be skipped.
   * Browser failures reject; deletions already completed cannot be rolled back.
   */
  clear(): Promise<void> {
    return this.execute('clear', () => {
      const storage = this.storage;
      const keys: string[] = [];
      for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index);
        if (key !== null && key.startsWith(LOCAL_STORAGE_PREFIX)) {
          keys.push(key);
        }
      }
      for (const key of keys) {
        storage.removeItem(key);
      }
    });
  }

  /** Resolve lazily so service creation also works during server rendering. */
  private get storage(): Storage {
    const storage = globalThis.localStorage;
    if (!storage) {
      throw new Error('LocalStorage is unavailable in this environment.');
    }
    return storage;
  }

  /** Normalize synchronous browser/JSON errors into rejected promises. */
  private async execute<T>(operation: string, action: () => T): Promise<T> {
    try {
      return action();
    } catch (cause) {
      throw new Error(`LocalStorage ${operation} failed.`, { cause });
    }
  }
}
