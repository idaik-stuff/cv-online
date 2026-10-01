import { checkAuth, isSameOrigin } from "./auth";
import { EDITOR_MARKUP } from "./contract";
import { error, json, notFound, privateHeaders, publicPage, unauthorized } from "./responses";
import { CvStore, NotPublishedError } from "./store";

const MAX_DRAFT_BYTES = 2 * 1024 * 1024;

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function log(event: string, fields: Record<string, unknown> = {}): void {
  // Never log credentials or CV content.
  console.log(JSON.stringify({ event, ...fields }));
}

// `url` carries the path without BASE_PATH; `base` is the public URL prefix (origin + BASE_PATH).
async function handleApi(request: Request, env: Env, url: URL, base: string): Promise<Response> {
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
    return json(metas.map((m) => store.summary(m, base)));
  }

  if (parts[0] !== "cvs" || parts.length < 2 || parts.length > 3) return error("Not found.", 404);
  const meta = await store.getMeta(parts[1]);
  if (!meta) return error("CV not found.", 404);
  const action = parts[2];

  // GET /admin/api/cvs/{id}
  if (action === undefined) {
    if (method !== "GET") return error("Method not allowed.", 405);
    const html = await store.getDraft(meta.id);
    return json({ ...store.summary(meta, base), html });
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
    return json(store.summary(next, base));
  }

  if (method !== "POST") return error("Method not allowed.", 405);

  if (action === "publish") {
    const next = await store.publish(meta);
    log("published", { id: meta.id });
    return json(store.summary(next, base));
  }
  if (action === "unpublish") {
    const next = await store.unpublish(meta);
    log("unpublished", { id: meta.id });
    return json(store.summary(next, base));
  }
  if (action === "discard") {
    try {
      const next = await store.discard(meta);
      log("discarded", { id: meta.id });
      return json(store.summary(next, base));
    } catch (e) {
      if (e instanceof NotPublishedError) return error("This CV has never been published.", 409);
      throw e;
    }
  }
  return error("Not found.", 404);
}

async function handleAdmin(request: Request, env: Env, url: URL, base: string): Promise<Response> {
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
    return privateHeaders(await handleApi(request, env, url, base));
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return privateHeaders(error("Method not allowed.", 405));
  }
  if (url.pathname === "/admin") {
    return privateHeaders(Response.redirect(`${base}/admin/`, 302));
  }
  // Assets live at the root of the assets directory, so fetch them by the
  // stripped path and put the prefix back on any redirect they answer with.
  const asset = await env.ASSETS.fetch(new Request(url, request));
  if (asset.status === 404) return privateHeaders(notFound());
  const location = asset.headers.get("Location");
  if (location) {
    const target = new URL(location, url);
    if (target.origin === url.origin) {
      const res = new Response(asset.body, asset);
      res.headers.set("Location", `${base}${target.pathname}${target.search}`);
      return privateHeaders(res);
    }
  }
  return privateHeaders(asset);
}

async function handlePublic(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return notFound();
  // Only "/{slug}" is a public CV; "/" and anything nested is not found.
  const match = /^\/([^/]+)$/.exec(url.pathname);
  if (!match) return notFound();
  const html = await new CvStore(env.CV_BUCKET).getPublished(match[1]);
  return html === null ? notFound() : publicPage(html);
}

// The app is served under BASE_PATH (for example "/cv", ADR-0004). Unset means the site root.
function basePath(env: Env): string {
  const trimmed = (env.BASE_PATH ?? "").trim().replace(/^\/+|\/+$/g, "");
  return trimmed === "" ? "" : "/" + trimmed;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const prefix = basePath(env);
    // Only paths below the prefix belong to the app; the prefix itself and
    // everything else on the host are "not found".
    if (prefix !== "" && !url.pathname.startsWith(prefix + "/")) return notFound();
    const route = new URL(url);
    route.pathname = url.pathname.slice(prefix.length);
    const base = url.origin + prefix;
    try {
      return isAdminPath(route.pathname)
        ? await handleAdmin(request, env, route, base)
        : await handlePublic(request, env, route);
    } catch (e) {
      log("server_error", { path: route.pathname, message: e instanceof Error ? e.message : String(e) });
      return new Response("Something went wrong.", { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
