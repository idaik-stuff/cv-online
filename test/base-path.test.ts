import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src/worker";
import { APP, GOOD_AUTH, ORIGIN, sampleHtml, seedCv } from "./helpers";

// CHG-004: the app lives under BASE_PATH ("/cv", ADR-0004).

const raw = (path: string, headers: Record<string, string> = {}) =>
  SELF.fetch(ORIGIN + path, { headers, redirect: "manual" });

describe("CHG-004 AC-02: everything outside /cv is not found", () => {
  it.each(["/", "/cv", "/cvx/director", "/other/page", "/favicon.ico"])("%s → 404", async (path) => {
    const res = await raw(path);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("Page not found");
  });

  it("does not serve a published CV at the old root URL", async () => {
    const html = sampleHtml("published");
    const cv = await seedCv({ draft: html, published: html });
    expect((await raw(`/cv/${cv.slug}`)).status).toBe(200);
    expect((await raw(`/${cv.slug}`)).status).toBe(404);
  });

  it("/cv/ (the app root) is not found", async () => {
    expect((await raw("/cv/")).status).toBe(404);
  });
});

describe("CHG-004 AC-03: the old editor path is closed, not open", () => {
  it.each(["/admin", "/admin/", "/admin/editor.js", "/admin/api/cvs"])("%s → 404 even with valid credentials", async (path) => {
    const res = await raw(path, { Authorization: GOOD_AUTH });
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain("Your CVs");
  });
});

describe("CHG-004: editor files under the prefix", () => {
  it("serves the list page with relative links", async () => {
    const res = await raw("/cv/admin/", { Authorization: GOOD_AUTH });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('href="admin.css"');
    expect(body).not.toContain('"/admin/');
  });

  it("re-prefixes redirects from the assets layer", async () => {
    const res = await raw("/cv/admin/edit.html", { Authorization: GOOD_AUTH });
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(new URL(res.headers.get("Location")!, ORIGIN).pathname).toBe("/cv/admin/edit");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("builds public URLs with the prefix", async () => {
    const cv = await seedCv();
    const list = (await (await raw("/cv/admin/api/cvs", { Authorization: GOOD_AUTH })).json()) as Array<{ id: string; url: string }>;
    expect(list.find((c) => c.id === cv.id)?.url).toBe(`${APP}/${cv.slug}`);
    expect(APP).toBe(`${ORIGIN}/cv`);
  });
});

describe("CHG-004: BASE_PATH is configuration (review F3)", () => {
  const call = (path: string, basePath: string | undefined, headers: Record<string, string> = {}) =>
    worker.fetch(new Request<unknown, IncomingRequestCfProperties>(ORIGIN + path, { headers, redirect: "manual" }), {
      ...env,
      BASE_PATH: basePath,
    } as Env);

  it.each([[undefined], [""], ["/"], ["//"], ["  "]])("BASE_PATH %j serves the app at the site root", async (bp) => {
    const html = sampleHtml("root mode");
    const cv = await seedCv({ draft: html, published: html });
    expect((await call(`/${cv.slug}`, bp)).status).toBe(200);
    expect((await call("/admin/", bp)).status).toBe(401);
    expect((await call("/admin/", bp, { Authorization: GOOD_AUTH })).status).toBe(200);
  });

  it.each([["cv"], ["/cv/"], [" /cv "]])("BASE_PATH %j normalizes to /cv", async (bp) => {
    const html = sampleHtml("normalized");
    const cv = await seedCv({ draft: html, published: html });
    expect((await call(`/cv/${cv.slug}`, bp)).status).toBe(200);
    expect((await call(`/${cv.slug}`, bp)).status).toBe(404);
  });
});

describe("CHG-004: prefix boundary cannot bypass the editor gate (review F3)", () => {
  it.each(["/cv//admin/", "/cv/admin%2F", "/cv/admin%2fapi/cvs", "/cv/%61dmin/", "/cv/./admin/../admin/api/cvs", "/cv/ADMIN/"])(
    "%s never serves editor content without credentials",
    async (path) => {
      // URL parsing normalizes dot segments, so a shape that resolves to a real
      // editor path must still hit the auth gate; the rest are simply not found.
      const res = await raw(path);
      expect([401, 404]).toContain(res.status);
      expect(await res.text()).not.toMatch(/Your CVs|"slug"/);
    },
  );

  it("keeps the query string when re-prefixing an asset redirect", async () => {
    const res = await raw("/cv/admin/edit.html?id=director", { Authorization: GOOD_AUTH });
    expect(res.status).toBeGreaterThanOrEqual(300);
    const target = new URL(res.headers.get("Location")!, ORIGIN);
    expect(target.pathname).toBe("/cv/admin/edit");
    expect(target.search).toBe("?id=director");
  });
});
