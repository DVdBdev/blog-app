import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scanImageWithHuggingFaceModeration } from "./huggingface-image-moderation";

describe("huggingface-image-moderation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.HUGGINGFACE_API_KEY;
    delete process.env.HUGGINGFACE_IMAGE_MODERATION_MODEL;
    delete process.env.HUGGINGFACE_IMAGE_MODERATION_THRESHOLD;
  });

  afterEach(() => {
    delete process.env.HUGGINGFACE_API_KEY;
    vi.unstubAllGlobals();
  });

  it("returns null when API key is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await scanImageWithHuggingFaceModeration("https://cdn.example.com/a.png");

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns moderation result when image labels are unsafe", async () => {
    process.env.HUGGINGFACE_API_KEY = "test-key";
    const imageBytes = new Uint8Array([1, 2, 3, 4]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "image/png" },
        arrayBuffer: async () => imageBytes.buffer,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [[{ label: "nsfw", score: 0.91 }, { label: "normal", score: 0.05 }]],
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await scanImageWithHuggingFaceModeration("https://cdn.example.com/a.png");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).not.toBeNull();
    expect(result?.reason).toContain("nsfw");
  });

  it("returns null when image labels are safe", async () => {
    process.env.HUGGINGFACE_API_KEY = "test-key";
    const imageBytes = new Uint8Array([1, 2, 3, 4]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "image/jpeg" },
        arrayBuffer: async () => imageBytes.buffer,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [[{ label: "normal", score: 0.95 }]],
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await scanImageWithHuggingFaceModeration("https://cdn.example.com/b.jpg");

    expect(result).toBeNull();
  });
});
