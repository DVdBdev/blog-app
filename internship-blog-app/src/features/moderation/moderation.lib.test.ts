import { afterEach, describe, expect, it } from "vitest";
import { extractImageUrlsFromRichText, extractRichTextContent, scanTextForModeration } from "./moderation.lib";

describe("moderation.lib", () => {
  afterEach(() => {
    delete process.env.MODERATION_EXTRA_KEYWORDS;
  });

  it("flags matching keywords", () => {
    const result = scanTextForModeration("This looks like spam content");
    expect(result).not.toBeNull();
    expect(result?.reason).toContain("spam");
  });

  it("flags racist wording as hate speech", () => {
    const result = scanTextForModeration("That post is openly racist.");
    expect(result).not.toBeNull();
    expect(result?.reason).toContain("hate speech");
  });

  it("flags configured custom keywords", () => {
    process.env.MODERATION_EXTRA_KEYWORDS = "custombadword";
    const result = scanTextForModeration("This has custombadword in it.");
    expect(result).not.toBeNull();
    expect(result?.reason).toContain("policy keyword");
  });

  it("returns null for clean text", () => {
    const result = scanTextForModeration("This is a normal status update.");
    expect(result).toBeNull();
  });

  it("extracts text from rich content json", () => {
    const content = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello world" }] },
        { type: "paragraph", content: [{ type: "text", text: "More text" }] },
      ],
    };
    expect(extractRichTextContent(content)).toContain("Hello world");
    expect(extractRichTextContent(content)).toContain("More text");
  });

  it("extracts unique image urls from rich content json", () => {
    const content = {
      type: "doc",
      content: [
        { type: "image", attrs: { src: "https://cdn.example.com/a.png" } },
        {
          type: "paragraph",
          content: [{ type: "image", attrs: { src: "https://cdn.example.com/a.png" } }],
        },
        { type: "image", attrs: { src: "https://cdn.example.com/b.png" } },
      ],
    };

    expect(extractImageUrlsFromRichText(content)).toEqual([
      "https://cdn.example.com/a.png",
      "https://cdn.example.com/b.png",
    ]);
  });
});
