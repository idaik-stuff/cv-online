// HTTP Basic Authentication for the editor (ADR-0003).

export type AuthResult = "ok" | "denied" | "not-configured";

const encoder = new TextEncoder();

async function digest(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", encoder.encode(value));
}

// Compare fixed-length digests so neither content nor length leaks through timing.
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([digest(a), digest(b)]);
  return crypto.subtle.timingSafeEqual(da, db);
}

function decodeBasic(header: string | null): { user: string; password: string } | null {
  if (!header) return null;
  const match = /^Basic\s+([A-Za-z0-9+/=]+)\s*$/i.exec(header);
  if (!match) return null;
  let decoded: string;
  try {
    const bytes = Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0));
    decoded = new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return null;
  return { user: decoded.slice(0, sep), password: decoded.slice(sep + 1) };
}

export async function checkAuth(request: Request, env: Env): Promise<AuthResult> {
  // Fail closed when the secrets are missing.
  if (!env.ADMIN_USER || !env.ADMIN_PASSWORD) return "not-configured";
  const creds = decodeBasic(request.headers.get("Authorization"));
  if (!creds) return "denied";
  const [userOk, passOk] = await Promise.all([
    safeEqual(creds.user, env.ADMIN_USER),
    safeEqual(creds.password, env.ADMIN_PASSWORD),
  ]);
  return userOk && passOk ? "ok" : "denied";
}

// Basic Auth credentials are sent automatically by the browser, so every
// state-changing request must come from the editor's own origin (CSRF).
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("Sec-Fetch-Site");
  if (site !== null) return site === "same-origin";
  const origin = request.headers.get("Origin");
  if (origin !== null) return origin === new URL(request.url).origin;
  return false;
}
