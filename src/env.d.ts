// Bindings declared in wrangler.jsonc, plus secrets set with `wrangler secret put`.
declare namespace Cloudflare {
  interface Env {
    ASSETS: Fetcher;
    CV_BUCKET: R2Bucket;
    ADMIN_USER?: string;
    ADMIN_PASSWORD?: string;
  }
}

type Env = Cloudflare.Env;

declare module "*.html?raw" {
  const content: string;
  export default content;
}
