// Turns a CV document from the predecessor single-file editor into a clean
// document (CHG-003). Transforms are tailored to the inspected predecessor
// structure and are followed by self-checks; on failure only the name of the
// failed check is reported, never CV content.

import { EDITOR_MARKUP } from "../src/contract.ts";

export const MOBILE_CSS = `
/* Small screens: single column, no horizontal scrolling. Print stays A4. */
@media screen and (max-width:820px){
  html,body{background:#fbfbfc}
  body{padding:0}
  .page{width:auto;height:auto;margin:0;box-shadow:none;padding:20px 16px;overflow:visible}
  .head{flex-direction:column;align-items:flex-start;gap:12px}
  .photo{width:110px;height:135px}
  .name{font-size:30px}
  .role{font-size:14px;letter-spacing:.08em}
  .script{position:static;transform:none;text-align:left}
  .areas{grid-template-columns:repeat(2,1fr)}
  .kpis{grid-template-columns:repeat(2,1fr)}
  .cols{grid-template-columns:1fr}
  .jobhead{flex-direction:column;align-items:flex-start;gap:2px}
  .meta{white-space:normal}
  .kpi .num{white-space:normal;flex-wrap:wrap}
}
`;

// Leftovers of the predecessor's editing UI that must not survive.
const PREDECESSOR_MARKERS =
  /class="toolbar"|id="photoInput"|id="saved"|Clic para cambiar|Foto de perfil|<html[^>]*lang="es"|\.toolbar\b|#saved\b|\[contenteditable\]|cursor:pointer/i;

export class CleanError extends Error {
  constructor(check) {
    super(`self-check failed: ${check}`);
    this.check = check;
  }
}

// Visible text of the CV body, used to prove the cleaning changed no content.
export function visibleText(html) {
  const start = html.indexOf('<div id="cv"');
  const end = html.lastIndexOf("</body>");
  if (start < 0 || end < start) return "";
  return html
    .slice(start, end)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCss(css) {
  return (
    css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // Rules for the toolbar, its status line, and editing highlights.
      // Lookbehind keeps the delimiter, so adjacent rules are all removed.
      .replace(/(?<=^|[{}])\s*[^{}@]*(?:\.toolbar|#saved|\[contenteditable\])[^{}]*\{[^{}]*\}/g, "")
      .replace(/(\.photo\{[^}]*?)cursor:pointer;?/, "$1")
      .replace("padding:70px 0 40px", "padding:24px 0 40px")
      .replace(/\n{3,}/g, "\n\n")
  );
}

export function cleanPredecessorCv(html) {
  const before = visibleText(html);

  let out = html
    .replace(/<div class="toolbar">[\s\S]*?<\/div>\s*/, "")
    .replace(/<script\b[\s\S]*?<\/script>\s*/gi, "")
    .replace(/<!--[\s\S]*?-->\s*/g, "")
    .replace(/\s(?:contenteditable|spellcheck)="[^"]*"/gi, "")
    .replace(/\stitle="Clic para cambiar la foto"/, "")
    .replace(/alt="Foto de perfil"/, 'alt="Profile photo"')
    .replace(/(<html[^>]*\slang=")es(")/, "$1en$2");

  out = out.replace(/<style>([\s\S]*?)<\/style>/, (_m, css) => `<style>${cleanCss(css)}${MOBILE_CSS}</style>`);

  if (EDITOR_MARKUP.test(out)) throw new CleanError("editor markup or script remains");
  if (PREDECESSOR_MARKERS.test(out)) throw new CleanError("predecessor UI remains");
  if (!out.includes('<div id="cv"')) throw new CleanError("#cv missing");
  if (!/<html[^>]*\slang="en"/.test(out)) throw new CleanError("lang is not en");
  if (!out.includes("@page{size:A4;margin:0}") || !out.includes("@media print")) throw new CleanError("A4 print rules missing");
  if (!out.includes("@media screen and (max-width:820px)")) throw new CleanError("small-screen rules missing");
  if (before === "" || visibleText(out) !== before) throw new CleanError("visible text changed");

  return out;
}
