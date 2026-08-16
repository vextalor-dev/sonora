import type { Env } from './env';

export const MEDIA_SIZE_LIMIT = 20 * 1024 * 1024;

export async function mediaPut(env: Env, key: string, bytes: Uint8Array): Promise<void> {
  await env.KV_MEDIA.put(key, bytes as unknown as ArrayBuffer, { metadata: { size: bytes.byteLength } });
}

export async function mediaGet(env: Env, key: string): Promise<{ bytes: ArrayBuffer; size: number } | null> {
  const value = await env.KV_MEDIA.get(key, 'arrayBuffer');
  if (value === null) return null;
  return { bytes: value as ArrayBuffer, size: value.byteLength };
}

export async function mediaDelete(env: Env, key: string): Promise<void> {
  await env.KV_MEDIA.delete(key);
}

export async function mediaCount(env: Env, prefix: string): Promise<number> {
  let total = 0;
  let cursor: string | undefined;
  do {
    const list = await env.KV_MEDIA.list({ prefix, limit: 1000, cursor });
    total += list.keys.length;
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
  return total;
}