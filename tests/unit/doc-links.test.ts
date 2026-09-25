import { describe, expect, it } from "vitest";
import { detectDocProvider, docHost, docPreviewUrl, docProviderById, normaliseDocUrl } from "@/lib/doc-links";

describe("detectDocProvider", () => {
  it.each([
    ["https://docs.google.com/document/d/1abc/edit?usp=sharing", "google_doc"],
    ["https://docs.google.com/spreadsheets/d/1abc/edit#gid=0", "google_sheet"],
    ["https://docs.google.com/presentation/d/1abc/edit", "google_slides"],
    ["https://drive.google.com/file/d/1abc/view?usp=sharing", "google_drive"],
    ["https://www.notion.so/Guide-abc123", "notion"],
    ["https://winwin.notion.site/Setup-abc", "notion"],
    ["https://github.com/RR-LIBRARY/win-win-agency#readme", "github"],
    ["https://www.loom.com/share/abc", "loom"],
    ["https://www.figma.com/file/abc/Design", "figma"],
    ["https://youtu.be/dQw4w9WgXcQ", "youtube"],
    ["https://example.com/manual.PDF", "pdf"],
    ["https://example.com/help", "link"],
    ["", "link"],
    ["nope", "link"],
  ])("%s → %s", (url, provider) => {
    expect(detectDocProvider(url)).toBe(provider);
  });

  it("anchors matching to the hostname", () => {
    expect(detectDocProvider("https://evil.com/docs.google.com/document/d/1/edit")).toBe("link");
    expect(detectDocProvider("https://notion.so.evil.com/x")).toBe("link");
  });
});

describe("normaliseDocUrl", () => {
  it("accepts https only", () => {
    expect(normaliseDocUrl("  https://docs.google.com/document/d/1/edit ")).toBe("https://docs.google.com/document/d/1/edit");
    expect(normaliseDocUrl("http://example.com")).toBeNull();
    expect(normaliseDocUrl("javascript:alert(1)")).toBeNull();
    expect(normaliseDocUrl("")).toBeNull();
    expect(normaliseDocUrl(null)).toBeNull();
  });
});

describe("docPreviewUrl", () => {
  it("turns Google edit links into read-only previews", () => {
    expect(docPreviewUrl("https://docs.google.com/document/d/1abc/edit?usp=sharing")).toBe("https://docs.google.com/document/d/1abc/preview");
    expect(docPreviewUrl("https://docs.google.com/spreadsheets/d/1abc/edit#gid=0")).toBe("https://docs.google.com/spreadsheets/d/1abc/preview");
    expect(docPreviewUrl("https://drive.google.com/file/d/1abc/view")).toBe("https://drive.google.com/file/d/1abc/preview");
  });
  it("leaves other links alone", () => {
    expect(docPreviewUrl("https://www.notion.so/Guide-abc")).toBe("https://www.notion.so/Guide-abc");
    expect(docPreviewUrl("garbage")).toBe("garbage");
  });
});

describe("labels", () => {
  it("falls back to Web page", () => {
    expect(docProviderById("google_doc").label).toBe("Google Doc");
    expect(docProviderById("unknown").label).toBe("Web page");
    expect(docHost("https://www.notion.so/x")).toBe("notion.so");
    expect(docHost("bad")).toBe("");
  });
});
