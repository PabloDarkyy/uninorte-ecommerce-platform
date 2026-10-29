import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { HttpError, sendJson, isMultipart, readMultipartBody } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { randomId } from '../lib/crypto.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AVATAR_TYPES = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

function currentUser(state, userId) {
  const account = state.accounts[userId];
  if (!account) throw new HttpError(404, 'No encontramos la cuenta.', 'NOT_FOUND');
  return { ...account.profile, addresses: account.addresses };
}

export function registerAccountRoutes(router, { store, uploadsDir, publicUploadsPath }) {
  router.get('/api/account/me', requireAuth(store), async ctx => {
    sendJson(ctx.response, 200, currentUser(store.read(), ctx.user.id));
  });

  router.put('/api/account/me', requireAuth(store), async ctx => {
    const data = ctx.body || {};
    const required = (value, name, max = 160) => {
      const text = String(value ?? '').trim();
      if (!text || text.length > max) throw new HttpError(400, `Revisa el campo ${name}.`, 'VALIDATION');
      return text;
    };
    const firstName = required(data.firstName, 'nombre', 80);
    const lastName = required(data.lastName, 'apellido', 80);
    const email = required(data.email, 'correo');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Introduce un correo válido.', 'VALIDATION');
    const phone = required(data.phone, 'teléfono', 40);
    const birthDate = String(data.birthDate || '');
    if (birthDate && (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !Number.isFinite(Date.parse(birthDate))
      || new Date(birthDate).toISOString().slice(0, 10) !== birthDate || birthDate > new Date().toISOString().slice(0, 10))) {
      throw new HttpError(400, 'Revisa la fecha de nacimiento.', 'VALIDATION');
    }
    if (data.avatar != null && typeof data.avatar !== 'string') throw new HttpError(400, 'La foto no tiene un formato compatible.', 'VALIDATION');

    const updated = await store.commit(state => {
      const account = state.accounts[ctx.user.id];
      if (!account) throw new HttpError(404, 'No encontramos la cuenta.', 'NOT_FOUND');
      if (data.primaryAddressId && !account.addresses.some(a => a.id === data.primaryAddressId)) {
        throw new HttpError(400, 'La dirección seleccionada ya no existe.', 'VALIDATION');
      }
      Object.assign(account.profile, { firstName, lastName, email, phone, birthDate });
      if (data.avatar !== undefined) account.profile.avatar = data.avatar;
      if (data.primaryAddressId) account.addresses.forEach(a => { a.isPrimary = a.id === data.primaryAddressId; });
      // El registro de acceso conserva su propio correo; igual que en el mock,
      // editar el correo del perfil no reescribe las credenciales de auth.
      return currentUser(state, ctx.user.id);
    });
    sendJson(ctx.response, 200, updated);
  });

  // Sube el archivo a disco y devuelve su URL publica; solo al llamar a
  // PUT /api/account/me con { avatar: url } queda confirmado en el perfil,
  // igual que documenta el contrato (updateAvatar prepara, updateCurrentUser confirma).
  router.post('/api/account/avatar', requireAuth(store), async ctx => {
    if (!isMultipart(ctx.request)) throw new HttpError(400, 'Envía la foto como multipart/form-data.', 'VALIDATION');
    const { files } = await readMultipartBody(ctx.request, ctx.request.headers['content-type']);
    const file = files.file;
    if (!file || !file.data?.length) throw new HttpError(400, 'Selecciona un archivo con contenido.', 'VALIDATION');
    const extension = AVATAR_TYPES[file.type];
    if (!extension) throw new HttpError(400, 'Elige una imagen JPG, PNG o WebP de hasta 2 MB.', 'VALIDATION');
    if (file.data.length > 2 * 1024 * 1024) throw new HttpError(400, 'Elige una imagen JPG, PNG o WebP de hasta 2 MB.', 'VALIDATION');

    const dir = path.join(uploadsDir, 'avatars');
    await mkdir(dir, { recursive: true });
    const filename = `${randomId('avatar')}${extension}`;
    await writeFile(path.join(dir, filename), file.data);
    const url = `${publicUploadsPath}/avatars/${filename}`;
    await store.registerMedia({ ownerType: 'account', ownerId: ctx.user.id, assetType: 'avatar', url, originalName: file.filename || filename, mimeType: file.type, sizeBytes: file.data.length });
    sendJson(ctx.response, 201, { url });
  });
}
