/** Shared asynchronous contract for browser storage adapters. */
export interface StorageAdapter {
  /** Store or replace a JSON value under a key. */
  set<T>(key: string, value: T): Promise<void>;
  /** Read a JSON value, or null when the key does not exist. */
  get<T>(key: string): Promise<T | null>;
  /** Remove a key; missing keys are allowed. */
  remove(key: string): Promise<void>;
  /** Check whether a key exists, including a stored JSON null. */
  has(key: string): Promise<boolean>;
  /** Delete only data owned by this library. */
  clear(): Promise<void>;
}
