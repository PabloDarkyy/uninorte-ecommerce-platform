# Catálogo 3D y transición compartida

## Modelo y origen de los datos

Se conserva `Product.model`, la URL opcional del GLB que entrega el ProductService compartido con Admin. No hay otro catálogo ni otro modelo de producto. `Product.image` sigue siendo el respaldo; sin imagen se conserva la representación conceptual existente.

Agregar o reemplazar un GLB desde Admin actualiza `model`. Al volver al catálogo, cualquier producto con ese campo obtiene automáticamente su vista previa. Las URLs locales `blob:` se admiten igual que los archivos de `src/assets/models/`. No se modificaron GLB, materiales originales, entorno de vidrio, servicios de compra ni contratos de Backend.

## Presupuesto de renderizado

En dispositivos con puntero táctil, `render-budget.js` limita el DPR a 1.5 y el buffer a dos millones de píxeles, incluyendo fullscreen y vuelos. La captura de transmisión usa media resolución; se conservan los GLB y materiales originales. Los límites de textura/renderbuffer del dispositivo también se respetan.

La pérdida de contexto WebGL pausa el visor sin destruirlo. Al restaurarse, se regenera el entorno y se reutiliza el modelo; el catálogo puede reintentar previews fallidos. Sin preview disponible, la ficha se abre inmediatamente con su respaldo y carga el visor en segundo plano, sin bloquear información ni carrito. No se fuerza la recuperación si el sistema no vuelve a habilitar WebGL.

`tests/mobile-3d.cjs` comprueba WebKit y Chromium con pantalla táctil/DPR 3, píxeles visibles, recuperación de contexto y Commerce. `tests/model-fallback.cjs` verifica la ficha y el carrito con WebGL desactivado y descargas GLB detenidas. WebKit de escritorio con emulación móvil no sustituye una prueba en un iPhone físico.

`components/product-preview/product-preview.js` utiliza **un renderer WebGL para todo el catálogo**, con el entorno de estudio existente generado una sola vez. Lo comparte en exclusividad con el detalle seleccionado.

Las tarjetas muestran **capturas renderizadas de sus GLB reales** en canvases 2D transparentes, con cámara fija y sin giro continuo. No son ilustraciones sustitutivas: se calculan usando el mismo visor, iluminación y materiales del detalle. Esta decisión evita un contexto WebGL, OrbitControls y un bucle de animación por tarjeta.

- IntersectionObserver solicita la captura cuando una tarjeta entra en pantalla.
- Una cola serializa las capturas y se pausa durante el detalle.
- ResizeObserver actualiza capturas visibles si cambian sus dimensiones.
- Las tarjetas estáticas no consumen frames continuamente.
- Se conservan como máximo 12 capturas, salvo que más de 12 estén visibles simultáneamente; primero se liberan las que están fuera de pantalla.
- El Hero mantiene su renderer existente y su transición propia. El máximo normal es **dos contextos WebGL simultáneos: Hero + catálogo/detalle**.

El renderer de catálogo se crea al necesitarse y se destruye al salir del módulo, cuando el último consumidor lo libera. El detalle y el fullscreen utilizan el mismo canvas; ampliar no carga nuevamente el archivo.

## Caché y propiedad de los recursos

`modules/three/product-model-cache.js` agrupa por URL absoluta tanto las peticiones en curso como los GLB parseados. Hero, previews y detalle usan este caché. Dos productos que apuntan al mismo archivo comparten su carga.

`acquireProductModel(url, { signal })` devuelve una escena independiente y `release()`:

- Geometrías y texturas compartidas, tratadas como inmutables.
- Materiales clonados por instancia; el ajuste de vidrio existente se aplica a esa copia.
- Transformaciones independientes; los esqueletos se clonan y sus huesos se enlazan a la escena clonada.
- Recuento de consumidores: destruir una instancia no invalida otra.
- Cancelar una espera no cancela la descarga de otros consumidores. Sin interesados, se aborta la petición; si un parseo ya iniciado termina después, se libera su resultado.
- Caché LRU de entradas inactivas: hasta 6 archivos y 32 MiB de tamaño GLB codificado. Ese presupuesto no equivale al tamaño de las texturas descomprimidas. Las entradas activas no se desalojan.

Una URL desalojada puede volver a cargarse al necesitarse; no se conserva una colección ilimitada. Los errores no quedan cacheados permanentemente. La recarga de página reinicia este caché de sesión.

## Viaje y llegada al visor

`modules/product-entrance.js` coordina la transición con el modal existente:

1. La tarjeta responde al clic y se reserva el renderer compartido.
2. Se miden el origen y el visor de destino con `getBoundingClientRect()`.
3. El mismo canvas WebGL que renderiza el detalle pasa a una capa temporal sobre el modal. La captura original se oculta.
4. Durante 900 ms se interpolan simultáneamente centro, escala y distancia de cámara. La corrección de perspectiva conserva el encuadre de origen y el de destino; no se estira el modelo.
5. La información empieza a aparecer desde aproximadamente el 42 % del viaje. El catálogo queda atenuado.
6. El canvas vuelve al contenedor del visor y se renderiza inmediatamente con el encuadre final. Se habilitan los controles existentes y se elimina la capa temporal.

La transición tiene un único RAF que impulsa también el render del modelo; el bucle normal del visor permanece pausado hasta llegar. Las posiciones se calculan para la pantalla actual, sin coordenadas de escritorio reutilizadas en móvil. Al redimensionar, desplazar el diálogo u ocultar la pestaña, se completa la colocación en el visor actual y se limpia el recorrido pendiente.

Sin GLB se utiliza la imagen o representación conceptual como elemento compartido. Se conserva su aspecto durante el viaje y se adapta al contenedor final. Si WebGL no está disponible o falla la carga, se conserva el respaldo. Si un contexto ya utilizado deja de estar disponible, una captura existente puede actuar como respaldo visual.

## Interacción, cancelación y compatibilidad

- Clics adicionales no abren otros detalles mientras el seleccionado está abierto.
- Navegar cancela una apertura pendiente; cerrar cancela o completa el movimiento antes de liberar el visor.
- Los listeners de captura/transición se eliminan al desmontar, y el RAF de viaje no permanece después de llegar.
- Con `prefers-reduced-motion`, se coloca directamente el producto sin recorrido largo.
- No se depende de View Transitions API, CDN ni bibliotecas nuevas.
- La fase Commerce amplía el detalle con selección de variantes, carrito y checkout, manteniendo este renderer y el caché. Ver [contratos Commerce](commerce-contracts.md).

## Verificación

- `tests/catalog-transition.cjs`: carga diferida, peticiones compartidas, dos contextos, ausencia de render continuo, ciclos de apertura/ampliación, clics múltiples, móvil/tablet/escritorio, cancelación, resize, movimiento reducido y productos administrados genéricamente.
- `tests/catalog-projection.cjs`: comparación de límites de píxeles al salir y llegar (tolerancia de 2 px por rasterización), identidad del canvas, aislamiento de instancias y liberación por referencias.
- `tests/product-model-cache.cjs`: esqueletos/huesos independientes, carga concurrente única, recursos activos, límite LRU y cancelación.
- `tests/product-entrance.test.js`: extremos, crecimiento simultáneo y progresión de la información.
- Regresiones del Hero, visor, Cuenta y Administración. La prueba visual del Hero admite únicamente diferencias de cuantización de 1/255 en menos del 0,1 % de los canales; esa diferencia también se reproduce con el visor previo y el GLB actual.

La fluidez depende del dispositivo, resolución y complejidad de los GLB. El diseño evita trabajo continuo del catálogo, pero no garantiza 60 FPS para cualquier archivo o hardware.
## Rotación automática del Hero

`components/hero/hero-rotation.js` recorre los productos con modelos distintos de ProductService cada 8 segundos de inactividad. Reutiliza el visor y la caché existentes, sin crear otro renderer. Precarga el siguiente modelo antes de un cambio breve de opacidad.

Scroll, resize, interacción del puntero/teclado, un modal abierto o una pestaña oculta posponen el cambio. El cambio automático se desactiva con movimiento reducido y mientras el Hero está en su transición de scroll. Los temporizadores, animaciones y listeners se eliminan al desmontar la vista. `setModel` comprueba que el cambio siga permitido antes y después del fade; conserva el modelo anterior si falla la carga.
