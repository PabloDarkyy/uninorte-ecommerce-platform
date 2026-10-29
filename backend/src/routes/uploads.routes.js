import path from 'node:path';
import { writeFile, mkdir, unlink } from 'node:fs/promises';
import { HttpError, sendJson, isMultipart, readMultipartBody } from '../lib/http.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { randomId } from '../lib/crypto.js';

const IMAGE_TYPES = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

async function registerMedia(store, data) {
  await store.registerMedia(data);
}


async function saveUpload(request, { subdir, maxBytes, validate, publicUploadsPath, uploadsDir, store, assetType }) {
  if (!isMultipart(request)) throw new HttpError(400, 'Envía el archivo como multipart/form-data.', 'VALIDATION');
  const { files } = await readMultipartBody(request, request.headers['content-type']);
  const file = files.file;
  if (!file || !file.data?.length) throw new HttpError(400, 'Selecciona un archivo con contenido.', 'VALIDATION');
  const extension = validate(file);
  if (file.data.length > maxBytes) throw new HttpError(400, `El archivo supera ${Math.round(maxBytes / (1024 * 1024))} MB.`, 'VALIDATION');
  const dir = path.join(uploadsDir, subdir);
  await mkdir(dir, { recursive: true });
  const filename = `${randomId('file')}${extension}`;
  await writeFile(path.join(dir, filename), file.data);
  const url = `${publicUploadsPath}/${subdir}/${filename}`;
  await registerMedia(store, { ownerType: assetType.startsWith('product_') ? 'product' : 'account', assetType, url, originalName: file.filename || filename, mimeType: file.type, sizeBytes: file.data.length });
  return { url, name: file.filename || filename };
}

export function registerUploadRoutes(router, { store, uploadsDir, publicUploadsPath }) {
  router.post('/api/uploads/image', requireAuth(store), requireAdmin(), async ctx => {
    const result = await saveUpload(ctx.request, {
      subdir: 'products/images', assetType: 'product_image', maxBytes: 10 * 1024 * 1024, uploadsDir, publicUploadsPath, store,
      validate(file) {
        const extension = IMAGE_TYPES[file.type];
        if (!extension) throw new HttpError(400, 'Utiliza una imagen JPG, PNG o WebP.', 'VALIDATION');
        return extension;
      },
    });
    sendJson(ctx.response, 201, result);
  });

  router.post('/api/uploads/model', requireAuth(store), requireAdmin(), async ctx => {
    const result = await saveUpload(ctx.request, {
      subdir: 'products/models', assetType: 'product_model', maxBytes: 100 * 1024 * 1024, uploadsDir, publicUploadsPath, store,
      validate(file) {
        if (!/\.glb$/i.test(file.filename || '')) throw new HttpError(400, 'Selecciona un archivo .glb.', 'VALIDATION');
        return '.glb';
      },
    });
    sendJson(ctx.response, 201, result);
  });

  router.post('/api/uploads/release', requireAuth(store), requireAdmin(), async ctx => {
    const url = String(ctx.body?.url || '');
    if (url.startsWith(`${publicUploadsPath}/`)) {
      const relative = url.slice(publicUploadsPath.length + 1);
      const target = path.resolve(uploadsDir, relative);
      const inside = path.relative(path.resolve(uploadsDir), target);
      if (!inside.startsWith('..') && !path.isAbsolute(inside)) {
        try { await unlink(target); } catch { /* ya no existe */ }
        await store.releaseMedia(url);
      }
    }
    sendJson(ctx.response, 200, {});
  });
}
