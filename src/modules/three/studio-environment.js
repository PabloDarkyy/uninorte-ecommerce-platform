import { Scene, Color, Mesh, PlaneGeometry, MeshBasicMaterial, DoubleSide, FrontSide, PMREMGenerator, ShaderChunk } from 'three';

// Escena auxiliar capturada una vez: los paneles nunca entran en la escena del producto.
export function createStudioEnvironment(renderer) {
  const studio = new Scene();
  studio.background = new Color(0x444940);
  const geometry = new PlaneGeometry(1, 1);
  const materials = [];
  function panel(position, size, color, intensity) {
    const material = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity), side: DoubleSide });
    materials.push(material);
    const card = new Mesh(geometry, material);
    card.position.set(...position);
    card.scale.set(size[0], size[1], 1);
    card.lookAt(0, 0, 0);
    studio.add(card);
  }
  panel([-4, 0.8, 3], [2.5, 7], 0xfffaf0, 1.8);
  panel([4, 0.4, 1.5], [1.1, 6], 0xf4f8f2, 1.4);
  panel([0, 5, 0], [4, 3], 0xfffcf5, 0.7);
  panel([0, 0, -5], [7, 7], 0x30362f, 1);
  panel([0, -4, 0], [8, 8], 0x99978e, 1);
  const pmrem = new PMREMGenerator(renderer);
  try { return pmrem.fromScene(studio, 0.055); }
  finally {
    pmrem.dispose();
    geometry.dispose();
    materials.forEach(material => material.dispose());
    studio.clear();
  }
}

// Solo materiales físicos que el GLB ya declara transmisivos. Nunca convierte etiquetas.
export function tuneStudioGlass(model) {
  const tuned = new Set();
  model.traverse(object => {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material?.isMeshPhysicalMaterial || material.transmission <= 0 || tuned.has(material)) continue;
      tuned.add(material);
      material.ior = 1.5;
      material.transmission = 1;
      material.specularIntensity = 0.75;
      material.metalness = 0;
      material.roughness = 0.095;
      material.thickness = 0.12;
      material.envMapIntensity = 1.1;
      // Transmission conserva la transparencia óptica sin atenuar los reflejos por alpha.
      material.opacity = 1;
      material.transparent = false;
      material.color.setRGB(1, 1, 1);
      material.side = FrontSide;
      // Three r180 rellena la captura de transmisión con blanco/alpha 0.5 en canvas
      // transparentes. Retira ese matte, no el fondo CSS, antes de aplicar el vidrio.
      material.onBeforeCompile = shader => {
        const transmission = ShaderChunk.transmission_pars_fragment.replace(
          'vec3 attenuatedColor = transmittance * transmittedLight.rgb;',
          `float coverage = clamp(2.0 * transmittedLight.a - 1.0, 0.0, 1.0);
          transmittedLight.rgb = max(transmittedLight.rgb - vec3(0.5 * (1.0 - coverage)), vec3(0.0));
          transmittedLight.a = coverage;
          vec3 attenuatedColor = transmittance * transmittedLight.rgb;`
        );
        shader.fragmentShader = shader.fragmentShader.replace('#include <transmission_pars_fragment>', transmission);
      };
      material.customProgramCacheKey = () => 'studio-glass-transparent-canvas-r180-v1';
      material.needsUpdate = true;
    }
  });
}
