import { describe, expect, it } from "vitest";
import { detectPlatform, externalHost, isExternalProduct, resolvePlatform, safeExternalUrl } from "@/lib/external-platforms";

describe("detectPlatform", () => {
  it.each([
    ["https://rrlibrary.gumroad.com/l/gstbill", "gumroad"],
    ["https://www.amazon.in/dp/B0XYZ", "amazon"],
    ["https://amazon.com/dp/B0XYZ", "amazon"],
    ["https://amzn.eu/d/abc", "amazon"],
    ["https://kdp.amazon.com/en_US/bookshelf", "amazon"],
    ["https://read.amazon.in/kp/embed?asin=B0X", "kindle"],
    ["https://www.fiverr.com/rrlibrary/build-a-website", "fiverr"],
    ["https://www.udemy.com/course/react-hindi/", "udemy"],
    ["https://youtu.be/dQw4w9WgXcQ", "youtube"],
    ["https://www.youtube.com/watch?v=abc", "youtube"],
    ["https://play.google.com/store/apps/details?id=com.wwd.gstbill", "play_store"],
    ["https://apps.apple.com/in/app/gstbill/id123", "app_store"],
    ["https://github.com/RR-LIBRARY/win-win-agency", "github"],
    ["https://rrlibrary.notion.site/template", "notion"],
    ["https://chromewebstore.google.com/detail/abc", "chrome_web_store"],
    ["https://chrome.google.com/webstore/detail/abc", "chrome_web_store"],
    ["https://www.flipkart.com/book/p/itm1", "flipkart"],
    ["https://topmate.io/rrlibrary", "topmate"],
  ])("%s → %s", (url, id) => {
    expect(detectPlatform(url).id).toBe(id);
  });

  it("falls back to 'other' for unknown hosts, empty and malformed input", () => {
    expect(detectPlatform("https://mystore.example.com/product").id).toBe("other");
    expect(detectPlatform("").id).toBe("other");
    expect(detectPlatform(null).id).toBe("other");
    expect(detectPlatform("not a url").id).toBe("other");
  });

  it("cannot be spoofed through the path, query or a look-alike hostname", () => {
    expect(detectPlatform("https://evil.example.com/gumroad.com/l/x").id).toBe("other");
    expect(detectPlatform("https://evil.example.com/?next=https://www.amazon.in").id).toBe("other");
    expect(detectPlatform("https://gumroad.com.evil.example.com/").id).toBe("other");
    expect(detectPlatform("https://notgumroad.com/").id).toBe("other");
    expect(detectPlatform("https://chrome.google.com/notwebstore").id).toBe("other");
  });
});

describe("resolvePlatform", () => {
  it("honours an admin override over URL detection", () => {
    expect(resolvePlatform({ external_url: "https://gumroad.com/l/x", external_platform: "payhip" }).id).toBe("payhip");
  });
  it("labels unknown hosts with the hostname so the button still says where it goes", () => {
    const platform = resolvePlatform({ external_url: "https://shop.rrlibrary.in/product/1", external_platform: "other" });
    expect(platform.label).toBe("shop.rrlibrary.in");
    expect(platform.cta).toBe("Open on shop.rrlibrary.in");
  });
});

describe("safeExternalUrl / externalHost / isExternalProduct", () => {
  it("only lets https links through", () => {
    expect(safeExternalUrl("https://gumroad.com/l/x")).toBe("https://gumroad.com/l/x");
    expect(safeExternalUrl("http://gumroad.com/l/x")).toBeNull();
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeExternalUrl("//evil.example.com")).toBeNull();
    expect(safeExternalUrl("")).toBeNull();
  });
  it("strips www. for display and tolerates junk", () => {
    expect(externalHost("https://www.amazon.in/dp/1")).toBe("amazon.in");
    expect(externalHost("nope")).toBe("");
  });
  it("identifies external products by delivery type only", () => {
    expect(isExternalProduct({ delivery_type: "external" })).toBe(true);
    expect(isExternalProduct({ delivery_type: "license" })).toBe(false);
  });
});
