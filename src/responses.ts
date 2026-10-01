// Response helpers and security headers.

// Public CV pages: no scripts may run (defense in depth against stored markup).
const PUBLIC_CSP = [
  "default-src 'none'",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src data: https:",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

const COMMON = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export function publicPage(html: string): Response {
  return new Response(html, {
    headers: {
      ...COMMON,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": PUBLIC_CSP,
      // Always revalidate, so a publish is visible on the next request.
      "Cache-Control": "no-cache",
    },
  });
}

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Page not found</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f2f0ed;color:#16295a;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center;padding:24px}
h1{font-size:28px;margin:0 0 8px}
p{margin:0;color:#5a6275}
</style>
</head>
<body>
<main>
<h1>Page not found</h1>
<p>This CV does not exist or is no longer published.</p>
</main>
</body>
</html>
`;

export function notFound(): Response {
  return new Response(NOT_FOUND_HTML, {
    status: 404,
    headers: {
      ...COMMON,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": PUBLIC_CSP,
      "Cache-Control": "no-cache",
    },
  });
}

// Editor pages may only run their own script files. The CV preview iframe
// (srcdoc) inherits this policy, so scripts inside a CV document never run.
const ADMIN_CSP = [
  "script-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'self'",
].join("; ");

// Every editor response: never cached, never indexed.
export function privateHeaders(response: Response): Response {
  const res = new Response(response.body, response);
  res.headers.set("Content-Security-Policy", ADMIN_CSP);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  return res;
}

export function unauthorized(): Response {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="cv-online editor", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function error(message: string, status: number): Response {
  return json({ error: message }, status);
}
