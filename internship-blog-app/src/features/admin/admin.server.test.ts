import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/services/supabase/server";
import { getModerationQueue } from "./admin.server";

vi.mock("@/services/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("getModerationQueue", () => {
  const createClientMock = vi.mocked(createClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads moderation entries and maps username", async () => {
    const resultRows = [
      {
        id: "log-1",
        user_id: "user-1",
        content_type: "post_content",
        related_entity_id: "post-1",
        flag_reason: "Potential spam language",
        content_preview: "spam post",
        status: "pending",
        created_at: "2026-02-27T00:00:00.000Z",
        profiles: { username: "alice" },
      },
    ];
    const rangeMock = vi.fn(async () => ({ data: resultRows, error: null }));
    const orderMock = vi.fn(() => ({ range: rangeMock }));
    const selectMock = vi.fn(() => ({ order: orderMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    createClientMock.mockResolvedValue({ from: fromMock } as never);

    const result = await getModerationQueue();

    expect(fromMock).toHaveBeenCalledWith("moderation_log");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toEqual(
      expect.objectContaining({
        id: "log-1",
        username: "alice",
        status: "pending",
      })
    );
  });

  it("applies status filter when provided", async () => {
    const rangeMock = vi.fn(async () => ({ data: [], error: null }));
    const eqMock = vi.fn(() => ({ range: rangeMock }));
    const orderMock = vi.fn(() => ({ eq: eqMock }));
    const selectMock = vi.fn(() => ({ order: orderMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    createClientMock.mockResolvedValue({ from: fromMock } as never);

    await getModerationQueue({ status: "reviewed" });

    expect(eqMock).toHaveBeenCalledWith("status", "reviewed");
  });

  it("filters moderation queue by query across username and content", async () => {
    const resultRows = [
      {
        id: "log-1",
        user_id: "user-1",
        content_type: "post_content",
        related_entity_id: "post-1",
        flag_reason: "Potential spam language",
        content_preview: "spam post",
        status: "pending",
        created_at: "2026-02-27T00:00:00.000Z",
        profiles: { username: "alice" },
      },
      {
        id: "log-2",
        user_id: "user-2",
        content_type: "post_title",
        related_entity_id: "post-2",
        flag_reason: "Potential scam language",
        content_preview: "scam title",
        status: "reviewed",
        created_at: "2026-02-27T00:00:00.000Z",
        profiles: { username: "bob" },
      },
    ];
    const orderMock = vi.fn(async () => ({ data: resultRows, error: null }));
    const selectMock = vi.fn(() => ({ order: orderMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    createClientMock.mockResolvedValue({ from: fromMock } as never);

    const result = await getModerationQueue({ query: "alice" });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].id).toBe("log-1");
  });
});
