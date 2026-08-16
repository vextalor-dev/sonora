export interface Env {
  DB: D1Database;
  KV_MEDIA: KVNamespace;
  JWT_SECRET: string;
  JWT_EXPIRES?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
}