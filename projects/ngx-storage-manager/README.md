# @andressaavedra01/ngx-storage-manager

Librería Angular moderna, asíncrona y tipada para la gestión unificada de almacenamiento web con soporte para **LocalStorage** y **CacheStorage** (Web Cache API).

## Características

- **Fachada Asíncrona Unificada:** Una única interfaz para interactuar con diferentes backends de almacenamiento (`'local'` y `'cache'`).
- **Namespace Aislado:**
  - `LocalStorage`: Claves aisladas bajo el prefijo `ngxsm:` para no interferir con datos de otras aplicaciones.
  - `CacheStorage`: Almacenamiento seguro bajo el bucket de caché `ngx-storage-manager-v1` (o personalizado).
- **Compatible con Angular 21 y Zoneless:** Diseñada para entornos modernos con inyección de dependencias `inject()`.
- **Serialización Automática:** Serializa y deserializa objetos y tipos primitivos en JSON automáticamente.

---

## Instalación

```bash
npm install @andressaavedra01/ngx-storage-manager
```

---

## Configuración

En tu `app.config.ts`:

```typescript
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideCacheStorage } from '@andressaavedra01/ngx-storage-manager';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    // Opcional: registrar el adaptador de Cache Storage
    provideCacheStorage('mi-cache-personalizada')
  ]
};
```

> **Nota:** LocalStorage viene registrado por defecto. `provideCacheStorage()` es necesario si vas a utilizar el backend `'cache'`.

---

## Uso

Inyecta `StorageManagerService` en tus componentes o servicios:

```typescript
import { Component, inject, OnInit } from '@angular/core';
import { StorageManagerService } from '@andressaavedra01/ngx-storage-manager';

interface Usuario {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-ejemplo',
  standalone: true,
  template: `
    <button (click)="guardar()">Guardar</button>
    <button (click)="cargar()">Cargar</button>
  `
})
export class EjemploComponent implements OnInit {
  private readonly storage = inject(StorageManagerService);

  async guardar(): Promise<void> {
    // Guardar en LocalStorage
    await this.storage.set('local', 'usuario', { id: 1, nombre: 'Andrés' });

    // Guardar en CacheStorage
    await this.storage.set('cache', 'datos_offline', { version: '1.0' });
  }

  async cargar(): Promise<void> {
    // Obtener valor tipado
    const usuario = await this.storage.get<Usuario>('local', 'usuario');
    console.log(usuario?.nombre);

    // Comprobar existencia
    const existe = await this.storage.has('local', 'usuario');
    console.log('¿Existe?:', existe);
  }

  async eliminar(): Promise<void> {
    // Eliminar clave específica
    await this.storage.remove('local', 'usuario');

    // Limpiar únicamente las claves de la librería
    await this.storage.clear('local');
  }
}
```

---

## API

### Métodos de `StorageManagerService`

| Método | Retorno | Descripción |
|---|---|---|
| `set<T>(backend, key, value)` | `Promise<void>` | Almacena o reemplaza un valor serializable en JSON. |
| `get<T>(backend, key)` | `Promise<T \| null>` | Recupera y deserializa el valor, o `null` si no existe. |
| `has(backend, key)` | `Promise<boolean>` | Verifica la existencia de una clave sin deserializar su valor. |
| `remove(backend, key)` | `Promise<void>` | Elimina una clave gestionada del backend especificado. |
| `clear(backend)` | `Promise<void>` | Elimina **únicamente** los datos gestionados por la librería en dicho backend. |

---

## Contribuidores

- [Andrés Saavedra](https://github.com/andressaavedra01)
- [Steven](https://github.com/steven2000300)
- [JSebasAM](https://github.com/JSebasAM)

---

## Licencia

MIT © Andres Saavedra
