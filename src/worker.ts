import { checkAuth, isSameOrigin } from "./auth";
import { error, json, notFound, privateHeaders, publicPage, unauthorized } from "./responses";
import { CvStore, NotPublishedError } from "./store";

const MAX_DRAFT_BYTES = 2 * 1024 * 1024;

// Clean document contract: a stored CV carries no scripts and no editor markup.
// Attribute checks only match inside tags, so CV text may mention these words.
const EDITOR_MARKUP = /<script\b|<[^>]*[\s/](contenteditable|data-ed)\b|<[^>]*\sid=["']?__ed\b/i;

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function log(event: string, fields: Record<string, unknown> = {}): void {
  // Never log credentials or CV content.
  console.log(JSON.stringify({ event, ...fields }));
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const store = new CvStore(env.CV_BUCKET);
  const parts = url.pathname.replace(/^\/admin\/api\//, "").split("/").filter(Boolean);
  const method = request.method;

  if (method !== "GET" && method !== "HEAD" && !isSameOrigin(request)) {
    log("csrf_rejected", { path: url.pathname });
    return error("Cross-origin request rejected.", 403);
  }

  // GET /admin/api/cvs
  if (parts.length === 1 && parts[0] === "cvs") {
    if (method !== "GET") return error("Method not allowed.", 405);
    const metas = await store.list();
    return json(metas.map((m) => store.summary(m, url.origin)));
  }

  if (parts[0] !== "cvs" || parts.length < 2 || parts.length > 3) return error("Not found.", 404);
  const meta = await store.getMeta(parts[1]);
  if (!meta) return error("CV not found.", 404);
  const action = parts[2];

  // GET /admin/api/cvs/{id}
  if (action === undefined) {
    if (method !== "GET") return error("Method not allowed.", 405);
    const html = await store.getDraft(meta.id);
    return json({ ...store.summary(meta, url.origin), html });
  }

  // PUT /admin/api/cvs/{id}/draft
  if (action === "draft") {
    if (method !== "PUT") return error("Method not allowed.", 405);
    const html = await request.text();
    if (!html.trim()) return error("Draft is empty.", 400);
    if (new TextEncoder().encode(html).byteLength > MAX_DRAFT_BYTES) return error("Draft is too large.", 413);
    if (EDITOR_MARKUP.test(html)) return error("Draft contains scripts or editor markup.", 422);
    const next = await store.saveDraft(meta, html);
    log("draft_saved", { id: meta.id });
    return json(store.summary(next, url.origin));
  }

  if (method !== "POST") return error("Method not allowed.", 405);

  if (action === "publish") {
    const next = await store.publish(meta);
    log("published", { id: meta.id });
    return json(store.summary(next, url.origin));
  }
  if (action === "unpublish") {
    const next = await store.unpublish(meta);
    log("unpublished", { id: meta.id });
    return json(store.summary(next, url.origin));
  }
  if (action === "discard") {
    try {
      const next = await store.discard(meta);
      log("discarded", { id: meta.id });
      return json(store.summary(next, url.origin));
    } catch (e) {
      if (e instanceof NotPublishedError) return error("This CV has never been published.", 409);
      throw e;
    }
  }
  return error("Not found.", 404);
}

async function handleAdmin(request: Request, env: Env, url: URL): Promise<Response> {
  const auth = await checkAuth(request, env);
  if (auth === "not-configured") {
    log("auth_not_configured");
    return new Response("Editor is not configured.", { status: 503 });
  }
  if (auth === "denied") {
    log("auth_failed", { path: url.pathname });
    return unauthorized();
  }

  if (url.pathname.startsWith("/admin/api/")) {
    return privateHeaders(await handleApi(request, env, url));
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return privateHeaders(error("Method not allowed.", 405));
  }
  if (url.pathname === "/admin") {
    return privateHeaders(Response.redirect(`${url.origin}/admin/`, 302));
  }
  const asset = await env.ASSETS.fetch(request);
  return privateHeaders(asset.status === 404 ? notFound() : asset);
}

async function handlePublic(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return notFound();
  // Only "/{slug}" is a public CV; "/" and anything nested is not found.
  const match = /^\/([^/]+)$/.exec(url.pathname);
  if (!match) return notFound();
  const html = await new CvStore(env.CV_BUCKET).getPublished(match[1]);
  return html === null ? notFound() : publicPage(html);
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    try {
      return isAdminPath(url.pathname)
        ? await handleAdmin(request, env, url)
        : await handlePublic(request, env, url);
    } catch (e) {
      log("server_error", { path: url.pathname, message: e instanceof Error ? e.message : String(e) });
      return new Response("Something went wrong.", { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
