import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/services/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { logImageModerationCandidate, logModerationCandidate, logModerationCandidateAsService } from "./moderation.server";
import { scanTextWithHuggingFaceModeration } from "./huggingface-moderation";
import { scanImageWithHuggingFaceModeration } from "./huggingface-image-moderation";

vi.mock("@/services/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

vi.mock("./huggingface-moderation", () => ({
  scanTextWithHuggingFaceModeration: vi.fn(async () => null),
}));

vi.mock("./huggingface-image-moderation", () => ({
  scanImageWithHuggingFaceModeration: vi.fn(async () => null),
}));

describe("moderation.server", () => {
  const createClientMock = vi.mocked(createClient);
  const createSupabaseAdminClientMock = vi.mocked(createSupabaseAdminClient);
  const scanTextWithHuggingFaceModerationMock = vi.mocked(scanTextWithHuggingFaceModeration);
  const scanImageWithHuggingFaceModerationMock = vi.mocked(scanImageWithHuggingFaceModeration);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  });

  it("does not insert when text is clean", async () => {
    const insertMock = vi.fn(async () => ({ error: null }));
    const fromMock = vi.fn(() => ({ insert: insertMock }));
    createClientMock.mockResolvedValue({ from: fromMock } as never);

    await logModerationCandidate({
      userId: "user-1",
      contentType: "post_content",
      text: "This is a safe post",
    });

    expect(createClientMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("inserts moderation log for flagged text with user client", async () => {
    const insertMock = vi.fn(async () => ({ error: null }));
    const fromMock = vi.fn(() => ({ insert: insertMock }));
    createClientMock.mockResolvedValue({ from: fromMock } as never);

    await logModerationCandidate({
      userId: "user-1",
      contentType: "post_content",
      relatedEntityId: "post-1",
      text: "This looks like spam",
    });

    expect(createClientMock).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith("moderation_log");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        content_type: "post_content",
        related_entity_id: "post-1",
        status: "pending",
      })
    );
  });

  it("falls back to local word moderation when HF text scan returns null", async () => {
    scanTextWithHuggingFaceModerationMock.mockResolvedValueOnce(null);

    const insertMock = vi.fn(async () => ({ error: null }));
    const fromMock = vi.fn(() => ({ insert: insertMock }));
    createClientMock.mockResolvedValue({ from: fromMock } as never);

    await logModerationCandidate({
      userId: "user-local-1",
      contentType: "post_content",
      relatedEntityId: "post-local-1",
      text: "This is racist language",
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-local-1",
        content_type: "post_content",
        related_entity_id: "post-local-1",
      })
    );
    const inserted = insertMock.mock.calls[0][0] as { flag_reason?: string };
    expect(inserted.flag_reason?.toLowerCase()).toContain("hate speech");
  });

  it("uses service-role client when requested", async () => {
    const insertMock = vi.fn(async () => ({ error: null }));
    const fromMock = vi.fn(() => ({ insert: insertMock }));
    createSupabaseAdminClientMock.mockReturnValue({ from: fromMock } as never);

    await logModerationCandidateAsService({
      userId: "user-2",
      contentType: "username",
      text: "scam account name",
    });

    expect(createSupabaseAdminClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role-key"
    );
    expect(fromMock).toHaveBeenCalledWith("moderation_log");
    expect(insertMock).toHaveBeenCalled();
  });

  it("uses Hugging Face moderation result when available", async () => {
    scanTextWithHuggingFaceModerationMock.mockResolvedValueOnce({
      reason: "Hugging Face moderation flagged labels: toxic (0.99)",
      preview: "clean phrase but model-flagged",
    });

    const insertMock = vi.fn(async () => ({ error: null }));
    const fromMock = vi.fn(() => ({ insert: insertMock }));
    createClientMock.mockResolvedValue({ from: fromMock } as never);

    await logModerationCandidate({
      userId: "user-3",
      contentType: "post_content",
      text: "clean phrase but model-flagged",
    });

    expect(scanTextWithHuggingFaceModerationMock).toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-3",
        content_type: "post_content",
        flag_reason: "Hugging Face moderation flagged labels: toxic (0.99)",
      })
    );
  });

  it("logs image moderation entries when image scanner flags content", async () => {
    scanImageWithHuggingFaceModerationMock.mockResolvedValueOnce({
      reason: "Hugging Face image moderation flagged labels: nsfw (0.91)",
      preview: "Image URL: https://cdn.example.com/a.png",
    });

    const insertMock = vi.fn(async () => ({ error: null }));
    const fromMock = vi.fn(() => ({ insert: insertMock }));
    createClientMock.mockResolvedValue({ from: fromMock } as never);

    await logImageModerationCandidate({
      userId: "user-4",
      relatedEntityId: "post-9",
      imageUrl: "https://cdn.example.com/a.png",
    });

    expect(scanImageWithHuggingFaceModerationMock).toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-4",
        content_type: "post_image",
        related_entity_id: "post-9",
      })
    );
  });
});
