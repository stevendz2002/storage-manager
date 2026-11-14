import type { StorageBackend } from 'ngx-storage-manager';

export interface LogEntry {
  id: string;
  timestamp: string;
  backend: StorageBackend;
  action: 'get' | 'set' | 'remove' | 'has' | 'clear';
  key?: string;
  durationMs: number;
  status: 'success' | 'error';
  message: string;
  data?: unknown;
}
