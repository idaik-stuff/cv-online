// CV storage in the dedicated R2 bucket (ADR-0002).
//
// Layout:
//   cvs/{id}/meta.json   CvMeta
//   cvs/{id}/draft.html  the draft document
//   public/{slug}.html   the published snapshot served at /{slug}
//
// In CHG-002 a CV's id equals its slug; slugs become editable in CAP-05.

export interface CvMeta {
  id: string;
  name: string;
  slug: string;
  updatedAt: string;
  publishedAt: string | null;
  draftHash: string;
  publishedHash: string | null;
}

export type CvStatus = "Draft" | "Published" | "Unpublished changes";

export interface CvSummary {
  id: string;
  name: string;
  slug: string;
  url: string;
  status: CvStatus;
  updatedAt: string;
  publishedAt: string | null;
}

export class NotPublishedError extends Error {}

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const RESERVED = new Set(["admin"]);

export function isValidSlug(slug: string): boolean {
  return SLUG.test(slug) && !RESERVED.has(slug);
}

// R3: status is derived from content hashes, never stored by hand.
export function statusOf(meta: CvMeta): CvStatus {
  if (meta.publishedHash === null) return "Draft";
  return meta.publishedHash === meta.draftHash ? "Published" : "Unpublished changes";
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const metaKey = (id: string) => `cvs/${id}/meta.json`;
const draftKey = (id: string) => `cvs/${id}/draft.html`;
const publicKey = (slug: string) => `public/${slug}.html`;

const HTML = { httpMetadata: { contentType: "text/html; charset=utf-8" } };
const JSON_TYPE = { httpMetadata: { contentType: "application/json" } };

export class CvStore {
  constructor(private bucket: R2Bucket) {}

  summary(meta: CvMeta, origin: string): CvSummary {
    return {
      id: meta.id,
      name: meta.name,
      slug: meta.slug,
      url: `${origin}/${meta.slug}`,
      status: statusOf(meta),
      updatedAt: meta.updatedAt,
      publishedAt: meta.publishedAt,
    };
  }

  async getMeta(id: string): Promise<CvMeta | null> {
    if (!isValidSlug(id)) return null;
    const obj = await this.bucket.get(metaKey(id));
    return obj ? ((await obj.json()) as CvMeta) : null;
  }

  private async putMeta(meta: CvMeta): Promise<void> {
    await this.bucket.put(metaKey(meta.id), JSON.stringify(meta), JSON_TYPE);
  }

  async list(): Promise<CvMeta[]> {
    const metas: CvMeta[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.bucket.list({ prefix: "cvs/", cursor });
      for (const obj of page.objects) {
        if (!obj.key.endsWith("/meta.json")) continue;
        const body = await this.bucket.get(obj.key);
        if (body) metas.push((await body.json()) as CvMeta);
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return metas.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getDraft(id: string): Promise<string | null> {
    const obj = await this.bucket.get(draftKey(id));
    return obj ? obj.text() : null;
  }

  async saveDraft(meta: CvMeta, html: string): Promise<CvMeta> {
    await this.bucket.put(draftKey(meta.id), html, HTML);
    const next = { ...meta, draftHash: await sha256(html), updatedAt: new Date().toISOString() };
    await this.putMeta(next);
    return next;
  }

  // R2 snapshot publishing. The public object is written before the meta, so a
  // failure in between leaves a correct public page; publishing again repairs meta.
  async publish(meta: CvMeta): Promise<CvMeta> {
    const draft = await this.getDraft(meta.id);
    if (draft === null) throw new Error(`draft missing for ${meta.id}`);
    await this.bucket.put(publicKey(meta.slug), draft, HTML);
    const next = { ...meta, publishedHash: await sha256(draft), publishedAt: new Date().toISOString() };
    await this.putMeta(next);
    return next;
  }

  async unpublish(meta: CvMeta): Promise<CvMeta> {
    await this.bucket.delete(publicKey(meta.slug));
    const next = { ...meta, publishedHash: null, publishedAt: null };
    await this.putMeta(next);
    return next;
  }

  async discard(meta: CvMeta): Promise<CvMeta> {
    const published = await this.getPublished(meta.slug);
    if (published === null || meta.publishedHash === null) throw new NotPublishedError();
    await this.bucket.put(draftKey(meta.id), published, HTML);
    // Hash what was actually written, so status stays true even after a partial publish.
    const hash = await sha256(published);
    const next = { ...meta, draftHash: hash, publishedHash: hash, updatedAt: new Date().toISOString() };
    await this.putMeta(next);
    return next;
  }

  async getPublished(slug: string): Promise<string | null> {
    if (!isValidSlug(slug)) return null;
    const obj = await this.bucket.get(publicKey(slug));
    return obj ? obj.text() : null;
  }
}
