# GlobalizaT · plataforma e-commerce UniNorte

GlobalizaT es una plataforma académica de comercio electrónico para presentar productos paraguayos. Integra una interfaz en HTML, CSS y JavaScript, una API HTTP en Node.js y persistencia relacional en PostgreSQL. Incluye catálogo 3D, carrito, compra, cuenta del cliente y administración. También ofrece modo oscuro, con un selector en la barra de navegación y en la pantalla de inicio de sesión; sigue la preferencia del sistema operativo hasta que el usuario elige un modo.

## Demo pública

La demo disponible en [GitHub Pages](https://pablodarkyy.github.io/uninorte-ecommerce-platform/) es una versión **congelada, solo frontend**, correspondiente al tag `stable-pages-pre-fullstack` (commit `db6e79c`). Usa datos simulados locales, no se conecta al backend ni a PostgreSQL y no representa el estado full-stack de esta rama.

## Inicio rápido local

Requisitos: Node.js 22.5 o posterior y PostgreSQL. La [guía de instalación](docs/instalacion.md) explica las alternativas con pgAdmin y terminal.

1. Clona el repositorio y entra en él:

   ```sh
   git clone https://github.com/PabloDarkyy/uninorte-ecommerce-platform.git
   cd uninorte-ecommerce-platform
   ```

   Hasta que la integración se incorpore a `main`, la versión full-stack vive en la rama `integration/fullstack-final` (`git clone -b integration/fullstack-final https://github.com/PabloDarkyy/uninorte-ecommerce-platform.git`).

2. Instala la única dependencia del backend (`pg`):

   ```sh
   npm run setup
   ```

3. Crea la base `globalizat` y copia la configuración:

   ```sh
   createdb -U postgres globalizat
   ```

   Como alternativa, créala con pgAdmin mediante [`database/00_create_database.sql`](database/00_create_database.sql), según la [guía de instalación](docs/instalacion.md).

   ```powershell
   # Windows PowerShell
   Copy-Item backend/.env.example backend/.env
   ```

   ```sh
   # macOS/Linux
   cp backend/.env.example backend/.env
   ```

4. Edita `backend/.env` y define `DATABASE_URL` con tu usuario, contraseña y base local. No confirmes ese archivo en Git.

5. Inicia frontend y backend:

   ```sh
   npm run start:all
   ```

6. Abre <http://127.0.0.1:4173> y comprueba la API en <http://127.0.0.1:4000/api/health>.

Al arrancar, el backend aplica el esquema y carga la semilla si la tabla `users` está vacía.

## Credenciales locales de demostración

Estas credenciales son exclusivamente para la **demo local** y no deben reutilizarse en un entorno real:

| Perfil | Correo | Contraseña |
|---|---|---|
| Cliente | `lucia.benitez@example.com` | `Demo12345!` |
| Administración | `admin@globalizat.demo` | `Admin12345!` |

La pantalla de acceso también ofrece **Entrar con la cuenta de demostración** para iniciar la sesión del cliente.

## Stack

- Frontend: HTML5, CSS3 y JavaScript con ES modules, sin compilación ni framework.
- 3D: Three.js r180 incluido en `src/vendor/three`; 11 modelos GLB almacenados directamente en Git (aprox. 27 MB en total, máximo 6,1 MB; sin Git LFS).
- Backend: Node.js 22.5+ con `node:http`, router propio y `pg` como única dependencia.
- Base de datos: PostgreSQL 14+ recomendado; PostgreSQL 17 verificado.
- Pruebas: `node:test`; recorridos de navegador opcionales con Playwright y Edge.

## Estructura del repositorio

```text
.
├── .github/
│   └── workflows/
├── backend/
│   ├── scripts/
│   ├── src/
│   ├── tests/
│   ├── uploads/
│   ├── .env.example
│   └── package.json
├── database/
│   ├── 00_create_database.sql
│   ├── schema.sql
│   └── seed.sql
├── docs/
│   ├── contratos/
│   └── historial/
├── scripts/
│   ├── serve.js
│   └── start-all.js
├── src/
│   ├── assets/
│   ├── components/
│   ├── config/
│   ├── data/
│   ├── features/
│   ├── locales/
│   ├── modules/
│   ├── pages/
│   ├── services/
│   ├── styles/
│   └── vendor/
├── tests/
├── index.html
└── package.json
```

## Scripts

| Ubicación | Comando | Función |
|---|---|---|
| Raíz | `npm run setup` | Instala de forma reproducible las dependencias del backend con `npm ci`. |
| Raíz | `npm run start:all` | Sirve el frontend en `127.0.0.1:4173` y el backend en `127.0.0.1:4000`. |
| Raíz | `npm run start:frontend` | Sirve únicamente el frontend. |
| Raíz | `npm run start:backend` | Inicia únicamente el backend. |
| Raíz | `npm test` | Ejecuta las pruebas unitarias/contractuales del frontend (`tests/*.test.js`). |
| Raíz | `npm run test:backend` | Ejecuta las pruebas del backend; requiere `TEST_DATABASE_URL`. |
| `backend/` | `npm start` | Inicia la API. |
| `backend/` | `npm run dev` | Inicia la API con `--watch`. |
| `backend/` | `npm run db:check` | Comprueba conexión, tablas, conteos y claves foráneas. |
| `backend/` | `npm run db:reset` | Vacía los datos de aplicación; la próxima ejecución vuelve a sembrarlos. |

## Pruebas

```sh
npm test
```

Las pruebas del backend requieren una base descartable cuyo nombre termine exactamente en `_test`:

```powershell
$env:TEST_DATABASE_URL = "postgresql://USUARIO:CONTRASENA@127.0.0.1:5432/globalizat_test"
npm run test:backend
```

```sh
TEST_DATABASE_URL='postgresql://USUARIO:CONTRASENA@127.0.0.1:5432/globalizat_test' npm run test:backend
```

La protección se implementa en `backend/tests/support/database-guard.js`. Los archivos `tests/*.cjs` son pruebas de navegador opcionales y requieren Playwright/Edge; no forman parte de `npm test`.

## Documentación

- [Instalación local](docs/instalacion.md)
- [Flujo de compra y prueba manual](docs/flujo-de-compra.md)
- [Arquitectura](docs/arquitectura.md)
- [Frontend](docs/frontend.md)
- [API del backend](docs/backend-api.md)
- [Base de datos](docs/base-de-datos.md)
- [Variables de entorno](docs/variables-entorno.md)
- [Funcionalidades reales y simuladas](docs/funcionalidades.md)
- [Despliegue](docs/despliegue.md)
- [Problemas conocidos](docs/problemas-conocidos.md)
- [Documentación de la base de datos](database/README.md)

## Créditos

Proyecto académico - UniNorte.

- Grupo 1 - _pendiente: integrantes_
- Grupo 2 - _pendiente: integrantes_
- Grupo 3 - _pendiente: integrantes_
- Grupo 4 - _pendiente: integrantes_
- Grupo 5 - _pendiente: integrantes_

No se encontró un archivo `LICENSE` para el proyecto, por lo que no hay una licencia general definida. La copia vendorizada de Three.js conserva su propia licencia MIT en [`src/vendor/three/LICENSE`](src/vendor/three/LICENSE).
