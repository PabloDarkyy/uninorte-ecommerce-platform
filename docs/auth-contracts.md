# Acceso local · GlobalizaT

Esta fase simula registro e inicio de sesión, sin Backend ni autorización real. El router muestra `features/auth/auth.js` antes de montar las vistas. `authService` expone `register`, `login`, `loginDemo`, `logout` y `getCurrentUser`; las vistas no acceden directamente a los registros.

La identidad activa vive en memoria: abrir otra pestaña o recargar exige ingresar nuevamente. La navegación interna conserva la sesión. Cerrar sesión limpia el carrito y recarga la aplicación. La cuenta demo permite probar los datos semilla sin registro.

Los registros locales utilizan `globalizat.auth.demo.v1`, con sal aleatoria y derivación PBKDF2/SHA-256 de 120.000 iteraciones. No se almacena la contraseña en texto plano. El registro requiere Web Crypto (HTTPS o localhost) y almacenamiento local disponible. Estos registros no son credenciales de servidor ni protegen los archivos públicos de GitHub Pages; utilizar datos ficticios.

Al ingresar, `activateAccount` selecciona el repositorio de la identidad sin reemplazar la instancia de servicios compartida. Cada cuenta nueva comienza sin direcciones ni pedidos; perfil, direcciones y pedidos usan `globalizat.account.<id>.v1`. La cuenta demo conserva `uninorte.account.demo.v1`. El correo de acceso pertenece al registro local; editar el correo del perfil no modifica ese registro. El catálogo mock continúa siendo compartido durante la sesión.

Backend deberá sustituir este servicio por autenticación y autorización reales, definir sesiones y persistencia, y proteger Administración. No existen roles ni endpoints definitivos en esta fase.

## Verificación

`tests/auth.test.js` comprueba credenciales derivadas, sesión no persistente y aislamiento de cuentas. `tests/experience-browser.cjs` recorre registro, recarga, login, logout, acceso demo y móvil. Los recorridos anteriores ingresan explícitamente con la cuenta demo mediante `tests/demo-login.cjs`.
