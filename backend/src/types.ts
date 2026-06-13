import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

/** Cloudflare Worker bindings (env vars, D1, R2) */
export type Bindings = {
  DB: D1Database;
  ASSETS: R2Bucket;
  AGNES_API_KEY: string;
  AUTH_SECRET: string;
  ADMIN_EMAILS: string;
  ENVIRONMENT: string;
  CORS_ORIGIN?: string;
};
