import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scanTextWithHuggingFaceModeration } from "./huggingface-moderation";

describe("huggingface-moderation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.HUGGINGFACE_API_KEY;
    delete process.env.HUGGINGFACE_MODERATION_MODEL;
    delete process.env.HUGGINGFACE_MODERATION_THRESHOLD;
  });

  afterEach(() => {
    delete process.env.HUGGINGFACE_API_KEY;
    vi.unstubAllGlobals();
  });

  it("returns null when API key is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await scanTextWithHuggingFaceModeration("hello");

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns moderation result when Hugging Face flags content", async () => {
    process.env.HUGGINGFACE_API_KEY = "test-key";
    process.env.HUGGINGFACE_MODERATION_THRESHOLD = "0.7";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [
        [
          { label: "toxic", score: 0.95 },
          { label: "insult", score: 0.88 },
          { label: "neutral", score: 0.01 },
        ],
      ],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await scanTextWithHuggingFaceModeration("sample content");

    expect(fetchMock).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result?.reason).toContain("toxic");
  });

  it("returns null when Hugging Face does not flag content", async () => {
    process.env.HUGGINGFACE_API_KEY = "test-key";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [[{ label: "neutral", score: 0.99 }]],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await scanTextWithHuggingFaceModeration("clean content");

    expect(result).toBeNull();
  });
});
