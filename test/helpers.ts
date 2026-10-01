import { env, SELF } from "cloudflare:test";
import { sha256, type CvMeta } from "../src/store";

export const ORIGIN = "https://cv.example";
// The app is served under BASE_PATH from wrangler.jsonc (ADR-0004).
export const BASE = "/cv";
export const APP = ORIGIN + BASE;

export function basic(user: string, password: string): string {
  return "Basic " + btoa(`${user}:${password}`);
}

export const GOOD_AUTH = basic("test-admin", "test-password-123");

let counter = 0;
export function uniqueSlug(prefix = "cv"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export const sampleHtml = (marker: string) =>
  `<!DOCTYPE html><html lang="en"><head><title>Sample</title></head><body><div id="cv"><h1>${marker}</h1></div></body></html>`;

// Seeds a CV directly in the bucket, optionally already published.
export async function seedCv(opts: { slug?: string; draft?: string; published?: string | null } = {}): Promise<CvMeta> {
  const slug = opts.slug ?? uniqueSlug();
  const draft = opts.draft ?? sampleHtml(`draft ${slug}`);
  const published = opts.published ?? null;
  const meta: CvMeta = {
    id: slug,
    name: `Sample ${slug}`,
    slug,
    updatedAt: "2026-10-01T10:00:00.000Z",
    publishedAt: published === null ? null : "2026-10-01T10:00:00.000Z",
    draftHash: await sha256(draft),
    publishedHash: published === null ? null : await sha256(published),
  };
  await env.CV_BUCKET.put(`cvs/${slug}/draft.html`, draft);
  await env.CV_BUCKET.put(`cvs/${slug}/meta.json`, JSON.stringify(meta));
  if (published !== null) await env.CV_BUCKET.put(`public/${slug}.html`, published);
  return meta;
}

// Paths are relative to the app (BASE is prepended).
export function get(path: string, headers: Record<string, string> = {}): Promise<Response> {
  return SELF.fetch(APP + path, { headers });
}

// An authenticated, same-origin editor call (what the editor UI sends).
export function api(path: string, method = "GET", body?: string): Promise<Response> {
  const headers: Record<string, string> = { Authorization: GOOD_AUTH };
  if (method !== "GET") {
    headers["Origin"] = ORIGIN;
    headers["Sec-Fetch-Site"] = "same-origin";
  }
  return SELF.fetch(APP + path, { method, headers, body });
}
