# Entrega del integrante 1

Validado el 14 de noviembre de 2026.

## Estado

- Base compilable publicada en `main`: `52de1cb`.
- Corrección del lockfile DevKit para Angular 21 publicada en `main`: `5fa9b39`.
- Contratos y nombres compartidos fijados sin cambiar las firmas solicitadas.
- LocalStorage y fachada implementados en `feat/local-storage`.
- No se implementó Cache Storage ni Showcase, asignados a otros integrantes.
- No se publicó en NPM; falta validar el ámbito público con el integrante 3.

Se trabajó en una copia Linux del repositorio remoto. No se modificó directamente
la carpeta Windows del usuario ni se ejecutaron pruebas en Windows/PowerShell.

## Decisiones de arquitectura

La fachada selecciona adaptadores mediante `StorageBackend`. Ambos implementan
`StorageAdapter`, con Promise en todas las operaciones. Angular DI crea los
servicios raíz. La fachada mantiene `LocalStorageAdapter` como detalle interno y
resuelve Cache a través de un InjectionToken tipado, sin una implementación falsa.
El adaptador Cache futuro puede registrarse sin modificar la fachada.

El adaptador local usa JSON y resuelve el almacenamiento nativo únicamente al
operar, para permitir crear el servicio en SSR. Las operaciones sin LocalStorage
rechazan con un Error. Se conserva la causa original de errores de serialización,
JSON inválido, cuota y acceso del navegador. No se silencian errores de lectura ni
se borran registros corruptos automáticamente.

El prefijo `ngxsm:` es un espacio compartido por esta librería; `clear('local')`
solo borra las claves con ese prefijo, tomando primero una lista de claves para
no saltarse registros al cambiar sus índices. La API no ofrece transacciones:
un fallo durante clear puede dejar algunas claves ya eliminadas.

`get<T>` no valida esquemas en ejecución. Un JSON null almacenado y una clave
ausente devuelven null; `has` permite distinguirlos. JSON.stringify conserva sus
reglas nativas para propiedades undefined, fechas y números no finitos; los
valores raíz sin representación JSON, BigInt y ciclos se rechazan.

## Uso de la API pública

```typescript
import { inject, Injectable } from '@angular/core';
import { StorageManagerService } from 'ngx-storage-manager';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly storage = inject(StorageManagerService);

  async guardarYLeer() {
    await this.storage.set('local', 'usuario', { nombre: 'Carlos', edad: 22 });
    return this.storage.get<{ nombre: string; edad: number }>('local', 'usuario');
  }
}
```

El import usa el nombre interno y el alias del workspace después del build.
No implica que este nombre esté publicado o disponible en NPM.
Para Cache, seguir el contrato de `INTEGRATION.md` después de implementar el módulo.

## Verificación realizada

Entorno: Linux x64, Node 24.13.1, npm 11.10.1, Angular/CLI 21.2.23,
TypeScript 5.9.3, Vitest y coverage-v8 4.0.8, Compodoc 2.0.0.

- `npx ng build ngx-storage-manager`: correcto, paquete Angular en compilación parcial.
- `npx ng test ngx-storage-manager --watch=false --coverage`: 45 pruebas correctas.
- `npm run docs`: correcto, documentación generada en `documentation/`.
- `npm ci` y `npm ls`: instalación reproducible, Angular/DevKit 21.2.23 sin versiones 22.
- `npx prettier --check .`: correcto.
- `npm pack ./dist/ngx-storage-manager --dry-run`: paquete válido, sin publicar.

| Métrica    | Cubierto | Total | Cobertura |
| ---------- | -------- | ----- | --------- |
| Statements | 53       | 53    | 100%      |
| Branches   | 25       | 25    | 100%      |
| Functions  | 18       | 18    | 100%      |
| Lines      | 45       | 45    | 100%      |

Se incluye todo `projects/ngx-storage-manager/src/**/*.ts` en cobertura y se
exige el 100% por archivo ejecutable. Interfaces, tipos y reexports carecen de
sentencias ejecutables; V8 puede mostrarlos con cero elementos. No se excluyeron
archivos de producción para aumentar la cobertura.

La evidencia JSON está en `evidence/coverage-summary.json`. Los informes HTML
se regeneran en `coverage/ngx-storage-manager/index.html` y `documentation/index.html`.
Los archivos generados no se versionan. Esta cobertura corresponde al código
existente del integrante 1 y debe recalcularse al incorporar Cache.

## Recuperar la rama en Windows

Desde la carpeta local del repositorio, conservando antes cualquier cambio propio:

```powershell
git fetch origin
git switch --track origin/feat/local-storage
nvm install 24.13.1
nvm use 24.13.1
npm install --global npm@11.10.1
npm ci
npx ng version
npm run build
npm run coverage
npm run docs
Start-Process .\coverage\ngx-storage-manager\index.html
Start-Process .\documentation\index.html
```

Si la rama ya existe localmente, usar `git switch feat/local-storage` y actualizarla
con `git pull --ff-only` después de conservar cambios propios.

## Trabajo pendiente del equipo

Integrante 2: adaptar Cache al contrato compartido, registrar su proveedor,
completar Compodoc y agregar pruebas reales de su módulo y de integración.
Integrante 3: definir nombre NPM verificable, publicar, consumir desde el Showcase
independiente, completar README y producir el PDF con evidencias del conjunto.
