import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        // Test-only credentials; real secrets are set with `wrangler secret put`.
        bindings: { ADMIN_USER: "test-admin", ADMIN_PASSWORD: "test-password-123" },
      },
    }),
  ],
});
