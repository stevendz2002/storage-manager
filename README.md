# Storage Manager Project

Workspace monorepo de Angular 21 para la librería `@andressaavedra01/ngx-storage-manager` y su aplicación de demostración (**Showcase**).

---

## Requisitos Previos

- **Node.js:** `24.13.1` (o compatible `>=24.x`)
- **NPM:** `11.10.1` (o superior)
- **Angular CLI:** `21.2.23`

```bash
# Con NVM (opcional)
nvm install 24.13.1
nvm use 24.13.1
npm install --global npm@11.10.1
```

---

## Instalación de Dependencias

Clona el repositorio e instala las dependencias exactas del workspace:

```bash
npm ci
```

---

## 📦 1. Ejecutar y Compilar la Librería (`ngx-storage-manager`)

### Modo Observador / Watch (Desarrollo continuo)
Compila y escucha cambios en tiempo real en `projects/ngx-storage-manager/src/`:

```bash
npx ng build ngx-storage-manager --watch
```
> Cada vez que guardes cambios en el código de la librería, se compilará automáticamente en `dist/ngx-storage-manager`.

### Build de Producción
Para empaquetar la versión lista para distribución / NPM:

```bash
npm run build
```

---

## 🎮 2. Ejecutar el Showcase Interactivo (`src/`)

El workspace incluye una aplicación Angular 21 Zoneless en `src/` diseñada para probar de forma interactiva todas las funcionalidades de la librería (LocalStorage, CacheStorage, namespaces, contador persistente e inspector de almacenamiento).

### Paso para ejecutar:
En una terminal (mientras la librería está construida o en modo `--watch`):

```bash
npm start
```
*(O alternativamente: `npx ng serve showcase`)*.

Una vez compilado, abre en tu navegador:
👉 **[http://localhost:4200](http://localhost:4200)**

---

## 🧪 3. Pruebas Unitarias y Cobertura

Para ejecutar las pruebas unitarias basadas en Vitest:

```bash
# Ejecutar todas las pruebas unitarias
npm test

# Ejecutar pruebas con reporte de cobertura (100% requerido)
npm run coverage
```

---

## 📚 4. Generación de Documentación (Compodoc)

Para generar y servir la documentación técnica generada a partir de los docstrings:

```bash
npm run docs
```

---

## 👥 Contribuidores

- [Andrés Saavedra](https://github.com/andressaavedra01)
- [Steven](https://github.com/steven2000300)
- [JSebasAM](https://github.com/JSebasAM)

---

## Licencia

Este proyecto está bajo la licencia [MIT](LICENSE).
