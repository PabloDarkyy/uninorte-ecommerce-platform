const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:4173');
    const result = await page.evaluate(async () => {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const { tuneStudioGlass } = await import('/src/modules/three/studio-environment.js');
      const { disposeObjects } = await import('/src/modules/three/three-utils.js');
      const { ShaderChunk } = await import('three');
      const gltf = await new GLTFLoader().loadAsync('/src/assets/models/licor-mandioca.glb');
      const meshes = [];
      gltf.scene.traverse(mesh => { if (mesh.isMesh) meshes.push(mesh); });
      const before = meshes.map(mesh => ({ material: mesh.material, geometry: mesh.geometry, json: JSON.stringify(mesh.material.toJSON()) }));
      tuneStudioGlass(gltf.scene);
      const glass = meshes.filter(mesh => mesh.material.transmission > 0);
      const unchanged = meshes.every((mesh, index) => mesh.geometry === before[index].geometry && mesh.material === before[index].material &&
        (mesh.material.transmission > 0 || JSON.stringify(mesh.material.toJSON()) === before[index].json));
      const shader = { fragmentShader: '#include <transmission_pars_fragment>' };
      glass[0].material.onBeforeCompile(shader);
      const data = { unchanged, glassCount: glass.length, ior: glass[0].material.ior,
        transmission: glass[0].material.transmission, metalness: glass[0].material.metalness,
        patchApplied: shader.fragmentShader.includes('float coverage = clamp') && !shader.fragmentShader.includes('#include <transmission_pars_fragment>'),
        nativeChunkIntact: !ShaderChunk.transmission_pars_fragment.includes('float coverage = clamp') };
      disposeObjects(gltf.scenes);
      return data;
    });
    assert.equal(result.unchanged, true, 'Geometry, material instances and opaque materials remain intact');
    assert.equal(result.glassCount, 1);
    assert.equal(result.ior, 1.5);
    assert.equal(result.transmission, 1);
    assert.equal(result.metalness, 0);
    assert.ok(result.patchApplied && result.nativeChunkIntact, 'Canvas correction is scoped to glass, with compatible local shader');
    console.log('PASS: existing glass material reused; opaque materials and geometry untouched; physical glass parameters; local shader compatibility and isolation.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
