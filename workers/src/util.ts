export function genId(prefix: string): string {
  const rand = crypto.getRandomValues(new Uint8Array(8));
  let hex = '';
  for (const b of rand) hex += b.toString(16).padStart(2, '0');
  return `${prefix}_${Date.now().toString(36)}${hex}`;
}

export function escLike(q: string): string {
  return q.replace(/[\\%_]/g, (m) => '\\' + m);
}

export function toISO(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value as string | number);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export const AUDIO_MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.webm': 'audio/webm',
};

export const IMAGE_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

export function isAudioName(name: string): boolean {
  return extOf(name) in AUDIO_MIME;
}

export function isImageName(name: string): boolean {
  return extOf(name) in IMAGE_MIME;
}