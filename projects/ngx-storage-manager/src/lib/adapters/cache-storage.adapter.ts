import { inject, Inject, Injectable, InjectionToken, Optional, type Provider } from '@angular/core';
import type { StorageAdapter } from '../interfaces/storage-adapter.interface';
import { CACHE_STORAGE_ADAPTER } from '../interfaces/cache-storage-adapter.token';
import { CACHE_STORAGE_NAME } from '../storage.constants';

/**
 * Token de inyección opcional para configurar el nombre de la caché gestionada.
 * Si no se proporciona un valor, se utiliza el nombre predeterminado {@link CACHE_STORAGE_NAME}.
 */
export const CACHE_STORAGE_NAME_TOKEN = new InjectionToken<string>(
  'ngx-storage-manager.cache-name',
  {
    providedIn: 'root',
    factory: () => CACHE_STORAGE_NAME,
  },
);

/**
 * Provee la configuración necesaria para registrar `CacheStorageAdapter`
 * asociado al token público `CACHE_STORAGE_ADAPTER` en el inyector de dependencias de Angular.
 *
 * Permite al consumidor de la librería configurar el almacenamiento en caché
 * sin acoplarse directamente a la implementación interna.
 *
 * @param cacheName Nombre personalizado opcional para la instancia de caché administrada.
 * @returns Lista de proveedores de Angular listos para configurar en la aplicación.
 *
 * @example
 * ```typescript
 * // En app.config.ts:
 * import { provideCacheStorage } from 'ngx-storage-manager';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [provideCacheStorage()]
 * };
 * ```
 */
export function provideCacheStorage(cacheName?: string): Provider[] {
  const providers: Provider[] = [
    CacheStorageAdapter,
    { provide: CACHE_STORAGE_ADAPTER, useExisting: CacheStorageAdapter },
  ];
  if (cacheName) {
    providers.push({ provide: CACHE_STORAGE_NAME_TOKEN, useValue: cacheName });
  }
  return providers;
}

/**
 * Adaptador de almacenamiento asíncrono basado en la Cache Storage API del navegador.
 *
 * Implementa el contrato {@link StorageAdapter} almacenando valores en formato JSON
 * encapsulados en objetos nativos `Response` bajo una URL virtual con espacio de nombres
 * exclusivo (`__ngx-storage-manager__`).
 *
 * No realiza solicitudes de red HTTP reales.
 *
 * @example
 * ```typescript
 * const adapter = new CacheStorageAdapter();
 * await adapter.set('usuario', { id: 10, nombre: 'Valentina' });
 * const usuario = await adapter.get<{ id: number; nombre: string }>('usuario');
 * console.log(usuario?.nombre); // 'Valentina'
 * ```
 */
@Injectable({ providedIn: 'root' })
export class CacheStorageAdapter implements StorageAdapter {
  /**
   * Nombre del bucket de caché gestionado en `caches`.
   */
  readonly cacheName: string;

  /**
   * Inicializa una nueva instancia del adaptador de Cache Storage.
   *
   * @param cacheName Nombre opcional de la caché; si se omite, se utiliza el valor por defecto de la librería.
   */
  constructor(@Optional() @Inject(CACHE_STORAGE_NAME_TOKEN) cacheName?: string | null) {
    this.cacheName = cacheName || CACHE_STORAGE_NAME;
  }

  /**
   * Indica si la API `CacheStorage` (`caches`) se encuentra disponible en el entorno global actual.
   *
   * @returns `true` si `caches` está disponible y no es nulo; de lo contrario `false`.
   *
   * @example
   * ```typescript
   * if (adapter.isAvailable()) {
   *   console.log('Cache Storage está listo para ser utilizado.');
   * }
   * ```
   */
  isAvailable(): boolean {
    return (
      typeof globalThis !== 'undefined' &&
      typeof globalThis.caches !== 'undefined' &&
      globalThis.caches !== null
    );
  }

  /**
   * Almacena o sobrescribe un valor serializado en JSON bajo la clave especificada.
   *
   * @template T Tipo del valor a almacenar.
   * @param key Identificador de la entrada.
   * @param value Valor que se serializará en JSON.
   * @returns Promesa que se resuelve al completar la escritura en caché.
   * @throws {Error} Si Cache Storage no está disponible en el entorno.
   * @throws {Error} Si el valor no se puede serializar a JSON (referencias circulares, BigInt o sin representación JSON).
   * @throws {Error} Si ocurre un error en la API nativa de Cache Storage.
   *
   * @example
   * ```typescript
   * await adapter.set('preferencias', { tema: 'oscuro', notificaciones: true });
   * ```
   */
  async set<T>(key: string, value: T): Promise<void> {
    this.assertAvailable();

    let serialized: string;
    try {
      const result = JSON.stringify(value);
      if (result === undefined) {
        throw new TypeError('The value has no JSON representation.');
      }
      serialized = result;
    } catch (cause) {
      throw new Error('Failed to serialize value to JSON.', { cause });
    }

    try {
      const cache = await this.openCache();
      const response = new Response(serialized, {
        headers: { 'Content-Type': 'application/json' },
      });
      await cache.put(this.buildUrl(key), response);
    } catch (cause) {
      throw new Error('CacheStorage set failed.', { cause });
    }
  }

  /**
   * Obtiene y deserializa el valor asociado a una clave, o `null` si no existe.
   *
   * @template T Tipo esperado para el dato deserializado.
   * @param key Identificador de la entrada en caché.
   * @returns Promesa que se resuelve con el valor tipado o `null` si la clave no existe.
   * @throws {Error} Si Cache Storage no está disponible en el entorno.
   * @throws {Error} Si la respuesta en caché contiene un JSON corrupto o no parseable.
   * @throws {Error} Si ocurre un error en la API nativa de Cache Storage.
   *
   * @example
   * ```typescript
   * const preferencias = await adapter.get<{ tema: string }>('preferencias');
   * ```
   */
  async get<T>(key: string): Promise<T | null> {
    this.assertAvailable();

    let response: Response | undefined;
    try {
      const cache = await this.openCache();
      response = await cache.match(this.buildUrl(key));
    } catch (cause) {
      throw new Error('CacheStorage get failed.', { cause });
    }

    if (!response) {
      return null;
    }

    try {
      return (await response.json()) as T;
    } catch (cause) {
      throw new Error('Failed to parse cached JSON response.', { cause });
    }
  }

  /**
   * Elimina una entrada del almacenamiento de caché. Si la clave no existe, la operación no falla.
   *
   * @param key Identificador de la entrada a eliminar.
   * @returns Promesa que se resuelve cuando la entrada ha sido removida.
   * @throws {Error} Si Cache Storage no está disponible en el entorno.
   * @throws {Error} Si ocurre un error en la API nativa de Cache Storage.
   *
   * @example
   * ```typescript
   * await adapter.remove('preferencias');
   * ```
   */
  async remove(key: string): Promise<void> {
    this.assertAvailable();
    try {
      const cache = await this.openCache();
      await cache.delete(this.buildUrl(key));
    } catch (cause) {
      throw new Error('CacheStorage remove failed.', { cause });
    }
  }

  /**
   * Determina si una clave existe en la caché, incluyendo valores almacenados como `null`.
   *
   * @param key Identificador de la entrada a comprobar.
   * @returns Promesa que resuelve a `true` si la entrada existe; de lo contrario `false`.
   * @throws {Error} Si Cache Storage no está disponible en el entorno.
   * @throws {Error} Si ocurre un error en la API nativa de Cache Storage.
   *
   * @example
   * ```typescript
   * const existe = await adapter.has('preferencias');
   * ```
   */
  async has(key: string): Promise<boolean> {
    this.assertAvailable();
    try {
      const cache = await this.openCache();
      const response = await cache.match(this.buildUrl(key));
      return response !== undefined && response !== null;
    } catch (cause) {
      throw new Error('CacheStorage has failed.', { cause });
    }
  }

  /**
   * Elimina por completo la caché gestionada por este adaptador (`cacheName`).
   * No altera ninguna otra caché del mismo origen.
   *
   * @returns Promesa que se resuelve al completar la eliminación de la caché.
   * @throws {Error} Si Cache Storage no está disponible en el entorno.
   * @throws {Error} Si ocurre un error en la API nativa de Cache Storage.
   *
   * @example
   * ```typescript
   * await adapter.clear();
   * ```
   */
  async clear(): Promise<void> {
    this.assertAvailable();
    try {
      await globalThis.caches.delete(this.cacheName);
    } catch (cause) {
      throw new Error('CacheStorage clear failed.', { cause });
    }
  }

  /**
   * Abre la instancia de `Cache` asociada a `this.cacheName`.
   */
  private async openCache(): Promise<Cache> {
    return await globalThis.caches.open(this.cacheName);
  }

  /**
   * Obtiene el origen base para generar URLs internas virtuales.
   */
  private getOrigin(): string {
    const origin = typeof location !== 'undefined' ? location.origin : undefined;
    if (origin && origin !== 'null') {
      return origin;
    }
    return 'http://localhost';
  }

  /**
   * Construye la URL interna con espacio de nombres para una clave dada.
   */
  private buildUrl(key: string): string {
    return `${this.getOrigin()}/__ngx-storage-manager__/${encodeURIComponent(key)}`;
  }

  /**
   * Valida la disponibilidad de la API Cache Storage y arroja un error descriptivo si no lo está.
   */
  private assertAvailable(): void {
    if (!this.isAvailable()) {
      throw new Error('Cache Storage is unavailable in this environment.');
    }
  }
}
