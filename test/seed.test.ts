import { describe, expect, it } from "vitest";
import director from "../seed/cvs/sample-director.html?raw";
import pm from "../seed/cvs/sample-pm.html?raw";

// Clean document contract (CHG-002 plan): stored CVs carry no editor behavior,
// so a published snapshot is safe and clean as-is (AC-12, AC-15).
describe.each([
  ["sample-director", director],
  ["sample-pm", pm],
])("seed CV %s", (_name, html) => {
  it("is a clean document", () => {
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('<div id="cv">');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/contenteditable/i);
    expect(html).not.toMatch(/class="toolbar"/);
    expect(html).not.toMatch(/\son[a-z]+=/i);
  });

  it("has a small-screen layout and keeps A4 print (NFR-04, NFR-05)", () => {
    expect(html).toMatch(/@media screen and \(max-width:820px\)/);
    expect(html).toMatch(/@page\{size:A4;margin:0\}/);
  });

  it("is fictional and in English", () => {
    expect(html).toContain('lang="en"');
    expect(html).toContain("fictional sample");
    expect(html).not.toMatch(/idaika|iglesias|gmail\.com/i);
    expect(html).not.toMatch(/data:image\/jpe?g/);
  });
});
