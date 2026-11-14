import { TestBed } from '@angular/core/testing';
import {
  CacheStorageAdapter,
  CACHE_STORAGE_NAME_TOKEN,
  provideCacheStorage,
} from './cache-storage.adapter';
import { CACHE_STORAGE_ADAPTER } from '../interfaces/cache-storage-adapter.token';
import { CACHE_STORAGE_NAME, LOCAL_STORAGE_PREFIX } from '../storage.constants';
import * as PublicApi from '../../public-api';

class MockCache implements Partial<Cache> {
  private readonly store = new Map<string, Response>();

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    const url = typeof request === 'string' ? request : (request as Request).url;
    const entry = this.store.get(url);
    return entry ? entry.clone() : undefined;
  }

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    const url = typeof request === 'string' ? request : (request as Request).url;
    this.store.set(url, response.clone());
  }

  async delete(request: RequestInfo | URL): Promise<boolean> {
    const url = typeof request === 'string' ? request : (request as Request).url;
    return this.store.delete(url);
  }

  async keys(): Promise<any[]> {
    return Array.from(this.store.keys());
  }
}

class MockCacheStorage implements Partial<CacheStorage> {
  readonly map = new Map<string, MockCache>();

  async open(cacheName: string): Promise<Cache> {
    let cache = this.map.get(cacheName);
    if (!cache) {
      cache = new MockCache();
      this.map.set(cacheName, cache);
    }
    return cache as unknown as Cache;
  }

  async delete(cacheName: string): Promise<boolean> {
    return this.map.delete(cacheName);
  }

  async has(cacheName: string): Promise<boolean> {
    return this.map.has(cacheName);
  }

  async keys(): Promise<string[]> {
    return Array.from(this.map.keys());
  }
}

describe('CacheStorageAdapter', () => {
  let adapter: CacheStorageAdapter;
  let mockCaches: MockCacheStorage;

  beforeEach(() => {
    mockCaches = new MockCacheStorage();
    vi.stubGlobal('caches', mockCaches);

    TestBed.configureTestingModule({
      providers: [CacheStorageAdapter],
    });
    adapter = TestBed.inject(CacheStorageAdapter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Constantes y configuración', () => {
    it('mantiene las constantes de la librería intactas', () => {
      expect(CACHE_STORAGE_NAME).toBe('ngx-storage-manager-v1');
      expect(LOCAL_STORAGE_PREFIX).toBe('ngxsm:');
    });

    it('utiliza el nombre de caché por defecto', () => {
      expect(adapter.cacheName).toBe(CACHE_STORAGE_NAME);
    });

    it('admite un nombre de caché personalizado vía constructor', () => {
      const customAdapter = new CacheStorageAdapter('custom-cache-bucket');
      expect(customAdapter.cacheName).toBe('custom-cache-bucket');
    });

    it('genera el valor por defecto desde CACHE_STORAGE_NAME_TOKEN.factory', () => {
      const factory = (CACHE_STORAGE_NAME_TOKEN as any).ɵprov?.factory;
      expect(factory).toBeDefined();
      expect(factory()).toBe(CACHE_STORAGE_NAME);
    });

    it('provee los servicios correctamente con provideCacheStorage()', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideCacheStorage()],
      });

      const injectedAdapter = TestBed.inject(CacheStorageAdapter);
      const injectedToken = TestBed.inject(CACHE_STORAGE_ADAPTER);

      expect(injectedAdapter).toBeInstanceOf(CacheStorageAdapter);
      expect(injectedToken).toBe(injectedAdapter);
      expect(injectedAdapter.cacheName).toBe(CACHE_STORAGE_NAME);
    });

    it('provee los servicios con nombre personalizado en provideCacheStorage("mi-cache")', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideCacheStorage('mi-cache')],
      });

      const injectedAdapter = TestBed.inject(CacheStorageAdapter);
      expect(injectedAdapter.cacheName).toBe('mi-cache');
    });
  });

  describe('isAvailable', () => {
    it('retorna true cuando caches está definido y no es nulo', () => {
      expect(adapter.isAvailable()).toBe(true);
    });

    it('retorna false cuando caches es undefined', () => {
      vi.stubGlobal('caches', undefined);
      expect(adapter.isAvailable()).toBe(false);
    });

    it('retorna false cuando caches es null', () => {
      vi.stubGlobal('caches', null);
      expect(adapter.isAvailable()).toBe(false);
    });
  });

  describe('Operaciones CRUD y tipos de datos', () => {
    it.each([
      { name: 'objeto', value: { nombre: 'Carlos', edad: 22, activo: true } },
      { name: 'arreglo', value: [1, 'dos', null, { nested: true }] },
      { name: 'cadena de texto', value: '¡Hola, mundo!' },
      { name: 'cadena vacía', value: '' },
      { name: 'número decimal', value: 42.5 },
      { name: 'cero', value: 0 },
      { name: 'booleano true', value: true },
      { name: 'booleano false', value: false },
      { name: 'valor null', value: null },
    ])('guarda y recupera un $name con retorno tipado', async ({ value }) => {
      const result = adapter.set('item-key', value);
      expect(result).toBeInstanceOf(Promise);
      await result;

      expect(await adapter.has('item-key')).toBe(true);
      const retrieved = await adapter.get('item-key');
      expect(retrieved).toEqual(value);
    });

    it('sobrescribe y actualiza el valor de una clave existente', async () => {
      await adapter.set('config', { tema: 'claro', version: 1 });
      await adapter.set('config', { tema: 'oscuro', version: 2 });

      const updated = await adapter.get<{ tema: string; version: number }>('config');
      expect(updated).toEqual({ tema: 'oscuro', version: 2 });
    });

    it('retorna null cuando la clave no existe', async () => {
      const value = await adapter.get('clave-inexistente');
      expect(value).toBeNull();
    });

    it('elimina una clave existente', async () => {
      await adapter.set('temporal', 'para-borrar');
      expect(await adapter.has('temporal')).toBe(true);

      await adapter.remove('temporal');
      expect(await adapter.has('temporal')).toBe(false);
      expect(await adapter.get('temporal')).toBeNull();
    });

    it('no falla al intentar eliminar una clave inexistente', async () => {
      await expect(adapter.remove('no-existe')).resolves.toBeUndefined();
    });

    it('has retorna true para clave existente y false para inexistente', async () => {
      expect(await adapter.has('desconocida')).toBe(false);
      await adapter.set('conocida', 123);
      expect(await adapter.has('conocida')).toBe(true);
    });

    it('distingue entre null guardado y clave inexistente con has()', async () => {
      await adapter.set('clave-con-null', null);
      expect(await adapter.get('clave-con-null')).toBeNull();
      expect(await adapter.has('clave-con-null')).toBe(true);

      expect(await adapter.get('clave-inexistente')).toBeNull();
      expect(await adapter.has('clave-inexistente')).toBe(false);
    });

    it('admite claves con caracteres especiales, emojis y espacios', async () => {
      const specialKeys = [
        'usuario/á?x=1&y=2#seccion',
        'clave con espacios múltiples',
        'emoji-🚀-✨-test',
        'simbolos!@#$%^&*()_+={}:;"<>',
        '',
      ];

      for (const key of specialKeys) {
        await adapter.set(key, { data: key });
        expect(await adapter.has(key)).toBe(true);
        expect(await adapter.get<{ data: string }>(key)).toEqual({ data: key });
        await adapter.remove(key);
        expect(await adapter.has(key)).toBe(false);
      }
    });
  });

  describe('clear', () => {
    it('elimina solo la caché gestionada y preserva cachés ajenas', async () => {
      await mockCaches.open('otra-cache-externa');
      await adapter.set('clave-propia', 'valor');

      expect(await mockCaches.has(CACHE_STORAGE_NAME)).toBe(true);
      expect(await mockCaches.has('otra-cache-externa')).toBe(true);

      await adapter.clear();

      expect(await mockCaches.has(CACHE_STORAGE_NAME)).toBe(false);
      expect(await mockCaches.has('otra-cache-externa')).toBe(true);
    });

    it('puede ejecutarse de forma repetida sin fallar', async () => {
      await adapter.clear();
      await adapter.clear();
      expect(await mockCaches.has(CACHE_STORAGE_NAME)).toBe(false);
    });
  });

  describe('Manejo de errores de serialización', () => {
    it.each([
      { name: 'undefined', value: undefined },
      { name: 'función', value: () => 1 },
      { name: 'symbol', value: Symbol('simbolo') },
      { name: 'toJSON retornando undefined', value: { toJSON: () => undefined } },
    ])('rechaza cuando $name no tiene representación JSON válida', async ({ value }) => {
      await expect(adapter.set('invalido', value)).rejects.toMatchObject({
        message: 'Failed to serialize value to JSON.',
        cause: expect.any(TypeError),
      });
      expect(await adapter.has('invalido')).toBe(false);
    });

    it('rechaza referencias circulares con TypeError', async () => {
      const circular: Record<string, unknown> = {};
      circular['self'] = circular;

      await expect(adapter.set('circular', circular)).rejects.toMatchObject({
        message: 'Failed to serialize value to JSON.',
        cause: expect.any(TypeError),
      });
      expect(await adapter.has('circular')).toBe(false);
    });

    it('rechaza valores BigInt con TypeError', async () => {
      await expect(adapter.set('bigint', BigInt(9007199254740991))).rejects.toMatchObject({
        message: 'Failed to serialize value to JSON.',
        cause: expect.any(TypeError),
      });
    });

    it('conserva la causa de un método toJSON que arroja error', async () => {
      const customError = new Error('error en toJSON');
      const throwingObj = {
        toJSON: () => {
          throw customError;
        },
      };

      await expect(adapter.set('custom', throwingObj)).rejects.toMatchObject({
        message: 'Failed to serialize value to JSON.',
        cause: customError,
      });
    });
  });

  describe('Manejo de JSON corrupto', () => {
    it('rechaza con error descriptivo al leer una respuesta con JSON corrupto', async () => {
      const cache = await mockCaches.open(CACHE_STORAGE_NAME);
      const corruptResponse = new Response('este { no es un json valido', {
        headers: { 'Content-Type': 'application/json' },
      });
      const url = `${location.origin}/__ngx-storage-manager__/${encodeURIComponent('corrupto')}`;
      await cache.put(url, corruptResponse);

      expect(await adapter.has('corrupto')).toBe(true);
      await expect(adapter.get('corrupto')).rejects.toMatchObject({
        message: 'Failed to parse cached JSON response.',
        cause: expect.any(SyntaxError),
      });
    });
  });

  describe('Cache Storage no disponible', () => {
    it.each([
      { name: 'set', run: (a: CacheStorageAdapter) => a.set('key', 1) },
      { name: 'get', run: (a: CacheStorageAdapter) => a.get('key') },
      { name: 'remove', run: (a: CacheStorageAdapter) => a.remove('key') },
      { name: 'has', run: (a: CacheStorageAdapter) => a.has('key') },
      { name: 'clear', run: (a: CacheStorageAdapter) => a.clear() },
    ])('rechaza $name con error descriptivo cuando caches es undefined', async ({ run }) => {
      vi.stubGlobal('caches', undefined);
      await expect(run(adapter)).rejects.toMatchObject({
        message: 'Cache Storage is unavailable in this environment.',
      });
    });
  });

  describe('Fallo en APIs nativas de Cache Storage', () => {
    it('rechaza las operaciones cuando caches.open falla', async () => {
      const cause = new DOMException('Permiso denegado', 'SecurityError');
      vi.spyOn(mockCaches, 'open').mockRejectedValue(cause);

      await expect(adapter.set('k', 1)).rejects.toMatchObject({
        message: 'CacheStorage set failed.',
        cause,
      });
      await expect(adapter.get('k')).rejects.toMatchObject({
        message: 'CacheStorage get failed.',
        cause,
      });
      await expect(adapter.remove('k')).rejects.toMatchObject({
        message: 'CacheStorage remove failed.',
        cause,
      });
      await expect(adapter.has('k')).rejects.toMatchObject({
        message: 'CacheStorage has failed.',
        cause,
      });
    });

    it('rechaza set cuando cache.put falla', async () => {
      const cause = new DOMException('Cuota de almacenamiento excedida', 'QuotaExceededError');
      const cache = await mockCaches.open(CACHE_STORAGE_NAME);
      vi.spyOn(cache, 'put').mockRejectedValue(cause);

      await expect(adapter.set('k', 1)).rejects.toMatchObject({
        message: 'CacheStorage set failed.',
        cause,
      });
    });

    it('rechaza get y has cuando cache.match falla', async () => {
      const cause = new DOMException('Fallo al leer datos', 'AbortError');
      const cache = await mockCaches.open(CACHE_STORAGE_NAME);
      vi.spyOn(cache, 'match').mockRejectedValue(cause);

      await expect(adapter.get('k')).rejects.toMatchObject({
        message: 'CacheStorage get failed.',
        cause,
      });
      await expect(adapter.has('k')).rejects.toMatchObject({
        message: 'CacheStorage has failed.',
        cause,
      });
    });

    it('rechaza remove cuando cache.delete falla', async () => {
      const cause = new DOMException('Fallo al eliminar', 'InvalidStateError');
      const cache = await mockCaches.open(CACHE_STORAGE_NAME);
      vi.spyOn(cache, 'delete').mockRejectedValue(cause);

      await expect(adapter.remove('k')).rejects.toMatchObject({
        message: 'CacheStorage remove failed.',
        cause,
      });
    });

    it('rechaza clear cuando caches.delete falla', async () => {
      const cause = new DOMException('Error al borrar bucket', 'SecurityError');
      vi.spyOn(mockCaches, 'delete').mockRejectedValue(cause);

      await expect(adapter.clear()).rejects.toMatchObject({
        message: 'CacheStorage clear failed.',
        cause,
      });
    });
  });

  describe('Resolución de origen y fallback para SSR', () => {
    it('utiliza location.origin cuando está disponible', async () => {
      vi.stubGlobal('location', { origin: 'https://mi-dominio.edu.co' });
      const customAdapter = new CacheStorageAdapter();

      await customAdapter.set('test-key', 'ok');
      const cache = await mockCaches.open(CACHE_STORAGE_NAME);
      const match = await cache.match('https://mi-dominio.edu.co/__ngx-storage-manager__/test-key');
      expect(match).toBeDefined();
    });

    it('utiliza http://localhost como fallback si location.origin es "null"', async () => {
      vi.stubGlobal('location', { origin: 'null' });
      const customAdapter = new CacheStorageAdapter();

      await customAdapter.set('test-key', 'ok');
      const cache = await mockCaches.open(CACHE_STORAGE_NAME);
      const match = await cache.match('http://localhost/__ngx-storage-manager__/test-key');
      expect(match).toBeDefined();
    });

    it('utiliza http://localhost como fallback si location es undefined', async () => {
      vi.stubGlobal('location', undefined);
      const customAdapter = new CacheStorageAdapter();

      await customAdapter.set('test-key', 'ok');
      const cache = await mockCaches.open(CACHE_STORAGE_NAME);
      const match = await cache.match('http://localhost/__ngx-storage-manager__/test-key');
      expect(match).toBeDefined();
    });
  });

  describe('Public API', () => {
    it('reexporta todos los artefactos públicos esperados', () => {
      expect(PublicApi.CACHE_STORAGE_ADAPTER).toBeDefined();
      expect(PublicApi.CACHE_STORAGE_NAME_TOKEN).toBeDefined();
      expect(PublicApi.CacheStorageAdapter).toBeDefined();
      expect(PublicApi.provideCacheStorage).toBeDefined();
    });
  });
});
