export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || null;
  }
}

export function sendJson(response, status, body) {
  const payload = JSON.stringify(body ?? null);
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(payload);
}

export function applyCors(request, response, origin) {
  response.setHeader('Access-Control-Allow-Origin', origin || '*');
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Access-Control-Max-Age', '600');
}

const MAX_BODY_BYTES = 110 * 1024 * 1024; // margen sobre el limite de 100 MB para modelos GLB documentado en admin-contracts.md

export function readRawBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'El archivo o cuerpo de la solicitud supera el limite permitido.'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

export async function readJsonBody(request) {
  const raw = await readRawBody(request);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    throw new HttpError(400, 'El cuerpo de la solicitud no es JSON valido.');
  }
}

// Parser minimo de multipart/form-data (sin dependencias externas), suficiente
// para los formularios con un archivo y algunos campos de texto que usan
// Admin (imagenes/GLB) y Cuenta (avatar). Sigue RFC 7578 de forma pragmatica.
export async function readMultipartBody(request, contentType) {
  const match = /boundary="?([^";]+)"?/i.exec(contentType || '');
  if (!match) throw new HttpError(400, 'Solicitud multipart sin boundary.');
  const boundary = `--${match[1]}`;
  const raw = await readRawBody(request);
  const text = raw;
  const boundaryBuffer = Buffer.from(`\r\n${boundary}`);
  const firstBoundary = Buffer.from(boundary);

  let cursor = text.indexOf(firstBoundary);
  if (cursor < 0) throw new HttpError(400, 'Solicitud multipart invalida.');
  cursor += firstBoundary.length;

  const fields = {};
  const files = {};

  while (cursor < text.length) {
    if (text.slice(cursor, cursor + 2).toString() === '--') break; // boundary final
    if (text.slice(cursor, cursor + 2).toString() === '\r\n') cursor += 2;
    const headerEnd = text.indexOf('\r\n\r\n', cursor);
    if (headerEnd < 0) break;
    const rawHeaders = text.slice(cursor, headerEnd).toString('utf8');
    const bodyStart = headerEnd + 4;
    let nextBoundary = text.indexOf(boundaryBuffer, bodyStart);
    if (nextBoundary < 0) break;
    const value = text.slice(bodyStart, nextBoundary);

    const disposition = /Content-Disposition:\s*form-data;\s*name="([^"]*)"(?:;\s*filename="([^"]*)")?/i.exec(rawHeaders);
    const contentTypeHeader = /Content-Type:\s*([^\r\n]+)/i.exec(rawHeaders);
    if (disposition) {
      const [, name, filename] = disposition;
      if (filename !== undefined) {
        files[name] = { filename, type: contentTypeHeader ? contentTypeHeader[1].trim() : 'application/octet-stream', data: value };
      } else {
        fields[name] = value.toString('utf8');
      }
    }
    cursor = nextBoundary + boundaryBuffer.length;
  }
  return { fields, files };
}

export function isMultipart(request) {
  return /^multipart\/form-data/i.test(request.headers['content-type'] || '');
}
