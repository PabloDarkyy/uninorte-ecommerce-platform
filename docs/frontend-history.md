# Notas históricas de implementación del frontend

Este documento conserva el README anterior a la preparación de GitHub. Describe distintas fases y contiene afirmaciones históricas que ya no representan todo el estado actual (por ejemplo, la ausencia de Admin o las características de versiones anteriores de los modelos). Para el estado vigente, consultar el README principal y los contratos de Account y Admin. Se conserva como referencia técnica; no define compromisos de Backend.

---

# UniNorte · Tierra & Origen

Frontend académico en HTML5, CSS3 propio y JavaScript con ES Modules. Esta fase conserva el diseño existente y añade la botella 3D del Licor de mandioca en el hero y su modal, transición por scroll y superficies glass. Sin frameworks, backend, login, checkout, admin ni nuevas rutas.

## Ejecutar sin Internet

Requisito: Node.js 20 o posterior instalado previamente. Desde esta carpeta:

```sh
node scripts/serve.js
```

Abrir http://127.0.0.1:4173 y detener con Ctrl+C. No ejecutar `npm install`. El GLB, Three.js, fuentes del sistema y demás recursos son locales. No abrir `index.html` con doble clic: los módulos necesitan HTTP.

## Arquitectura

La fase de **Cuenta del cliente** está disponible desde Perfil en el navbar o `#/account`. Incluye resumen, edición de perfil y avatar local, seguimiento simulado, historial, direcciones y preferencias. Su arquitectura, estructuras de datos y operaciones sugeridas para Backend están documentadas en [docs/account-contracts.md](docs/account-contracts.md). El punto único para sustituir los mocks es `src/features/account/services/index.js`.

```text
src/app.js, router.js        Inicio, secciones y desmontaje de la vista
src/pages/home/home.js      Compone hero y catálogo; selecciona heroFeatured
src/components/
  hero/                     Composición y transición por scroll
  product-stage/            Exhibición compartida, respaldo y montaje diferido
  product-card/             Cards estáticas con accentColor (sin canvas)
  product-modal/            Preview accesible y liberación del visor al cerrar
  navbar/, footer/          Componentes existentes
src/modules/three/
  product-viewer.js          Visor Three.js reutilizable
  three-utils.js             Normalización y liberación de recursos del GLB
src/services/               Contrato async de productos, sin API
src/data/products.js        Fuente única de datos y rutas de modelos
src/styles/tokens.css       Paleta, transición, glass y animaciones
src/vendor/three/           Three.js r180 (0.180.0), addons y licencia MIT
src/assets/models/         GLB local del licor
```

Flujo: home → productService → products.js → componentes. Los enlaces `#/home`, `#/catalog`, `#/about` y `#/contact` siguen apuntando a secciones. Los módulos antiguos de Fase 1 se conservan sin montar; idioma, moneda y carrito siguen siendo solo visuales.

## ProductViewer

`createProductViewer({ container, modelUrl, label, autoRotate, interactive, initialRotation, camera, lighting })` devuelve:

- `ready`: promesa que resuelve `true` si se cargó o `false` si se canceló/falló.
- `setScrollProgress(0..1)`: método previo de acercamiento suave, conservado por compatibilidad; el hero utiliza ahora `setTransitionFrame`.
- `configureTransition({ layer, width, height, origin })`: traslada el mismo canvas del hero a su overlay y ajusta la proyección al viewport.
- `setTransitionFrame(state)`: aplica el estado cinematográfico calculado por scroll; bloquea temporalmente OrbitControls y el giro automático.
- `dispose()`: limpieza idempotente.
- `getState()`: estado de lectura para verificar pausa, giro y ciclo de vida.

El GLB se centra y normaliza según sus límites; la cámara se ajusta a su esfera envolvente. Canvas transparente, pixel ratio máximo 2, iluminación Hemisphere/Key/Fill/Rim y entorno de estudio generado localmente. Se respetan geometría y materiales del archivo.

OrbitControls permite arrastrar con mouse/touch, con damping, sin pan y con límites verticales. El hero deja pasar la rueda para navegar; el modal permite un zoom reducido (94–108% de la distancia de encuadre). Mayúsculas + flechas permite girar con teclado. En móvil se conserva el desplazamiento vertical de página sobre el hero.

La rotación automática se aplica al modelo, no al giro orbital de la cámara, para conservar la inclinación visual hacia la derecha. Se detiene al interactuar y vuelve gradualmente tras 3 segundos. No hay helpers ni controles técnicos visibles.

El visor pausa al salir de pantalla, ocultar la pestaña o quedar detrás de un modal. `prefers-reduced-motion` desactiva el giro automático y los desplazamientos de scroll; se renderiza bajo demanda para mantener la interacción manual. ResizeObserver adapta el canvas al contenedor.

Al cerrar se cancela RAF/descarga, se eliminan listeners y observers, se liberan controles, geometrías, materiales, texturas, ImageBitmap, entorno y renderer, y se retira el canvas. Cada instancia tiene recursos propios. Si el GLB termina de parsearse después de cerrar, también se libera.

## Modelo del licor y futuros productos

En `src/data/products.js`, la séptima posición de cada entrada es la ruta opcional del modelo; la octava marca el protagonista del hero:

```js
['licor', 'Licor de mandioca', 'Cassava liqueur', 'Bebidas', 'Drinks',
 '#AF7545', './src/assets/models/licor-mandioca.glb', true]
```

La transformación produce `model` y `heroFeatured`. Los demás productos conservan `model: null`. La UI no compara nombres ni IDs: monta 3D si `product.model` tiene valor. Agregar una ruta GLB local al final de otra entrada habilita su modal 3D sin editar ProductCard/ProductModal. Dejar el último valor omitido o `false` mantiene al licor como protagonista. Las cards permanecen estáticas siempre.

Para reemplazar la botella, copiar el nuevo GLB a `src/assets/models/` y actualizar esa ruta; también se puede reemplazar el archivo actual y recargar con Ctrl+F5 por la caché local de una hora. Se recomienda cambiar el nombre cuando cambie el contenido. No hace falta editar hero.js.

El archivo entregado pesa 88.616 bytes, contiene dos mallas y **no contiene imágenes, texturas ni etiqueta gráfica**. Su aspecto blanco es el material original. La copia local es idéntica al original (SHA-256 verificado). No se inventaron texturas comerciales. El respaldo existente es el recipiente conceptual HTML/CSS (`image: null`), que se oculta solo cuando el modelo se muestra correctamente. Ante un fallo HTTP/WebGL vuelve ese respaldo; el error se registra exclusivamente en consola.

El montaje exacto sigue en `product-stage.js`: `[data-model-mount]`. `mountProductStage` importa el visor de forma diferida; el modal crea su instancia únicamente cuando se abre. El servidor permite reutilizar la descarga GLB desde la caché del navegador.

## Transición cinematográfica Hero → catálogo

`hero.js` envuelve la composición existente en `.hero-transition > .hero-sticky`. El mismo renderer, modelo y canvas del hero se reutilizan en un overlay del tamaño del viewport, dentro del sticky. La botella puede salir de la card sin quedar recortada por ella. El catálogo sigue después del wrapper.

`src/components/hero/hero-scroll.js` calcula `scrollProgress = clamp01((scrollY - start) / distance)`: `start` es la posición documental del wrapper menos el desplazamiento superior del sticky; `distance` es la altura del wrapper menos la altura visual del sticky. Las medidas se cachean y se actualizan al montar, redimensionar o cambiar el layout. El listener pasivo solo solicita un requestAnimationFrame.

`src/components/hero/hero-transition.js` transforma ese avance en posición, escala, rotación, opacidad y mezcla de color:

| Progreso | Estado |
| --- | --- |
| 0–0.15 | Composición inicial; interacción y giro automático hasta 0.12. |
| 0.15–0.40 | Salida de la card, crecimiento y comienzo del giro. |
| 0.40–0.70 | Llega al centro (0.55) y termina horizontal (0.70). |
| 0.70–0.90 | Acercamiento inicial; macro acelerado desde 0.80. |
| 0.82–1 | Transición hacia la paleta natural existente. |
| 0.90–1 | Crecimiento final y desaparición de la botella. |

El texto se desvanece entre 0.30 y 0.70 y se desplaza como máximo 18 px; las decoraciones entre 0.15 y 0.65. Los elementos permanecen en el DOM; el contenido invisible deja de recibir foco.

### Ajustes

- **Zoom:** `transitionConfig.macroZoom` (7) multiplica la escala central. `exitGrowth` (1.1) añade el último acercamiento durante el fade.
- **Rotación horizontal:** `transitionConfig.horizontalRotation` (`Math.PI / 2`, 90°); `secondaryRotation` controla el giro suave en Y.
- **Recorrido:** `--hero-scroll-distance: 140svh` en `hero.css`, sumado a la altura visual del hero. En desktop el wrapper mide aproximadamente 228vh; en móvil conserva la altura necesaria para la composición apilada.
- **Mobile/tablet:** `mobileZoomFactor: 0.65` hasta 700 px y `tabletZoomFactor: 0.8` hasta 1100 px. La escala previa al macro se adapta al ancho disponible. Se mantienen todas las fases y el scroll táctil vertical.
- **Movimiento reducido:** sin viaje, giro cinematográfico ni macro; mantiene la botella en su origen, un fade pequeño y la mezcla de color. El recorrido adicional baja a 35svh.
- **Debug:** abrir `http://127.0.0.1:4173/?debugScroll=1`. El indicador no se crea sin ese parámetro.

La reversibilidad utiliza exactamente la misma función para bajar y subir. Desde 0.12, la cámara, el giro y el tamaño dependen únicamente del progreso, sin reloj ni animación de reproducción única. Al volver por debajo de 0.12 se recuperan los controles y el giro automático aumenta suavemente. Las medidas se recalculan al cambiar de tamaño de pantalla.

### Color y glassmorphism

En `tokens.css`:

- `--background` → `--nature-bg`: colores de origen y destino.
- `--nature-mix`: porcentaje controlado por scroll.
- `--ambient-bg`, `--ambient-green`: colores interpolados aplicados al fondo y título del catálogo.
- `--nature-deep`, `--nature-green`, `--nature-leaf`, `--nature-earth`, `--nature-clay`, `--nature-cream`: paleta natural disponible.
- `--glass-bg`, `--glass-bg-strong`, `--glass-border`, `--glass-highlight`, `--glass-blur`, `--glass-shadow`: transparencia, borde, reflejo, desenfoque y sombra.
- `--transition-normal`: hover de 320 ms con curva suave.

`colorMix` usa smoothstep entre 0.82 y 1 y actualiza `--nature-mix`. `--transition-progress` expone el avance completo en el wrapper; `--hero-model-opacity`, `--hero-copy-opacity`, `--hero-copy-shift` y `--hero-decoration-opacity` controlan sus elementos. El cambio de fondo conserva la paleta y el layout de las cards.

### Archivos de esta mejora

Modificados: `src/components/hero/hero.js`, `hero.css`, `hero-scroll.js`, `src/components/product-stage/product-stage.js`, `src/modules/three/product-viewer.js`, `tests/three-viewer.cjs` y este README. Creados: `src/components/hero/hero-transition.js`, `tests/hero-transition.test.js` y `tests/hero-scroll.cjs`.

## Archivos de esta fase

Creados: `modules/three/product-viewer.js`, `modules/three/three-utils.js`, `components/hero/hero-scroll.js`, el GLB, dependencias locales en `vendor/three/` y `tests/three-viewer.cjs`.

Modificados: `index.html` (import map), `scripts/serve.js` (tipo GLB/caché), `router.js` (cleanup), `data/products.js`, `pages/home/home.js`, JS/CSS de hero, product-stage y product-modal, CSS de navbar y product-card, `styles/tokens.css`, `styles/global.css`, prueba de navegador y documentación. No se rehízo la navbar ni se modificó el copy principal.

## Verificación

### Environment PBR de estudio

`src/modules/three/studio-environment.js` genera un PMREM local con dos softboxes verticales de distinto ancho, un panel superior, una superficie neutra inferior y contraste oscuro. `ProductViewer` lo crea una vez por renderer y asigna únicamente `scene.environment`; el fondo CSS sigue independiente. El visor ampliado reutiliza la misma escena. Las geometrías/materiales auxiliares y el generador se liberan después de la captura; el render target se libera con el visor.

El GLB actual contiene vidrio físico `inner`, con IOR exportado 7.8. Se conserva su instancia y se ajusta a IOR 1.5, transmission 1, roughness 0.095, metalness 0, thickness 0.12 en unidades del modelo y color neutro. Se mantienen intactos los materiales opacos y las geometrías. La transparencia usa transmisión física, sin reducir opacity.

La versión local Three r180 rellena su captura de transmisión con blanco/alpha 0.5 cuando el canvas es transparente. Una corrección localizada en el shader del vidrio retira ese relleno antes de la refracción, evitando el aspecto lechoso sobre CSS. No modifica los ShaderChunk globales, no añade pases ni loops y debe revisarse si se actualiza Three.js. Se compararon capturas con environment desactivado/activado en `.verification/environment-off.png` y `environment-on.png`.

`tests/studio-glass.cjs` verifica que solo cambia el material transmisivo, conserva geometrías/instancias y valida la compatibilidad y aislamiento de la corrección del shader.

### Navegación a Catálogo y visor ampliado

El enlace Catálogo del navbar usa `src/modules/catalog-navigation.js`: recorre el tramo restante del hero en hasta 1.8 segundos y revela el catálogo durante 0.5 segundos. La posición real de scroll sigue alimentando la transición 3D existente. No hay espera artificial ni segunda animación del modelo. Rueda, contacto táctil, teclado, otro clic o resize cancelan el recorrido; los listeners y el RAF se limpian con AbortController. Una nueva navegación continúa desde la posición actual. Con movimiento reducido se utiliza la navegación directa existente.

En el detalle de un producto con GLB cargado aparece el botón **Ampliar modelo 3D**. `expanded-viewer.js` mueve el mismo contenedor/canvas a un dialog superpuesto; no crea otro renderer, no vuelve a descargar el modelo y conserva el único loop del visor. `ProductViewer.setExpanded()` amplía los límites orbitales y de zoom; al cerrar restaura el encuadre normal. La distancia mínima permanece fuera de la esfera del modelo, no hay pan y el objetivo se mantiene centrado.

El visor ampliado permite arrastre, rueda y pinch, con damping. Cierra mediante su botón o Escape, devuelve el foco al botón de ampliar y conserva el bloqueo de scroll del detalle subyacente. Al cerrar el detalle se libera el visor como antes. Navegar a otra sección cierra ambas ventanas y limpia sus recursos. El panel respeta los márgenes móviles y movimiento reducido.

Archivos de estas dos mejoras: `src/app.js`, `src/router.js`, `src/modules/catalog-navigation.js`, `src/components/product-modal/expanded-viewer.js`, `product-modal.js`, `product-modal.css`, `src/components/product-stage/product-stage.js`, `src/modules/three/product-viewer.js`, `src/utils/icons.js` y pruebas/documentación.

`tests/navigation-expanded.cjs` verifica duración perceptible, clics repetidos, cancelación, cambio rápido de sección, mismo canvas, ausencia de nuevas peticiones GLB, cierre, foco, scroll y tamaños 375/768/1440. `tests/three-viewer.cjs` comprueba además los límites orbitales ampliados y zoom de rueda/pinch.

```sh
node --test tests/*.test.js
```

Las cuatro pruebas de contratos anteriores y tres nuevas pruebas de la transición verifican los extremos, continuidad, reversibilidad, mobile y movimiento reducido. Las pruebas opcionales de navegador requieren Playwright externo y Edge, con el servidor encendido (`PLAYWRIGHT_PATH` y `BROWSER_CHANNEL` permiten indicar sus ubicaciones/canal):

```sh
node tests/browser-smoke.cjs
node tests/three-viewer.cjs
node tests/hero-scroll.cjs
node tests/navigation-expanded.cjs
```

Comprobado: seis previews, navegación y teclado; responsive 320–1440 px; GLB real en hero/modal; mouse y touch; inercia y retorno al giro; zoom limitado; pausa fuera de viewport; movimiento reducido; redimensionamiento; cinco aperturas/cierres sin acumular canvases; liberación GPU; cierre durante descarga; fallbacks por 404 y WebGL no disponible. El recorrido normal no produjo errores JS ni peticiones externas. Capturas en `.verification/`.

La nueva prueba `hero-scroll.cjs` compara capturas de ida/vuelta píxel por píxel a 375, 768 y 1440 px, recorre hasta el macro y la salida, comprueba que se conserva el mismo canvas, restaura interacción al inicio, verifica entrada directa al catálogo y regreso a Home, debug opcional y movimiento reducido. Las siete pruebas Node y los tres recorridos de navegador pasan.

Referencias oficiales: [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html), [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html). La versión r180 del código local es la utilizada por el proyecto. Esta fase termina aquí.

## Administración y microinteracciones

Acceso desde Administración en el pie de la tienda o en http://127.0.0.1:4173/#/admin. Incluye Dashboard, Productos, Ventas, Pedidos e Inventario. Los cambios de productos comparten la colección del catálogo durante la sesión; recargar restaura la demo. Gráficos locales, archivos temporales y servicios reemplazables.

Contratos y alcance: [Administración](docs/admin-contracts.md).

