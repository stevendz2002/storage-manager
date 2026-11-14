# Acuerdo de integración

Repositorio existente: https://github.com/stevendz2002/storage-manager.
No se crea otro repositorio ni se renombra el remoto.

## Versiones compartidas

Node 24.13.1, npm 11.10.1, Angular framework/CLI/build/compiler-cli 21.2.23,
TypeScript 5.9.3, Compodoc 2.0.0, Vitest/coverage-v8 4.0.8.
Dependencias directas exactas y package-lock.json versionado. Usar `npm ci`.

## Responsabilidades

1. Arquitectura, contratos, LocalStorage, fachada y configuración común.
2. Cache Storage y documentación Compodoc.
3. Showcase independiente, README de consumo, publicación NPM y PDF.

## Contratos estables

`StorageBackend = 'local' | 'cache'`; `StorageAdapter` define `set`, `get`,
`remove`, `has`, `clear`, todos con Promise. No modificar las firmas.
Prefijo local `ngxsm:` y caché `ngx-storage-manager-v1`, definidos internamente
por `src/lib/storage.constants.ts` dentro de la librería.

El adaptador local es interno; el consumidor usará `StorageManagerService`.
La fachada está implementada en `feat/local-storage`. Exportar únicamente
`StorageManagerService`, `StorageAdapter`, `StorageBackend` y
`CACHE_STORAGE_ADAPTER` desde `public-api.ts`.

## Integración del integrante 2

Crear `src/lib/adapters/cache-storage.adapter.ts` dentro de la librería,
implementando `StorageAdapter`. Registrar el adaptador mediante Angular DI:

```typescript
{ provide: CACHE_STORAGE_ADAPTER, useExisting: CacheStorageAdapter }
```

El token es parte de la API pública. El proveedor puede incorporarse posteriormente
con una función pública `provideCacheStorage()` en el módulo del integrante 2,
para evitar que el consumidor importe clases internas.
No existe una implementación Cache Storage en esta entrega; es trabajo pendiente.
La fachada usa inyección opcional: LocalStorage funciona sin registrar Cache.
Las operaciones `cache` rechazan con un error explícito hasta registrar el token.
Las pruebas de enrutamiento usan un mock, no verifican el Cache del navegador.

Ejemplo para el código del módulo Cache del integrante 2 (no es código existente):

```typescript
import { makeEnvironmentProviders } from '@angular/core';
import { CACHE_STORAGE_ADAPTER } from '../interfaces/cache-storage-adapter.token';
import { CacheStorageAdapter } from '../adapters/cache-storage.adapter';

export function provideCacheStorage() {
  return makeEnvironmentProviders([
    CacheStorageAdapter,
    { provide: CACHE_STORAGE_ADAPTER, useExisting: CacheStorageAdapter },
  ]);
}
```

Exportar esta función desde `public-api.ts` cuando exista y agregar sus pruebas.
La aplicación podrá registrarla en sus providers sin importar clases internas.
No registrar el proveedor en un componente: el servicio raíz debe poder resolverlo.
Después de incorporar Cache, verificar operaciones reales de ambos backends y
volver a exigir el 100% para todo el código de producción.

## NPM

Nombre interno actual: `ngx-storage-manager`. El nombre público está pendiente
hasta verificar la cuenta y el ámbito NPM del encargado de publicación.
No se asume que el usuario GitHub posee el mismo ámbito en NPM.
El integrante 3 debe actualizar `projects/ngx-storage-manager/package.json`
y comunicar el nombre definitivo antes de publicar. No se ha publicado en NPM.

Compodoc 2.0.0 declara DevKit 22. Se fijan overrides de DevKit core y schematics
a 21.2.23 para mantener el toolchain en Angular 21 y compatible con Node 24.13.1.
