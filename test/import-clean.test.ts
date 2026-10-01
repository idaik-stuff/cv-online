import { describe, expect, it } from "vitest";
import { CleanError, cleanPredecessorCv, MOBILE_CSS, visibleText } from "../import/clean.mjs";
import { EDITOR_MARKUP } from "../src/contract";
import predecessor from "./fixtures/predecessor-like.html?raw";
import sample from "../seed/cvs/sample-director.html?raw";

// All fixtures are fictional (CHG-003 AC-08); the real CVs are never used in tests.

describe("CHG-003 AC-02: cleaning a predecessor CV", () => {
  const out = cleanPredecessorCv(predecessor);

  it("starts from a fixture that has every predecessor artifact", () => {
    expect(EDITOR_MARKUP.test(predecessor)).toBe(true);
    expect(predecessor).toContain('class="toolbar"');
    expect(predecessor).toContain('lang="es"');
  });

  it("removes the toolbar, scripts, file input, and editing attributes", () => {
    expect(out).not.toMatch(/class="toolbar"|id="photoInput"|id="saved"|<script|contenteditable|spellcheck/i);
    expect(EDITOR_MARKUP.test(out)).toBe(false);
  });

  it("removes editor-only CSS and Spanish comments", () => {
    expect(out).not.toMatch(/\.toolbar|#saved|\[contenteditable\]|cursor:pointer;background:#ddd|Barra de herramientas|PÁGINA/);
    expect(out).not.toMatch(/<!--/);
    expect(out).toContain("padding:24px 0 40px");
  });

  it("switches UI strings and language to English", () => {
    expect(out).toContain('<html lang="en">');
    expect(out).toContain('alt="Profile photo"');
    expect(out).not.toMatch(/Clic para|Foto de perfil/);
  });

  it("adds the small-screen rules and keeps A4 print", () => {
    expect(out).toContain(MOBILE_CSS);
    expect(out).toContain("@page{size:A4;margin:0}");
    expect(out).toContain("@media print");
  });

  it("keeps the visible CV text identical (AC-03 self-check)", () => {
    expect(visibleText(out)).toBe(visibleText(predecessor));
    expect(visibleText(out).length).toBeGreaterThan(200);
  });

  it("produces the same small-screen block as the committed samples", () => {
    expect(sample).toContain(MOBILE_CSS);
  });
});

describe("CHG-003: self-checks stop a bad conversion", () => {
  it("fails when the input is not a predecessor CV", () => {
    expect(() => cleanPredecessorCv("<!DOCTYPE html><html><body><p>nothing</p></body></html>")).toThrow(CleanError);
  });

  it("fails when cleaning would leave a script behind", () => {
    const tricky = predecessor.replace("</body>", "<SCRIPT src=x></SCRIPT>\n</body>").replace(/<script\b[\s\S]*?<\/script>/i, "");
    expect(() => cleanPredecessorCv(tricky.replace(/<SCRIPT src=x><\/SCRIPT>/, "<scr<script></script>ipt>"))).toThrow(CleanError);
  });

  it("reports only the check name, never content", () => {
    try {
      cleanPredecessorCv("<!DOCTYPE html><html lang=\"es\"><body>Private text</body></html>");
    } catch (e) {
      expect((e as Error).message).not.toContain("Private text");
      return;
    }
    throw new Error("expected a CleanError");
  });
});
