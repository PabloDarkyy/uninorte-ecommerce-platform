# GT · GlobalizaT

**GlobalizaT: Tecnología y Comercio para Conectar con el Mundo.**

Proyecto universitario de e-commerce de UniNorte para presentar productos paraguayos. El repositorio integra el Frontend en HTML/CSS/JavaScript, un Backend Node.js y una base de datos PostgreSQL.

## Arquitectura

```text
Navegador / GitHub Pages
        │ HTTPS + API
        ▼
Backend Node.js (Render)
        │ DATABASE_URL
        ▼
PostgreSQL (Neon)
```

La parte visual incluye catálogo y visor 3D, carrito, checkout, perfil, direcciones, seguimiento y panel de administración. Las funciones de acceso, catálogo, stock, pedidos, tracking y analítica del navegador utilizan el Backend. PostgreSQL conserva usuarios, perfiles, preferencias, direcciones, productos, variantes, pedidos, stock y seguimiento.

El checkout es una demostración académica: no realiza cobros reales. No introducir datos bancarios ni contraseñas personales en este proyecto.

## Ejecutar localmente

Requiere Node.js 22.5 o posterior y una instancia PostgreSQL.

1. Crea la base `globalizat` siguiendo `database/README.md`.
2. Copia `backend/.env.example` a `backend/.env` y configura `DATABASE_URL` con la contraseña de tu instalación. No subas `backend/.env` a GitHub.
3. Instala las dependencias del backend desde `backend/` con `npm install`.
4. Desde la raíz ejecuta `npm run start:all`.

Frontend: `http://127.0.0.1:4173` · API: `http://127.0.0.1:4000/api/health`.

## Verificación de PostgreSQL

Desde `backend/`, ejecuta `npm run db:check`. El backend aplica el esquema y carga los datos de prueba al arrancar si la base está vacía. Los scripts SQL están en `database/`.

## Publicar para que otros ingresen sin instalar nada

- **Frontend:** GitHub Pages mediante `.github/workflows/pages.yml`.
- **Backend:** Render, configurado mediante `render.yaml`.
- **Base de datos:** PostgreSQL administrado, por ejemplo Neon. No se incluye una contraseña ni URL privada en el repositorio.

Para activar la demo pública, crea una base PostgreSQL remota, despliega el servicio Render y define en GitHub → Settings → Secrets and variables → Actions → Variables la variable pública `GLOBALIZAT_API_URL` con la URL base del Backend, sin `/api`. Configura en Render `DATABASE_URL` y `SEED_ADMIN_PASSWORD` como variables secretas, y confirma que `CORS_ORIGIN` sea `https://pablodarkyy.github.io`. GitHub Pages desplegará la versión integrada cuando la variable esté configurada.

Los planes gratuitos pueden suspender servicios inactivos, por lo que la primera petición puede tardar unos segundos. En un despliegue de demostración, los archivos cargados desde Administración pueden no tener almacenamiento persistente.

## Documentación

- `database/README.md`: esquema, datos de prueba y verificación.
- `backend/README.md`: ejecución del API y configuración de PostgreSQL.
- `docs/`: contratos y decisiones de diseño del Frontend.
