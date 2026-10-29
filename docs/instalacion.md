# Instalación local

Esta guía prepara el frontend, la API y PostgreSQL para desarrollo local.

## Requisitos previos

- Node.js 22.5 o posterior.
- PostgreSQL 14 o posterior recomendado; PostgreSQL 17 verificado.
- Git.
- pgAdmin 4 opcional para administrar PostgreSQL visualmente.

Comprueba las versiones:

```sh
node --version
npm --version
psql --version
git --version
```

## 1. Clonar e instalar

```sh
git clone https://github.com/PabloDarkyy/uninorte-ecommerce-platform.git
cd uninorte-ecommerce-platform
npm run setup
```

Hasta que la integración se incorpore a `main`, la versión full-stack vive en la rama `integration/fullstack-final` (`git clone -b integration/fullstack-final https://github.com/PabloDarkyy/uninorte-ecommerce-platform.git`).

`npm run setup` ejecuta `npm ci` dentro de `backend/` e instala `pg`, la única dependencia de ejecución.

## 2. Crear la base de datos

Elige una de estas alternativas.

### Opción A: pgAdmin 4

1. Conecta pgAdmin al servidor PostgreSQL.
2. Abre **Query Tool** sobre la base `postgres`.
3. Ejecuta [`../database/00_create_database.sql`](../database/00_create_database.sql).
4. Actualiza el árbol y verifica que aparezca `globalizat`.

### Opción B: terminal

```sh
createdb -U postgres globalizat
```

Si `createdb` no está disponible, ejecuta el archivo desde `psql` conectado a `postgres`:

```sh
psql -U postgres -d postgres -f database/00_create_database.sql
```

## 3. Configurar el backend

Copia el ejemplo; `backend/.env` está ignorado por Git y nunca debe contenerse en un commit.

```powershell
# Windows PowerShell
Copy-Item backend/.env.example backend/.env
```

```sh
# macOS/Linux
cp backend/.env.example backend/.env
```

Edita `backend/.env` y configura una URL válida para tu instalación:

```env
DATABASE_URL=postgresql://USUARIO:CONTRASENA@127.0.0.1:5432/globalizat
```

No copies credenciales reales a documentación, incidencias o commits. Consulta [Variables de entorno](variables-entorno.md) para el resto de opciones.

## 4. Elegir la carga inicial

### Semilla automática recomendada

No ejecutes archivos adicionales. Al iniciar, el backend:

1. se conecta a PostgreSQL;
2. aplica `backend/src/db/schema.sql`, que es idempotente;
3. si `users` está vacía, carga la semilla saneada desde `backend/src/data/seed.js`.

### SQL manual alternativo

Con la base `globalizat` seleccionada, ejecuta en orden:

```sh
psql -U postgres -d globalizat -f database/schema.sql
psql -U postgres -d globalizat -f database/seed.sql
```

`database/seed.sql` es idempotente. El conjunto verificado contiene 2 usuarios, 2 direcciones, 6 productos, 12 traducciones de producto, 10 variantes, 6 pedidos, 11 líneas de pedido y 15 etapas de seguimiento.

No combines ambas semillas sobre datos que quieras conservar. La semilla automática solo se activa cuando `users` no tiene filas.

## 5. Iniciar la plataforma

Desde la raíz:

```sh
npm run start:all
```

Abre:

- Frontend: <http://127.0.0.1:4173>
- Salud de la API: <http://127.0.0.1:4000/api/health>

La respuesta de salud esperada es:

```json
{"ok":true,"service":"globalizat-backend"}
```

No abras `index.html` con doble clic: los ES modules y los modelos necesitan un servidor HTTP.

## Reiniciar los datos

Con `DATABASE_URL` apuntando a la base local correcta:

```sh
cd backend
npm run db:reset
cd ..
npm run start:all
```

El reset trunca los datos de aplicación, conserva `tracking_stages` y la siguiente ejecución carga la semilla automática. Es una operación destructiva para la base configurada.

## Solución de problemas

| Síntoma | Causa probable | Acción |
|---|---|---|
| `EADDRINUSE` o “port in use” | El puerto 4000 o 4173 ya está ocupado. | Detén el proceso anterior; para la API también puedes cambiar `PORT`, pero el frontend espera 4000 salvo que se configure `window.__GLOBALIZAT_API_URL__`. |
| `password authentication failed` | Usuario o contraseña incorrectos en `DATABASE_URL`. | Verifica la credencial local de PostgreSQL y codifica caracteres especiales en la URL. |
| `ECONNREFUSED` a PostgreSQL | El servicio no está iniciado, o host/puerto son incorrectos. | Inicia PostgreSQL y comprueba `127.0.0.1:5432`. |
| Error de red desde el navegador | Backend detenido o URL de API incorrecta. | Comprueba `/api/health` y que ambos procesos sigan activos. |
| Bloqueo por CORS | `CORS_ORIGIN` no coincide exactamente con el origen del frontend. | Para el inicio estándar usa `http://127.0.0.1:4173`; `localhost` y `127.0.0.1` son orígenes distintos. |
| Sintaxis no admitida o fallo de `engines` | Node.js es anterior a 22.5. | Actualiza Node.js y vuelve a ejecutar `npm run setup`. |
| Las pruebas del backend rechazan la base | `TEST_DATABASE_URL` falta o no termina en `_test`. | Crea una base descartable, por ejemplo `globalizat_test`, y define esa variable solo para las pruebas. |

Para inspeccionar el estado de la base:

```sh
cd backend
npm run db:check
```
