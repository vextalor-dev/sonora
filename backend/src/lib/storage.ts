import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Anchored to the working directory: the server always starts from backend/,
// so the project root is one level up. (`__dirname` shifts between src/ and
// dist/, so it cannot anchor storage paths safely.)
export const ROOT_DIR = path.resolve(process.cwd());
export const PROJECT_ROOT = path.resolve(ROOT_DIR, '..');
export const UPLOAD_DIR = path.join(PROJECT_ROOT, 'uploads');

export const AUDIO_DIR = path.join(UPLOAD_DIR, 'audio');
export const ARTWORK_DIR = path.join(UPLOAD_DIR, 'artwork');
export const THUMBS_DIR = path.join(UPLOAD_DIR, 'thumbnails');

// ---------- Storage abstraction ----------
// Swap these implementations for an S3-compatible backend later without
// touching routes or controllers.

export interface StoredFile {
  filename: string;
  path: string; // absolute path
  size: number;
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function safeName(original: string): string {
  const ext = path.extname(original).toLowerCase().slice(0, 10);
  const safeExt = /^\.(mp3|wav|flac|m4a|ogg|aac|opus|webm|jpg|jpeg|png|webp|gif)$/.test(ext)
    ? ext
    : '';
  return `${crypto.randomUUID()}${safeExt}`;
}

export function saveFile(dir: string, buffer: Buffer, originalName: string): StoredFile {
  ensureDir(dir);
  const filename = safeName(originalName);
  const absolute = path.join(dir, filename);
  fs.writeFileSync(absolute, buffer);
  return { filename, path: absolute, size: buffer.length };
}

export function saveFileFromTemp(dir: string, tempPath: string, originalName: string): StoredFile {
  ensureDir(dir);
  const filename = safeName(originalName);
  const absolute = path.join(dir, filename);
  fs.copyFileSync(tempPath, absolute);
  fs.rmSync(tempPath, { force: true });
  return { filename, path: absolute, size: fs.statSync(absolute).size };
}

export function deleteFile(absolutePath: string | null | undefined) {
  if (!absolutePath) return;
  try {
    fs.rmSync(absolutePath, { force: true });
  } catch {
    /* best effort */
  }
}

export function resolveStored(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  const absolute = path.resolve(PROJECT_ROOT, relativePath);
  if (!absolute.startsWith(PROJECT_ROOT)) return null; // prevent traversal
  if (!fs.existsSync(absolute)) return null;
  return absolute;
}

export function statSize(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const file of fs.readdirSync(dir)) {
    try {
      total += fs.statSync(path.join(dir, file)).size;
    } catch {
      /* skip */
    }
  }
  return total;
}

export function publicPaths(filename: string, kind: 'audio' | 'artwork'): string {
  // Project-root-relative path (resolved against the Sonora/ directory).
  return path.join('uploads', kind, filename).replaceAll('\\', '/');
}