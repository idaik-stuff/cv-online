import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { get, sampleHtml, seedCv } from "./helpers";

describe("AC-11: unknown and invalid paths show the not-found page", () => {
  it.each(["/", "/no-such-cv", "/UPPER", "/a_b", "/x/y", "/..%2Fcvs", "/favicon.ico"])("%s → 404", async (path) => {
    const res = await get(path);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("Page not found");
  });

  it("does not expose drafts or bucket internals through public paths", async () => {
    const cv = await seedCv({ draft: sampleHtml("private draft") });
    await env.CV_BUCKET.put("public/admin.html", sampleHtml("should never be served"));
    for (const path of [`/${cv.slug}`, `/cvs`, `/admin.html`]) {
      const res = await get(path);
      expect(res.status, path).toBe(404);
      expect(await res.text()).not.toContain("private draft");
    }
  });
});

describe("AC-12: published CVs are public and clean", () => {
  it("serves a published CV without credentials, with safe headers", async () => {
    const html = sampleHtml("Published CV");
    const cv = await seedCv({ draft: html, published: html });

    const res = await get(`/${cv.slug}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("WWW-Authenticate")).toBeNull();
    expect(res.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'none'");
    expect(res.headers.get("Content-Security-Policy")).not.toContain("script-src");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
    expect(await res.text()).toBe(html);
  });
});
