// One-off import of the owner's CVs from the predecessor editor (CHG-003).
//
// Usage:
//   node import/import-cvs.mjs --dry-run [--preview private/import-preview]
//   node import/import-cvs.mjs --local | --remote
//
// Reads the CVs exported from the predecessor ("Descargar HTML") in private/,
// cleans each one, and uploads it as a draft. Never overwrites an existing CV, removes the fictional samples from
// the target, and never prints CV content: only slugs, sizes, and hashes.

import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { CleanError, cleanPredecessorCv } from "./clean.mjs";

const BUCKET = "cv-online";
const CVS = [
  { source: "private/director.html", slug: "director", name: "Innovation Director" },
  { source: "private/senior-pm.html", slug: "senior-pm", name: "Senior IT Project/Program Manager" },
];
const SAMPLES = ["sample-director", "sample-pm"];

const args = process.argv.slice(2);
const target = args.find((a) => a === "--local" || a === "--remote");
const dryRun = args.includes("--dry-run");
const previewIdx = args.indexOf("--preview");
const previewDir = previewIdx >= 0 ? args[previewIdx + 1] : null;
if (!dryRun && !target) {
  console.error("Usage: node import/import-cvs.mjs --dry-run [--preview private/<dir>] | --local | --remote");
  process.exit(2);
}
// The preview holds real CV content, so it may only live in the ignored private/ folder.
if (previewDir && relative(resolve("private"), resolve(previewDir)).startsWith("..")) {
  console.error("--preview must be a folder inside private/ (ignored by Git).");
  process.exit(2);
}

const sha = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const win = process.platform === "win32";
const q = (v) => (win && /[\s;]/.test(v) ? `"${v}"` : v);

// Runs `wrangler r2 object …`. Output is captured, not printed: it can hold
// nothing but status lines, yet we keep the console limited to our summary.
function r2(sub, key, extra = []) {
  const res = spawnSync("npx", ["wrangler", "r2", "object", sub, `${BUCKET}/${key}`, ...extra, target], {
    shell: win,
    encoding: "utf8",
  });
  return res.status === 0;
}

const readSources = () => CVS.map((cv) => readFileSync(cv.source, "utf8"));
const sourceHash = (texts) => sha(texts.join("\u0000"));

let cleaned, sourceBefore;
try {
  const texts = readSources();
  sourceBefore = sourceHash(texts);
  cleaned = CVS.map((cv, i) => ({ ...cv, html: cleanPredecessorCv(texts[i]) }));
} catch (e) {
  console.error(e instanceof CleanError ? `Aborted before any upload: ${e.message}` : "Aborted: could not read the exported source files in private/.");
  process.exit(1);
}

for (const cv of cleaned) {
  console.log(`checked  ${cv.slug.padEnd(10)} ${String(Buffer.byteLength(cv.html)).padStart(6)} bytes  sha256 ${sha(cv.html).slice(0, 12)}  all self-checks passed`);
}

if (previewDir) {
  mkdirSync(previewDir, { recursive: true });
  for (const cv of cleaned) writeFileSync(join(previewDir, `${cv.slug}.html`), cv.html);
  console.log(`preview  written to ${previewDir} (ignored by Git)`);
}

if (!dryRun) {
  const tmp = mkdtempSync(join(tmpdir(), "cv-import-"));
  try {
    for (const cv of cleaned) {
      if (r2("get", `cvs/${cv.slug}/meta.json`, ["--file", join(tmp, "existing.json")])) {
        console.log(`skipped  ${cv.slug} (already exists; nothing changed)`);
        continue;
      }
      const draftFile = join(tmp, `${cv.slug}.html`);
      const metaFile = join(tmp, `${cv.slug}.json`);
      writeFileSync(draftFile, cv.html);
      writeFileSync(
        metaFile,
        JSON.stringify({
          id: cv.slug,
          name: cv.name,
          slug: cv.slug,
          updatedAt: new Date().toISOString(),
          publishedAt: null,
          draftHash: sha(cv.html),
          publishedHash: null,
        }),
      );
      // Draft first, meta last: a CV only appears in the list once complete.
      if (!r2("put", `cvs/${cv.slug}/draft.html`, ["--file", draftFile, "--content-type", q("text/html; charset=utf-8")]))
        throw new Error(`upload failed: ${cv.slug} draft`);
      if (!r2("put", `cvs/${cv.slug}/meta.json`, ["--file", metaFile, "--content-type", "application/json"]))
        throw new Error(`upload failed: ${cv.slug} meta`);
      console.log(`imported ${cv.slug} as draft "${cv.name}"`);
    }
    for (const slug of SAMPLES) {
      for (const key of [`cvs/${slug}/meta.json`, `cvs/${slug}/draft.html`, `public/${slug}.html`]) r2("delete", key);
      console.log(`removed  ${slug} (fictional sample)`);
    }
  } catch (e) {
    console.error(`Stopped: ${e.message}. Re-running is safe: imported CVs are skipped.`);
    process.exitCode = 1;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const sourceAfter = sourceHash(readSources());
console.log(`source   sha256 before ${sourceBefore.slice(0, 12)}  after ${sourceAfter.slice(0, 12)}  ${sourceBefore === sourceAfter ? "unchanged" : "CHANGED"}`);
console.log(dryRun ? "dry run: nothing uploaded" : `done (${target.slice(2)})`);
