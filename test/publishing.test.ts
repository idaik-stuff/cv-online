import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { api, APP, get, sampleHtml, seedCv } from "./helpers";

async function summaryOf(id: string) {
  const res = await api("/admin/api/cvs");
  const list = (await res.json()) as Array<{ id: string; status: string }>;
  return list.find((c) => c.id === id);
}

describe("AC-04: CV list", () => {
  it("shows name, URL, derived status and last edit for each CV", async () => {
    const draftOnly = await seedCv();
    const published = await seedCv({ draft: sampleHtml("same"), published: sampleHtml("same") });
    const changed = await seedCv({ draft: sampleHtml("new"), published: sampleHtml("old") });

    const res = await api("/admin/api/cvs");
    expect(res.status).toBe(200);
    const list = (await res.json()) as Array<Record<string, unknown>>;
    const byId = Object.fromEntries(list.map((c) => [c.id, c]));

    expect(byId[draftOnly.id]).toMatchObject({
      name: draftOnly.name,
      url: `${APP}/${draftOnly.slug}`,
      status: "Draft",
      updatedAt: draftOnly.updatedAt,
    });
    expect(byId[published.id]).toMatchObject({ status: "Published" });
    expect(byId[changed.id]).toMatchObject({ status: "Unpublished changes" });
  });
});

describe("Draft editing and publishing", () => {
  it("AC-06: a saved draft is stored server-side and returned on a fresh read", async () => {
    const cv = await seedCv();
    const html = sampleHtml("saved on device A");
    const put = await api(`/admin/api/cvs/${cv.id}/draft`, "PUT", html);
    expect(put.status).toBe(200);

    const read = await api(`/admin/api/cvs/${cv.id}`);
    expect(((await read.json()) as { html: string }).html).toBe(html);
  });

  it("AC-07: saving a draft does not change the public page", async () => {
    const published = sampleHtml("published version");
    const cv = await seedCv({ draft: published, published });

    await api(`/admin/api/cvs/${cv.id}/draft`, "PUT", sampleHtml("work in progress"));

    const pub = await get(`/${cv.slug}`);
    expect(await pub.text()).toBe(published);
    expect((await summaryOf(cv.id))?.status).toBe("Unpublished changes");
  });

  it("AC-08: publish makes the public page an exact copy of the draft", async () => {
    const cv = await seedCv();
    const draft = sampleHtml("ready to publish — ünïcödé");
    await api(`/admin/api/cvs/${cv.id}/draft`, "PUT", draft);

    const res = await api(`/admin/api/cvs/${cv.id}/publish`, "POST");
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe("Published");

    const pub = await get(`/${cv.slug}`);
    expect(pub.status).toBe(200);
    expect(await pub.text()).toBe(draft);
  });

  it("AC-09: discard restores the draft to the published version", async () => {
    const published = sampleHtml("published");
    const cv = await seedCv({ draft: sampleHtml("unwanted edit"), published });

    const res = await api(`/admin/api/cvs/${cv.id}/discard`, "POST");
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe("Published");

    const read = await api(`/admin/api/cvs/${cv.id}`);
    expect(((await read.json()) as { html: string }).html).toBe(published);
  });

  it("AC-09: discard is refused for a CV that is not published", async () => {
    const cv = await seedCv();
    const res = await api(`/admin/api/cvs/${cv.id}/discard`, "POST");
    expect(res.status).toBe(409);
  });

  it("AC-10: unpublish removes the public page but keeps the CV and its draft", async () => {
    const draft = sampleHtml("keep me");
    const cv = await seedCv({ draft, published: draft });

    const res = await api(`/admin/api/cvs/${cv.id}/unpublish`, "POST");
    expect(res.status).toBe(200);

    const pub = await get(`/${cv.slug}`);
    expect(pub.status).toBe(404);
    expect((await summaryOf(cv.id))?.status).toBe("Draft");
    const read = await api(`/admin/api/cvs/${cv.id}`);
    expect(((await read.json()) as { html: string }).html).toBe(draft);
  });

  it.each([
    ["a script", '<!DOCTYPE html><html><body><div id="cv">x</div><script>alert(1)</script></body></html>'],
    ["contenteditable", '<!DOCTYPE html><html><body><div id="cv" contenteditable="true">x</div></body></html>'],
    ["editor marker attribute", '<!DOCTYPE html><html><body><div id="cv" data-ed="">x</div></body></html>'],
    ["the injected editor style", '<!DOCTYPE html><html><head><style id="__ed"></style></head><body><div id="cv">x</div></body></html>'],
  ])("refuses a draft containing %s (clean document contract)", async (_label, html) => {
    const cv = await seedCv();
    const res = await api(`/admin/api/cvs/${cv.id}/draft`, "PUT", html);
    expect(res.status).toBe(422);
    const read = await api(`/admin/api/cvs/${cv.id}`);
    expect(((await read.json()) as { html: string }).html).toBe(`<!DOCTYPE html><html lang="en"><head><title>Sample</title></head><body><div id="cv"><h1>draft ${cv.slug}</h1></div></body></html>`);
  });

  it("accepts CV text that merely mentions these words", async () => {
    const cv = await seedCv();
    const html = sampleHtml("Skills: contenteditable, data-ed attributes, &lt;script&gt; tags");
    expect((await api(`/admin/api/cvs/${cv.id}/draft`, "PUT", html)).status).toBe(200);
  });

  it("refuses editor markup with an unusual attribute separator", async () => {
    const cv = await seedCv();
    const html = '<!DOCTYPE html><html><body><div/contenteditable id="cv">x</div></body></html>';
    expect((await api(`/admin/api/cvs/${cv.id}/draft`, "PUT", html)).status).toBe(422);
  });

  it("discard derives status from the content it restores (partial-publish repair)", async () => {
    // Simulates a publish whose meta update failed: public holds newer content than meta says.
    const cv = await seedCv({ draft: sampleHtml("old"), published: sampleHtml("old") });
    await env.CV_BUCKET.put(`public/${cv.slug}.html`, sampleHtml("newer public"));
    await api(`/admin/api/cvs/${cv.id}/draft`, "PUT", sampleHtml("edit"));

    const res = await api(`/admin/api/cvs/${cv.id}/discard`, "POST");
    expect(((await res.json()) as { status: string }).status).toBe("Published");
    const read = await api(`/admin/api/cvs/${cv.id}`);
    expect(((await read.json()) as { html: string }).html).toBe(sampleHtml("newer public"));
  });

  it("rejects empty drafts and unknown CVs", async () => {
    const cv = await seedCv();
    expect((await api(`/admin/api/cvs/${cv.id}/draft`, "PUT", "   ")).status).toBe(400);
    expect((await api(`/admin/api/cvs/no-such-cv`)).status).toBe(404);
    expect((await api(`/admin/api/cvs/no-such-cv/publish`, "POST")).status).toBe(404);
  });

  it("rejects ids that could reach other bucket keys", async () => {
    await env.CV_BUCKET.put("secret/meta.json", "{}");
    for (const id of ["..%2Fsecret", "UPPER", "a_b"]) {
      expect((await api(`/admin/api/cvs/${id}`)).status, id).toBe(404);
    }
  });
});
