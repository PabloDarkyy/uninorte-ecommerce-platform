import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createStudioEnvironment, tuneStudioGlass } from './studio-environment.js';
import { normalizeModel, disposeObjects } from './three-utils.js';

export function createProductViewer({ container, modelUrl, label = 'Producto', autoRotate = true,
  interactive = true, initialRotation = {}, camera: cameraOptions = {}, lighting = {} }) {
  const abort = new AbortController();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = container.closest('.product-stage');
  const oldLabel = container.getAttribute('aria-label');
  let renderer, controls, environment, scene, camera, tilt, spin, modelScenes = [];
  let resizeObserver, visibilityObserver, frame = 0, disposed = false, loaded = false;
  let visible = true, interacting = false, lastInteraction = -Infinity, lastTime = 0;
  let speed = 0, scrollProgress = 0, settleFrames = 0, frameCount = 0, fittedDistance = 4, modelRadius = 1.18;
  let transitionLayout, transitionFrame;
  let expanded = false, savedCamera;
  const presentationCamera = new THREE.PerspectiveCamera();
  const direction = new THREE.Vector3();
  container.dataset.viewerState = 'loading';

  function dispose() {
    if (disposed) return;
    disposed = true;
    abort.abort();
    cancelAnimationFrame(frame);
    frame = 0;
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    controls?.dispose();
    disposeObjects(modelScenes);
    modelScenes = [];
    spin?.clear();
    environment?.dispose();
    scene?.clear();
    renderer?.domElement.remove();
    renderer?.dispose();
    renderer?.forceContextLoss();
    stage?.classList.remove('has-model');
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', oldLabel || label);
    container.dataset.viewerState = 'disposed';
    container.dataset.rendering = 'false';
  }

  function fail(error) {
    if (disposed) return;
    console.error(`No se pudo mostrar el modelo ${label}:`, error);
    dispose();
    container.dataset.viewerState = 'fallback';
  }

  function canRender() {
    return loaded && !disposed && visible && !document.hidden &&
      (!document.documentElement.classList.contains('modal-open') || Boolean(container.closest('dialog[open]')));
  }

  function requestRender() {
    if (!frame && canRender()) frame = requestAnimationFrame(render);
  }

  function invalidate() { settleFrames = 30; requestRender(); }

  function render(time) {
    frame = 0;
    if (!canRender()) { lastTime = 0; container.dataset.rendering = 'false'; return; }
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = time;
    const locked = transitionFrame?.locked ?? false;
    const targetSpeed = !locked && autoRotate && !motion.matches && !interacting && time - lastInteraction > 3000 ? 0.16 : 0;
    speed += (targetSpeed - speed) * (1 - Math.exp(-delta * 3));
    if (locked) { speed = 0; spin.rotation.y = transitionFrame.rotationY; }
    else { if (!motion.matches) spin.rotation.y += speed * delta; controls.update(delta); }
    let renderCamera = camera;
    if (transitionLayout && transitionFrame) {
      const { width, height, origin } = transitionLayout;
      presentationCamera.copy(camera);
      if (locked) { presentationCamera.position.set(0, 0, fittedDistance); presentationCamera.lookAt(0, 0, 0); }
      presentationCamera.zoom = origin.height / height * transitionFrame.scale;
      // Desplaza la proyección al punto en píxeles; no desplaza ni agranda un rectángulo recortado.
      presentationCamera.setViewOffset(width, height, width / 2 - transitionFrame.x, height / 2 - transitionFrame.y, width, height);
      renderCamera = presentationCamera;
    }
    // Inclina alrededor del eje de visión: el giro no invierte la inclinación a la derecha.
    direction.copy(renderCamera.position).normalize();
    tilt.quaternion.setFromAxisAngle(direction, transitionFrame?.rotationZ ?? initialRotation.z ?? -0.12);
    tilt.scale.setScalar(transitionFrame ? 1 : 1 + (motion.matches ? 0 : scrollProgress * 0.12));
    spin.position.y = transitionFrame?.focusY ?? 0;
    try { renderer.render(scene, renderCamera); }
    catch (error) { fail(error); return; }
    frameCount++;
    container.dataset.rendering = 'true';
    if (settleFrames > 0) settleFrames--;
    if (!locked && ((autoRotate && !motion.matches) || interacting || settleFrames > 0)) requestRender();
    else container.dataset.rendering = 'false';
  }

  function resize() {
    if (disposed || !renderer) return;
    const { width, height } = transitionLayout?.origin ?? container.getBoundingClientRect();
    if (!width || !height) return;
    const previous = fittedDistance;
    camera.aspect = width / height;
    // Esfera de encuadre conservadora: el objeto permanece dentro incluso al inclinarlo/girarlo.
    const halfFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(camera.aspect, 1));
    const fill = expanded && width / height < 0.7 ? 1.2 : (cameraOptions.fill ?? 0.8);
    fittedDistance = modelRadius / Math.sin(halfFov) / fill;
    camera.position.multiplyScalar(fittedDistance / previous);
    controls.minDistance = expanded ? modelRadius * 1.15 : fittedDistance * 0.94;
    controls.maxDistance = fittedDistance * (expanded ? 2.2 : 1.08);
    camera.near = 0.01;
    camera.far = fittedDistance + 30;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(transitionLayout?.width ?? width, transitionLayout?.height ?? height, false);
    invalidate();
  }

  const ready = (async () => {
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = lighting.exposure ?? 1.15;
      const canvas = renderer.domElement;
      canvas.className = 'product-canvas';
      canvas.tabIndex = interactive ? 0 : -1;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `${label}, modelo 3D. Arrastra para girar o usa Mayúsculas y flechas.`);
      container.append(canvas);
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(cameraOptions.fov ?? 32, 1, 0.01, 50);
      camera.position.set(0, 0.15, fittedDistance);
      controls = new OrbitControls(camera, canvas);
      controls.enabled = interactive;
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.rotateSpeed = 0.55;
      controls.enableZoom = cameraOptions.zoom ?? true;
      controls.zoomSpeed = 0.35;
      controls.minPolarAngle = Math.PI * 0.4;
      controls.maxPolarAngle = Math.PI * 0.6;
      if (interactive) controls.listenToKeyEvents(canvas);
      controls.addEventListener('start', () => { interacting = true; speed = 0; lastInteraction = performance.now(); invalidate(); });
      controls.addEventListener('end', () => { interacting = false; lastInteraction = performance.now(); invalidate(); });
      controls.addEventListener('change', invalidate);
      canvas.addEventListener('keydown', () => { lastInteraction = performance.now(); invalidate(); }, { signal: abort.signal });
      canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(new Error('Contexto WebGL perdido.')); }, { signal: abort.signal });
      scene.add(new THREE.HemisphereLight(0xfff7e7, 0x788764, lighting.ambient ?? 1.5));
      [[0xfff4df, lighting.key ?? 3, [3, 5, 4]], [0xe7efdf, lighting.fill ?? 1.5, [-4, 2, 2]], [0xffffff, lighting.rim ?? 2, [2, 3, -4]]].forEach(([color, intensity, position]) => {
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(...position);
        scene.add(light);
      });
      environment = createStudioEnvironment(renderer);
      scene.environment = environment.texture;
      scene.environmentIntensity = lighting.environment ?? 0.7;
      tilt = new THREE.Group();
      spin = new THREE.Group();
      tilt.add(spin);
      scene.add(tilt);
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      resize();
      visibilityObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; container.dataset.rendering = 'false'; }
        else invalidate();
      });
      visibilityObserver.observe(container);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; container.dataset.rendering = 'false'; }
        else invalidate();
      }, { signal: abort.signal });
      document.addEventListener('productmodalchange', invalidate, { signal: abort.signal });
      motion.addEventListener('change', () => { speed = 0; invalidate(); }, { signal: abort.signal });
      window.addEventListener('resize', resize, { signal: abort.signal });
      // Solo un archivo local. Fetch permite abortar al cerrar durante la descarga.
      const url = new URL(modelUrl, document.baseURI);
      const response = await fetch(url, { signal: abort.signal });
      if (!response.ok) throw new Error(`GLB: HTTP ${response.status}`);
      // Un GLB seleccionado en Admin usa una URL blob, que no admite rutas relativas.
      const resourcePath = url.protocol === 'blob:' ? document.baseURI : new URL('.', url).href;
      const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), resourcePath);
      if (disposed) { disposeObjects(gltf.scenes); return false; }
      modelScenes = gltf.scenes;
      const model = gltf.scene;
      tuneStudioGlass(model);
      model.rotation.x = initialRotation.x ?? 0;
      model.rotation.y = initialRotation.y ?? 0;
      modelRadius = normalizeModel(model);
      spin.add(model);
      resize();
      loaded = true;
      // Se retira visualmente el respaldo únicamente después del primer render exitoso.
      render(performance.now());
      container.dataset.viewerState = 'ready';
      canvas.classList.add('is-ready');
      container.setAttribute('role', 'group');
      container.setAttribute('aria-label', `Vista 3D de ${label}`);
      stage?.classList.add('has-model');
      invalidate();
      return true;
    } catch (error) { if (!disposed) fail(error); return false; }
  })();

  return { ready, dispose,
    setExpanded(value) {
      if (!loaded || disposed || expanded === value) return;
      if (value) savedCamera = camera.position.clone().divideScalar(fittedDistance);
      expanded = value;
      controls.minPolarAngle = value ? 0.01 : Math.PI * 0.4;
      controls.maxPolarAngle = value ? Math.PI - 0.01 : Math.PI * 0.6;
      controls.enableZoom = value || (cameraOptions.zoom ?? true);
      resize();
      if (!value && savedCamera) camera.position.copy(savedCamera).multiplyScalar(fittedDistance);
      controls.update();
      invalidate();
    },
    setScrollProgress(value) { scrollProgress = THREE.MathUtils.clamp(value, 0, 1); if (loaded) invalidate(); },
    configureTransition(layout) {
      if (disposed) return;
      transitionLayout = layout;
      if (renderer && renderer.domElement.parentElement !== layout.layer) {
        layout.layer.append(renderer.domElement);
        visibilityObserver?.unobserve(container);
        visibilityObserver?.observe(layout.layer);
      }
      resize();
    },
    setTransitionFrame(state) {
      if (disposed) return;
      const wasLocked = transitionFrame?.locked;
      transitionFrame = state;
      if (controls) {
        controls.enabled = interactive && !state.locked;
        if (state.locked) { interacting = false; speed = 0; }
        else if (wasLocked) { speed = 0; lastInteraction = -Infinity; }
      }
      if (renderer && transitionLayout) {
        const canvas = renderer.domElement;
        canvas.tabIndex = interactive && !state.locked ? 0 : -1;
        canvas.style.pointerEvents = interactive && !state.locked ? 'auto' : 'none';
        // Al inicio solo la región original recibe el mouse; el canvas no bloquea el texto.
        const { origin, width, height } = transitionLayout;
        canvas.style.clipPath = state.locked ? 'none' : `inset(${Math.max(0, origin.y - origin.height / 2)}px ${Math.max(0, width - origin.x - origin.width / 2)}px ${Math.max(0, height - origin.y - origin.height / 2)}px ${Math.max(0, origin.x - origin.width / 2)}px)`;
      }
      if (loaded) invalidate();
    },
    getState() { return { disposed, loaded, expanded, frames: frameCount, rendering: Boolean(frame), speed, rotation: spin?.rotation.y, distance: controls?.getDistance(), azimuth: controls?.getAzimuthalAngle(), polar: controls?.getPolarAngle(), minDistance: controls?.minDistance, maxDistance: controls?.maxDistance, transition: transitionFrame ? { ...transitionFrame } : null }; },
  };
}
