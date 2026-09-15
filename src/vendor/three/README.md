# Three.js local

Versión fijada: r180 / 0.180.0. Fuente: https://github.com/mrdoob/three.js/tree/r180. Licencia MIT en `LICENSE`.

Se copiaron sin modificar los builds ES Modules minificados y los addons OrbitControls, GLTFLoader, BufferGeometryUtils y RoomEnvironment desde el repositorio oficial. `index.html` resuelve `three` y `three/addons/` mediante un import map a estas rutas locales. No se utiliza CDN ni conexión a Internet en ejecución.

Actualizar núcleo y addons juntos, manteniendo la misma versión. No editar los archivos del proveedor para añadir lógica de la aplicación.
