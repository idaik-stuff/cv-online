// Uploads the fictional sample CVs to the R2 bucket as drafts.
// Usage: node seed/seed.mjs --local | --remote
// Only writes the sample-* keys, so it never touches real CVs.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const BUCKET = "cv-online";
const SAMPLES = [
  { slug: "sample-director", name: "Sample – Innovation Director" },
  { slug: "sample-pm", name: "Sample – Senior IT Project Manager" },
];

const target = process.argv[2];
if (target !== "--local" && target !== "--remote") {
  console.error("Usage: node seed/seed.mjs --local | --remote");
  process.exit(2);
}

const win = process.platform === "win32";
// On Windows npx is a .cmd file, which needs a shell; quote values with spaces or ";".
const q = (v) => (win && /[\s;]/.test(v) ? `"${v}"` : v);

function wrangler(args, what) {
  const res = spawnSync("npx", ["wrangler", "r2", "object", ...args, target], { stdio: "inherit", shell: win });
  if (res.status !== 0) throw new Error(`${what} failed`);
}

function put(key, file, contentType) {
  wrangler(["put", `${BUCKET}/${key}`, "--file", file, "--content-type", q(contentType)], `upload of ${key}`);
}

const tmp = mkdtempSync(join(tmpdir(), "cv-seed-"));
try {
  for (const { slug, name } of SAMPLES) {
    const file = join("seed", "cvs", `${slug}.html`);
    const html = readFileSync(file, "utf8");
    const meta = {
      id: slug,
      name,
      slug,
      updatedAt: new Date().toISOString(),
      publishedAt: null,
      draftHash: createHash("sha256").update(html, "utf8").digest("hex"),
      publishedHash: null,
    };
    const metaFile = join(tmp, `${slug}.json`);
    writeFileSync(metaFile, JSON.stringify(meta));
    put(`cvs/${slug}/draft.html`, file, "text/html; charset=utf-8");
    put(`cvs/${slug}/meta.json`, metaFile, "application/json");
    // A seeded CV starts unpublished, so remove any earlier public snapshot.
    wrangler(["delete", `${BUCKET}/public/${slug}.html`], `delete of public/${slug}.html`);
    console.log(`seeded ${slug} (${target.slice(2)})`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
