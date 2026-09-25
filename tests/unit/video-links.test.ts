import { describe, expect, it } from "vitest";
import { parseVideoLink, videoFromStored } from "@/lib/video-links";

describe("parseVideoLink — YouTube", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=share",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    "youtube.com/watch?v=dQw4w9WgXcQ",
    "dQw4w9WgXcQ",
  ])("parses %s", (input) => {
    const v = parseVideoLink(input);
    expect(v?.provider).toBe("youtube");
    expect(v?.videoId).toBe("dQw4w9WgXcQ");
    expect(v?.embedUrl.startsWith("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?")).toBe(true);
    expect(v?.posterUrl).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    expect(v?.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("keeps a start offset (t=1m30s, t=90, #t=90)", () => {
    expect(parseVideoLink("https://youtu.be/dQw4w9WgXcQ?t=1m30s")?.startSeconds).toBe(90);
    expect(parseVideoLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90")?.startSeconds).toBe(90);
    expect(parseVideoLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s")?.embedUrl).toContain("start=90");
  });

  it("rejects an id of the wrong shape", () => {
    expect(parseVideoLink("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(parseVideoLink("https://www.youtube.com/channel/UC123")).toBeNull();
  });
});

describe("parseVideoLink — Vimeo", () => {
  it.each([
    "https://vimeo.com/123456789",
    "https://vimeo.com/channels/staffpicks/123456789",
    "https://player.vimeo.com/video/123456789?h=abc",
  ])("parses %s", (input) => {
    const v = parseVideoLink(input);
    expect(v?.provider).toBe("vimeo");
    expect(v?.videoId).toBe("123456789");
    expect(v?.embedUrl).toBe("https://player.vimeo.com/video/123456789?dnt=1&autoplay=1");
    expect(v?.posterUrl).toBeNull();
  });
});

describe("parseVideoLink — everything else", () => {
  it.each(["", "   ", "https://example.com/video.mp4", "javascript:alert(1)", "ftp://vimeo.com/123456789", "not a url"])(
    "returns null for %j",
    (input) => expect(parseVideoLink(input)).toBeNull(),
  );

  it("does not trust look-alike hosts", () => {
    expect(parseVideoLink("https://youtube.com.evil.io/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseVideoLink("https://evil.io/youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});

describe("videoFromStored", () => {
  it("rebuilds from provider + id", () => {
    expect(videoFromStored("youtube", "dQw4w9WgXcQ")?.embedUrl).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(videoFromStored("vimeo", "123456789")?.url).toBe("https://vimeo.com/123456789");
  });
  it("returns null for a bad id", () => {
    expect(videoFromStored("youtube", "../etc")).toBeNull();
    expect(videoFromStored("tiktok", "123")).toBeNull();
  });
});
