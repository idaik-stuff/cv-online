// Bindings declared in wrangler.jsonc, plus secrets set with `wrangler secret put`.
declare namespace Cloudflare {
  interface Env {
    ASSETS: Fetcher;
    CV_BUCKET: R2Bucket;
    ADMIN_USER?: string;
    ADMIN_PASSWORD?: string;
    BASE_PATH?: string;
  }
}

type Env = Cloudflare.Env;

declare module "*.html?raw" {
  const content: string;
  export default content;
}

declare module "*/import/clean.mjs" {
  export const MOBILE_CSS: string;
  export class CleanError extends Error {
    check: string;
  }
  export function visibleText(html: string): string;
  export function cleanPredecessorCv(html: string): string;
}
