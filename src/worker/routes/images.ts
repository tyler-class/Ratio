// Bean photos and roaster logos. Files live in R2 under a key that mirrors the record
// (beans/<id>/<image id>.jpg); D1 keeps the metadata and order.
import { Hono } from 'hono';
import { all, first, newId, nowIso, toImage } from '../db';
import { ApiError, notFound, type AppEnv } from './util';

export const images = new Hono<AppEnv>();

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

type OwnerType = 'bean' | 'roaster';
const TABLE: Record<OwnerType, string> = { bean: 'beans', roaster: 'roasters' };

export const imageKey = (owner: OwnerType, ownerId: string, imageId: string, ext: string) =>
  `${TABLE[owner]}/${ownerId}/${imageId}.${ext}`;

const intHeader = (v: string | undefined) => {
  const x = v ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(x) && x > 0 && x < 100_000 ? x : null;
};

function upload(owner: OwnerType) {
  return images.post(`/${TABLE[owner]}/:id/images`, async (c) => {
    const ownerId = c.req.param('id');
    const db = c.env.DB;
    if (!(await first(db, `SELECT id FROM ${TABLE[owner]} WHERE id = ?`, ownerId)))
      throw notFound(owner === 'bean' ? 'Bean' : 'Roaster');
    const type = (c.req.header('Content-Type') ?? '').split(';')[0]!.trim().toLowerCase();
    const ext = EXT[type];
    if (!ext) throw new ApiError(415, 'unsupported', 'Use a JPEG, PNG, WebP, GIF or AVIF image.');
    const declared = Number(c.req.header('Content-Length') ?? 0);
    if (declared > MAX_IMAGE_BYTES) throw new ApiError(413, 'too_large', 'That image is too big.');
    const bytes = await c.req.arrayBuffer();
    if (!bytes.byteLength) throw new ApiError(400, 'invalid', 'The image is empty.');
    if (bytes.byteLength > MAX_IMAGE_BYTES)
      throw new ApiError(413, 'too_large', 'That image is too big.');

    const id = newId();
    const key = imageKey(owner, ownerId, id, ext);
    const filename = c.req.header('X-Filename');
    await c.env.IMAGES.put(key, bytes, { httpMetadata: { contentType: type } });
    const next = await first<{ n: number }>(
      db,
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM images WHERE owner_type = ? AND owner_id = ?',
      owner,
      ownerId,
    );
    try {
      await db
        .prepare(
          `INSERT INTO images (id, owner_type, owner_id, r2_key, content_type, filename, width, height, size, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          owner,
          ownerId,
          key,
          type,
          filename ? decodeURIComponent(filename).slice(0, 200) : null,
          intHeader(c.req.header('X-Image-Width')),
          intHeader(c.req.header('X-Image-Height')),
          bytes.byteLength,
          next?.n ?? 0,
          nowIso(),
        )
        .run();
    } catch (e) {
      await c.env.IMAGES.delete(key);
      throw e;
    }
    const row = await first(db, 'SELECT * FROM images WHERE id = ?', id);
    return c.json(toImage(row!), 201);
  });
}
upload('bean');
upload('roaster');

images.get('/images/:id', async (c) => {
  const row = await first<{ r2_key: string; content_type: string }>(
    c.env.DB,
    'SELECT r2_key, content_type FROM images WHERE id = ?',
    c.req.param('id'),
  );
  if (!row) throw notFound('Image');
  // An image id never points at different bytes, so the browser can keep it forever.
  const headers = new Headers({
    'Content-Type': row.content_type,
    'Cache-Control': 'private, max-age=31536000, immutable',
  });
  const obj = await c.env.IMAGES.get(row.r2_key, {
    onlyIf: { etagDoesNotMatch: c.req.header('If-None-Match')?.replace(/^W\/|"/g, '') ?? '' },
  });
  if (!obj) throw notFound('Image');
  headers.set('ETag', obj.httpEtag);
  if (!('body' in obj)) return new Response(null, { status: 304, headers });
  return new Response(obj.body, { headers });
});

images.delete('/images/:id', async (c) => {
  const row = await first<{ r2_key: string }>(
    c.env.DB,
    'SELECT r2_key FROM images WHERE id = ?',
    c.req.param('id'),
  );
  if (!row) throw notFound('Image');
  await c.env.DB.prepare('DELETE FROM images WHERE id = ?').bind(c.req.param('id')).run();
  await c.env.IMAGES.delete(row.r2_key);
  return c.json({ ok: true });
});

/** Removes every image a bean or roaster owns, rows and files. */
export async function deleteOwnerImages(env: Cloudflare.Env, owner: OwnerType, ownerId: string) {
  const rows = await all<{ r2_key: string }>(
    env.DB,
    'SELECT r2_key FROM images WHERE owner_type = ? AND owner_id = ?',
    owner,
    ownerId,
  );
  await env.DB.prepare('DELETE FROM images WHERE owner_type = ? AND owner_id = ?')
    .bind(owner, ownerId)
    .run();
  if (rows.length) await env.IMAGES.delete(rows.map((r) => r.r2_key));
}
