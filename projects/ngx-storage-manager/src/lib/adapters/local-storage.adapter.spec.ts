import { TestBed } from '@angular/core/testing';
import { LocalStorageAdapter } from './local-storage.adapter';
import { CACHE_STORAGE_NAME, LOCAL_STORAGE_PREFIX } from '../storage.constants';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    adapter = TestBed.inject(LocalStorageAdapter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('keeps the agreed namespaces', () => {
    expect(LOCAL_STORAGE_PREFIX).toBe('ngxsm:');
    expect(CACHE_STORAGE_NAME).toBe('ngx-storage-manager-v1');
  });

  it.each([
    { name: 'object', value: { nombre: 'Carlos', edad: 22, roles: ['student'] } },
    { name: 'array', value: [1, 'two', null] },
    { name: 'string', value: '¡Hola, 世界!' },
    { name: 'empty string', value: '' },
    { name: 'number', value: 22.5 },
    { name: 'zero', value: 0 },
    { name: 'true', value: true },
    { name: 'false', value: false },
    { name: 'null', value: null },
  ])('round trips a JSON $name using a namespaced key', async ({ value }) => {
    const result = adapter.set('value', value);
    expect(result).toBeInstanceOf(Promise);
    await result;
    expect(localStorage.getItem('ngxsm:value')).toBe(JSON.stringify(value));
    expect(localStorage.getItem('value')).toBeNull();
    expect(await adapter.get('value')).toEqual(value);
    expect(await adapter.has('value')).toBe(true);
  });

  it('overwrites a value without changing unrelated keys', async () => {
    localStorage.setItem('other', 'external');
    await adapter.set('user', { version: 1 });
    await adapter.set('user', { version: 2 });
    expect(await adapter.get<{ version: number }>('user')).toEqual({ version: 2 });
    expect(localStorage.getItem('other')).toBe('external');
    expect(localStorage.length).toBe(2);
  });

  it('returns null and false for missing keys', async () => {
    expect(await adapter.get('missing')).toBeNull();
    expect(await adapter.has('missing')).toBe(false);
  });

  it('removes an entry and permits repeated removal', async () => {
    await adapter.set('user', 1);
    await adapter.remove('user');
    await expect(adapter.remove('user')).resolves.toBeUndefined();
    expect(await adapter.get('user')).toBeNull();
    expect(await adapter.has('user')).toBe(false);
  });

  it('supports empty, Unicode, URL and already prefixed logical keys', async () => {
    for (const key of ['', 'usuario/á?x=1', 'ngxsm:nested', '__proto__']) {
      await adapter.set(key, key);
      expect(await adapter.get(key)).toBe(key);
      await adapter.remove(key);
      expect(await adapter.has(key)).toBe(false);
    }
  });

  it('clears adjacent managed keys and preserves all foreign keys', async () => {
    localStorage.setItem('session', 'external');
    await adapter.set('a', 1);
    await adapter.set('b', 2);
    localStorage.setItem('ngxsm', 'not the namespace');
    localStorage.setItem('other:ngxsm:key', 'external too');
    await adapter.set('', null);
    const clear = vi.spyOn(Storage.prototype, 'clear');
    await adapter.clear();
    expect(clear).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(3);
    expect(localStorage.getItem('session')).toBe('external');
    expect(localStorage.getItem('ngxsm')).toBe('not the namespace');
    expect(localStorage.getItem('other:ngxsm:key')).toBe('external too');
  });

  it('can clear an empty store repeatedly', async () => {
    await adapter.clear();
    await adapter.clear();
    expect(localStorage.length).toBe(0);
  });

  it('tolerates a key disappearing while clear enumerates the storage', async () => {
    localStorage.setItem('external', 'keep');
    await adapter.set('a', 1);
    vi.spyOn(Storage.prototype, 'key').mockReturnValueOnce(null);
    await adapter.clear();
    expect(localStorage.getItem('external')).toBe('keep');
    expect(await adapter.has('a')).toBe(false);
  });

  it.each([
    { name: 'undefined', value: undefined },
    { name: 'function', value: () => 1 },
    { name: 'symbol', value: Symbol('value') },
    { name: 'toJSON returning undefined', value: { toJSON: () => undefined } },
  ])('rejects $name without overwriting an existing value', async ({ value }) => {
    await adapter.set('safe', 'original');
    await expect(adapter.set('safe', value)).rejects.toMatchObject({
      message: 'LocalStorage set failed.',
      cause: expect.any(TypeError),
    });
    expect(await adapter.get('safe')).toBe('original');
  });

  it('rejects circular references and BigInt as asynchronous errors', async () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    for (const value of [circular, BigInt(1)]) {
      const promise = adapter.set('bad', value);
      expect(promise).toBeInstanceOf(Promise);
      await expect(promise).rejects.toMatchObject({ cause: expect.any(TypeError) });
      expect(await adapter.has('bad')).toBe(false);
    }
  });

  it('preserves the cause of a throwing toJSON method', async () => {
    const cause = new Error('serialization failed');
    await expect(
      adapter.set('bad', {
        toJSON: () => {
          throw cause;
        },
      }),
    ).rejects.toMatchObject({
      message: 'LocalStorage set failed.',
      cause,
    });
  });

  it('rejects corrupted JSON while retaining it and reporting its existence', async () => {
    localStorage.setItem('ngxsm:broken', '{invalid json');
    await expect(adapter.get('broken')).rejects.toMatchObject({
      message: 'LocalStorage get failed.',
      cause: expect.any(SyntaxError),
    });
    expect(await adapter.has('broken')).toBe(true);
    expect(localStorage.getItem('ngxsm:broken')).toBe('{invalid json');
  });

  const operations = [
    { name: 'set', native: 'setItem', run: (a: LocalStorageAdapter) => a.set('key', 1) },
    { name: 'get', native: 'getItem', run: (a: LocalStorageAdapter) => a.get('key') },
    { name: 'remove', native: 'removeItem', run: (a: LocalStorageAdapter) => a.remove('key') },
    { name: 'has', native: 'getItem', run: (a: LocalStorageAdapter) => a.has('key') },
    { name: 'clear', native: 'key', run: (a: LocalStorageAdapter) => a.clear() },
  ] as const;

  it.each(operations)('preserves browser errors from $name', async ({ name, native, run }) => {
    localStorage.setItem('ngxsm:key', '1');
    const cause = new DOMException('Storage blocked or full', 'QuotaExceededError');
    vi.spyOn(Storage.prototype, native).mockImplementation(() => {
      throw cause;
    });
    await expect(run(adapter)).rejects.toMatchObject({
      message: `LocalStorage ${name} failed.`,
      cause,
    });
  });

  it('reports failures reading the storage length', async () => {
    const cause = new DOMException('Access denied', 'SecurityError');
    vi.spyOn(Storage.prototype, 'length', 'get').mockImplementation(() => {
      throw cause;
    });
    await expect(adapter.clear()).rejects.toMatchObject({ cause });
  });

  it('reports failures deleting keys during clear and preserves foreign entries', async () => {
    localStorage.setItem('foreign', 'safe');
    await adapter.set('a', 1);
    const cause = new Error('delete failed');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw cause;
    });
    await expect(adapter.clear()).rejects.toMatchObject({ cause });
    expect(localStorage.getItem('foreign')).toBe('safe');
  });

  it.each(operations)(
    'rejects $name when storage is unavailable, allowing SSR construction',
    async ({ run }) => {
      vi.stubGlobal('localStorage', undefined);
      const serverAdapter = TestBed.inject(LocalStorageAdapter);
      await expect(run(serverAdapter)).rejects.toMatchObject({
        cause: expect.objectContaining({
          message: 'LocalStorage is unavailable in this environment.',
        }),
      });
    },
  );
});
