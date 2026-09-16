import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { disposeObjects } from './three-utils.js';
const entries = new Map();
const limits = { idleEntries: 6, idleBytes: 32 * 1024 * 1024 };
let loads = 0;
const aborted = () => new DOMException('Carga cancelada', 'AbortError');
function remove(entry) {
  if (entries.get(entry.url) !== entry) return;
  entries.delete(entry.url);
  entry.abort.abort();
  if (entry.gltf) disposeObjects(entry.gltf.scenes);
}
function trim() {
  const idle = [...entries.values()].filter(e => e.gltf && !e.users && !e.waiters).sort((a,b) => a.used - b.used);
  let bytes = idle.reduce((sum,e) => sum + e.bytes, 0);
  while (idle.length > limits.idleEntries || bytes > limits.idleBytes) { const entry = idle.shift(); bytes -= entry.bytes; remove(entry); }
}
function getEntry(url) {
  let entry = entries.get(url);
  if (entry) return entry;
  entry = { url, abort: new AbortController(), users: 0, waiters: 0, bytes: 0, used: performance.now() };
  entries.set(url, entry);
  entry.promise = (async () => {
    loads++;
    const response = await fetch(url, { signal: entry.abort.signal });
    if (!response.ok) throw new Error(`GLB: HTTP ${response.status}`);
    const buffer = await response.arrayBuffer(); entry.bytes = buffer.byteLength;
    const base = new URL(url).protocol === 'blob:' ? document.baseURI : new URL('.', url).href;
    const gltf = await new GLTFLoader().parseAsync(buffer, base);
    if (entry.abort.signal.aborted) { disposeObjects(gltf.scenes); throw aborted(); }
    entry.gltf = gltf; return gltf;
  })().catch(error => { remove(entry); throw error; });
  return entry;
}
// Geometrías/texturas son inmutables y pertenecen al cache. Transformaciones,
// materiales y esqueletos pertenecen exclusivamente a cada consumidor.
function instantiate(template) {
  const model = template.clone(true), pairs = new Map(), materials = new Map(), skeletons = [];
  function pair(a,b) { pairs.set(a,b); a.children.forEach((child,i) => pair(child,b.children[i])); }
  pair(template,model);
  try { for (const [original,copy] of pairs) {
    const cloneMaterial = material => { if (!materials.has(material)) materials.set(material, material.clone()); return materials.get(material); };
    if (original.material) copy.material = Array.isArray(original.material) ? original.material.map(cloneMaterial) : cloneMaterial(original.material);
    if (original.isSkinnedMesh) {
      copy.skeleton = original.skeleton.clone();
      skeletons.push(copy.skeleton);
      copy.skeleton.bones = original.skeleton.bones.map(bone => {
        if (!pairs.has(bone)) throw new Error('El esqueleto debe estar incluido en la escena GLB.');
        return pairs.get(bone);
      });
      copy.bindMatrix.copy(original.bindMatrix); copy.bindMatrixInverse.copy(original.bindMatrixInverse);
    }
  }
  } catch(error) { materials.forEach(m=>m.dispose());skeletons.forEach(s=>s.dispose());model.clear();throw error; }
  return { model, dispose() { materials.forEach(m => m.dispose()); skeletons.forEach(s => s.dispose()); model.clear(); } };
}
export async function acquireProductModel(modelUrl, { signal } = {}) {
  if (signal?.aborted) throw aborted();
  const entry = getEntry(new URL(modelUrl, document.baseURI).href);
  entry.waiters++;
  let onAbort;
  try {
    const gltf = await Promise.race([entry.promise, new Promise((_,reject) => {
      onAbort = () => reject(aborted()); signal?.addEventListener('abort',onAbort,{once:true});
    })]);
    if (signal?.aborted) throw aborted();
    const instance = instantiate(gltf.scene);
    entry.users++; entry.used = performance.now(); let released = false;
    return { model: instance.model, release() {
      if (released) return; released = true; instance.dispose(); entry.users--; entry.used = performance.now(); trim();
    } };
  } finally {
    signal?.removeEventListener('abort',onAbort); entry.waiters--;
    if (!entry.gltf && !entry.waiters && !entry.users) remove(entry);
    trim();
  }
}
export function clearIdleProductModels() { for (const entry of entries.values()) if (!entry.users && !entry.waiters) remove(entry); }
export function getProductModelCacheState() { return { loads, entries: [...entries.values()].map(e => ({ url:e.url, users:e.users, waiters:e.waiters, bytes:e.bytes, ready:Boolean(e.gltf) })) }; }
