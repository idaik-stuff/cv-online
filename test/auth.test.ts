import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src/worker";
import { APP, basic, get, GOOD_AUTH, sampleHtml, seedCv } from "./helpers";

const PROTECTED = [
  "/admin",
  "/admin/",
  "/admin/edit.html",
  "/admin/editor.js",
  "/admin/does-not-exist",
  "/admin/api/cvs",
];

describe("AC-01 / AC-02: editor access is refused without valid credentials", () => {
  it.each(PROTECTED)("refuses %s without credentials", async (path) => {
    const res = await get(path);
    expect(res.status).toBe(401);
    expect(res.headers.get("WWW-Authenticate")).toMatch(/^Basic /);
  });

  it("refuses draft reads and every write without credentials, and leaks no content", async () => {
    const cv = await seedCv();
    const secret = `draft ${cv.slug}`;
    const calls: Array<[string, string]> = [
      [`/admin/api/cvs/${cv.id}`, "GET"],
      [`/admin/api/cvs/${cv.id}/draft`, "PUT"],
      [`/admin/api/cvs/${cv.id}/publish`, "POST"],
      [`/admin/api/cvs/${cv.id}/unpublish`, "POST"],
      [`/admin/api/cvs/${cv.id}/discard`, "POST"],
    ];
    for (const [path, method] of calls) {
      const res = await SELF.fetch(APP + path, { method, body: method === "GET" ? undefined : "x" });
      expect(res.status, `${method} ${path}`).toBe(401);
      expect(await res.text()).not.toContain(secret);
    }
  });

  it.each([
    ["wrong user", basic("someone", "test-password-123")],
    ["wrong password", basic("test-admin", "nope")],
    ["empty password", basic("test-admin", "")],
    ["malformed scheme", "Bearer abc"],
    ["malformed base64", "Basic !!!"],
    ["no separator", "Basic " + btoa("test-admin")],
  ])("refuses %s", async (_label, header) => {
    const res = await get("/admin/api/cvs", { Authorization: header });
    expect(res.status).toBe(401);
    expect(await res.text()).not.toContain("slug");
  });
});

describe("AC-03: the owner signs in", () => {
  it("serves the CV list page with valid credentials", async () => {
    const res = await get("/admin/", { Authorization: GOOD_AUTH });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/html/);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Robots-Tag")).toMatch(/noindex/);
    expect(await res.text()).toContain("Your CVs");
  });

  it("redirects /admin to /admin/", async () => {
    const res = await SELF.fetch(`${APP}/admin`, { headers: { Authorization: GOOD_AUTH }, redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(`${APP}/admin/`);
  });
});

describe("CSRF: writes must come from the editor's own origin", () => {
  const ORIGINS: Array<[string, Record<string, string>]> = [
    ["cross-site fetch metadata", { "Sec-Fetch-Site": "cross-site" }],
    ["foreign Origin", { Origin: "https://evil.example" }],
    ["no origin information", {}],
  ];
  const WRITES: Array<[string, string]> = [
    ["PUT", "draft"],
    ["POST", "publish"],
    ["POST", "unpublish"],
    ["POST", "discard"],
  ];
  const cases = WRITES.flatMap(([method, action]) =>
    ORIGINS.map(([label, extra]) => [`${method} ${action}`, label, method, action, extra] as const),
  );

  it.each(cases)("rejects %s with %s and valid credentials", async (_w, _l, method, action, extra) => {
    const published = sampleHtml("published");
    const cv = await seedCv({ draft: sampleHtml("draft"), published });
    const metaBefore = await (await env.CV_BUCKET.get(`cvs/${cv.id}/meta.json`))!.text();

    const res = await SELF.fetch(`${APP}/admin/api/cvs/${cv.id}/${action}`, {
      method,
      headers: { Authorization: GOOD_AUTH, ...extra },
      body: method === "PUT" ? sampleHtml("attacker") : undefined,
    });

    expect(res.status).toBe(403);
    expect(await (await env.CV_BUCKET.get(`cvs/${cv.id}/meta.json`))!.text()).toBe(metaBefore);
    expect(await (await env.CV_BUCKET.get(`cvs/${cv.id}/draft.html`))!.text()).toBe(sampleHtml("draft"));
    expect(await (await get(`/${cv.slug}`)).text()).toBe(published);
  });
});

describe("Fail closed: editor stays shut when the secrets are missing", () => {
  it.each([
    ["no user", { ADMIN_USER: undefined }],
    ["no password", { ADMIN_PASSWORD: undefined }],
    ["empty values", { ADMIN_USER: "", ADMIN_PASSWORD: "" }],
  ])("%s → 503 with no editor content", async (_label, override) => {
    const brokenEnv = { ...env, ...override } as Env;
    for (const path of ["/admin/", "/admin/api/cvs"]) {
      const req = new Request<unknown, IncomingRequestCfProperties>(APP + path, { headers: { Authorization: basic("", "") } });
      const res = await worker.fetch(req, brokenEnv);
      expect(res.status, path).toBe(503);
      const body = await res.text();
      expect(body).not.toContain("Your CVs");
      expect(body).not.toContain("slug");
    }
  });
});

describe("Editor responses", () => {
  it("restrict scripts to the editor's own files (CSP inherited by the CV preview)", async () => {
    for (const path of ["/admin/", "/admin/api/cvs"]) {
      const res = await get(path, { Authorization: GOOD_AUTH });
      expect(res.headers.get("Content-Security-Policy"), path).toContain("script-src 'self'");
    }
  });
});
