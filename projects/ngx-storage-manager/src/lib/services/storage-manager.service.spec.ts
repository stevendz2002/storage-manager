import { TestBed } from '@angular/core/testing';
import { CACHE_STORAGE_ADAPTER, StorageManagerService } from '../../public-api';
import type { StorageAdapter, StorageBackend } from '../../public-api';
import { LocalStorageAdapter } from '../adapters/local-storage.adapter';

function mockAdapter() {
  return {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    remove: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockResolvedValue(false),
    clear: vi.fn().mockResolvedValue(undefined),
  } satisfies StorageAdapter;
}

describe('StorageManagerService adapter routing', () => {
  let local: ReturnType<typeof mockAdapter>;
  let cache: ReturnType<typeof mockAdapter>;
  let service: StorageManagerService;

  beforeEach(() => {
    local = mockAdapter();
    cache = mockAdapter();
    TestBed.configureTestingModule({
      providers: [
        { provide: LocalStorageAdapter, useValue: local },
        { provide: CACHE_STORAGE_ADAPTER, useValue: cache },
      ],
    });
    service = TestBed.inject(StorageManagerService);
  });

  for (const backend of ['local', 'cache'] as const) {
    it(`delegates all operations to ${backend} and keeps the other backend untouched`, async () => {
      const selected = backend === 'local' ? local : cache;
      const other = backend === 'local' ? cache : local;
      const user = { nombre: 'Carlos', edad: 22 };
      selected.get.mockResolvedValue(user);
      selected.has.mockResolvedValue(true);

      await expect(service.set(backend, 'usuario', user)).resolves.toBeUndefined();
      expect(selected.set).toHaveBeenCalledExactlyOnceWith('usuario', user);
      expect(await service.get<typeof user>(backend, 'usuario')).toBe(user);
      expect(selected.get).toHaveBeenCalledExactlyOnceWith('usuario');
      expect(await service.has(backend, 'usuario')).toBe(true);
      expect(selected.has).toHaveBeenCalledExactlyOnceWith('usuario');
      await expect(service.remove(backend, 'usuario')).resolves.toBeUndefined();
      expect(selected.remove).toHaveBeenCalledExactlyOnceWith('usuario');
      await expect(service.clear(backend)).resolves.toBeUndefined();
      expect(selected.clear).toHaveBeenCalledExactlyOnceWith();
      for (const method of Object.values(other)) expect(method).not.toHaveBeenCalled();
    });

    it(`returns missing results from ${backend}`, async () => {
      expect(await service.get(backend, 'missing')).toBeNull();
      expect(await service.has(backend, 'missing')).toBe(false);
    });

    it(`propagates every ${backend} operation failure without swallowing the cause`, async () => {
      const selected = backend === 'local' ? local : cache;
      const cause = new Error('backend failed');
      for (const method of Object.values(selected)) method.mockRejectedValue(cause);
      await expect(service.set(backend, 'key', 1)).rejects.toBe(cause);
      await expect(service.get(backend, 'key')).rejects.toBe(cause);
      await expect(service.remove(backend, 'key')).rejects.toBe(cause);
      await expect(service.has(backend, 'key')).rejects.toBe(cause);
      await expect(service.clear(backend)).rejects.toBe(cause);
    });
  }

  it('rejects invalid runtime backends in every operation', async () => {
    const backend = 'session' as StorageBackend;
    const message = 'Unsupported storage backend: session';
    await expect(service.set(backend, 'key', 1)).rejects.toThrow(message);
    await expect(service.get(backend, 'key')).rejects.toThrow(message);
    await expect(service.remove(backend, 'key')).rejects.toThrow(message);
    await expect(service.has(backend, 'key')).rejects.toThrow(message);
    await expect(service.clear(backend)).rejects.toThrow(message);
  });
});

describe('StorageManagerService public API with default providers', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('works through the public facade and root DI without cache registration', async () => {
    const service = TestBed.inject(StorageManagerService);
    localStorage.setItem('foreign', 'preserved');
    await service.set('local', 'usuario', { nombre: 'Carlos' });
    expect(await service.get('local', 'usuario')).toEqual({ nombre: 'Carlos' });
    expect(await service.has('local', 'usuario')).toBe(true);
    await service.remove('local', 'usuario');
    expect(await service.get('local', 'usuario')).toBeNull();
    await service.set('local', 'temporary', 1);
    await service.clear('local');
    expect(await service.has('local', 'temporary')).toBe(false);
    expect(localStorage.getItem('foreign')).toBe('preserved');
  });

  it('rejects every cache operation explicitly while integration is pending', async () => {
    const service = TestBed.inject(StorageManagerService);
    const message = 'Cache Storage is not configured. Register CACHE_STORAGE_ADAPTER.';
    await expect(service.set('cache', 'key', 1)).rejects.toThrow(message);
    await expect(service.get('cache', 'key')).rejects.toThrow(message);
    await expect(service.remove('cache', 'key')).rejects.toThrow(message);
    await expect(service.has('cache', 'key')).rejects.toThrow(message);
    await expect(service.clear('cache')).rejects.toThrow(message);
  });
});
