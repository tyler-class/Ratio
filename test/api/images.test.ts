import { SELF, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { AppState, Bean, ImageRef } from '../../src/shared/types';
import { ORIGIN, session } from './helpers';

// 1×1 transparent PNG.
const PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  ),
  (c) => c.charCodeAt(0),
);

describe('images', () => {
  it('stores photos in R2 under the record key and serves them', async () => {
    const api = await session();
    const b = (await api.post<Bean>('/beans', { name: 'Photo bag' })).data;
    const up = await SELF.fetch(`${ORIGIN}/api/beans/${b.id}/images`, {
      method: 'POST',
      headers: {
        Cookie: api.cookie,
        Origin: ORIGIN,
        'Content-Type': 'image/png',
        'X-Filename': encodeURIComponent('bag front.png'),
        'X-Image-Width': '1',
        'X-Image-Height': '1',
      },
      body: PNG,
    });
    expect(up.status).toBe(201);
    const img = (await up.json()) as ImageRef;
    expect(img).toMatchObject({ width: 1, height: 1, content_type: 'image/png' });

    const row = await env.DB.prepare('SELECT r2_key, filename FROM images WHERE id = ?')
      .bind(img.id)
      .first<{ r2_key: string; filename: string }>();
    expect(row!.r2_key).toBe(`beans/${b.id}/${img.id}.png`);
    expect(row!.filename).toBe('bag front.png');
    expect(await env.IMAGES.head(row!.r2_key)).not.toBeNull();

    const state = (await api.get<AppState>('/state')).data;
    expect(state.beans.find((x) => x.id === b.id)!.images.map((i) => i.id)).toEqual([img.id]);

    const get = await SELF.fetch(`${ORIGIN}/api/images/${img.id}`, {
      headers: { Cookie: api.cookie },
    });
    expect(get.status).toBe(200);
    expect(get.headers.get('Content-Type')).toBe('image/png');
    expect(new Uint8Array(await get.arrayBuffer())).toEqual(PNG);
    const etag = get.headers.get('ETag')!;
    const again = await SELF.fetch(`${ORIGIN}/api/images/${img.id}`, {
      headers: { Cookie: api.cookie, 'If-None-Match': etag },
    });
    expect(again.status).toBe(304);

    // Unauthenticated requests can't read photos.
    expect((await SELF.fetch(`${ORIGIN}/api/images/${img.id}`)).status).toBe(401);

    // Deleting the bag removes its files.
    await api.del(`/beans/${b.id}`);
    expect(await env.IMAGES.head(row!.r2_key)).toBeNull();
  });

  it('rejects non-images and missing owners', async () => {
    const api = await session();
    const b = (await api.post<Bean>('/beans', { name: 'Another' })).data;
    const send = (path: string, type: string) =>
      SELF.fetch(`${ORIGIN}/api${path}`, {
        method: 'POST',
        headers: { Cookie: api.cookie, Origin: ORIGIN, 'Content-Type': type },
        body: PNG,
      });
    expect((await send(`/beans/${b.id}/images`, 'application/json')).status).toBe(415);
    expect((await send(`/beans/${b.id}/images`, 'image/svg+xml')).status).toBe(415);
    expect((await send(`/beans/nope/images`, 'image/png')).status).toBe(404);
    // Raw bodies are only allowed on the upload routes.
    expect((await send(`/roasters`, 'image/png')).status).toBe(415);
  });
});
