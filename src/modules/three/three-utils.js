import { Box3, Sphere, Vector3 } from 'three';

export function normalizeModel(model) {
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model);
  const size = bounds.getSize(new Vector3());
  const longest = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(longest) || longest <= 0) throw new Error('El modelo no tiene dimensiones válidas.');
  const center = bounds.getCenter(new Vector3());
  const scale = 2 / longest;
  model.scale.multiplyScalar(scale);
  model.position.sub(center).multiplyScalar(scale);
  model.updateMatrixWorld(true);
  return new Box3().setFromObject(model).getBoundingSphere(new Sphere()).radius;
}

// Destrucción de recursos propietarios. El cache la usa solo sin consumidores activos.
export function disposeObjects(roots) {
  const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
  roots.filter(Boolean).forEach(root => root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.skeleton) skeletons.add(object.skeleton);
    const list = Array.isArray(object.material) ? object.material : [object.material];
    list.filter(Boolean).forEach(material => {
      materials.add(material);
      Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
    });
  }));
  const images = new Set();
  textures.forEach(texture => { if (texture.source?.data) images.add(texture.source.data); texture.dispose(); });
  images.forEach(image => image.close?.());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
  skeletons.forEach(skeleton => skeleton.dispose());
}
