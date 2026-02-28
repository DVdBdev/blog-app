import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPost, deletePost, updatePost } from "./posts.actions";
import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";
import {
  enforceTextModerationOrBlock,
  logImageModerationCandidate,
  logModerationCandidate,
} from "@/features/moderation/moderation.server";

vi.mock("@/services/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/moderation/moderation.server", () => ({
  enforceTextModerationOrBlock: vi.fn(async () => null),
  enforceImageModerationOrBlock: vi.fn(async () => null),
  logModerationCandidate: vi.fn(async () => {}),
  logImageModerationCandidate: vi.fn(async () => {}),
}));

describe("posts actions", () => {
  const createClientMock = vi.mocked(createClient);
  const revalidatePathMock = vi.mocked(revalidatePath);
  const enforceTextModerationOrBlockMock = vi.mocked(enforceTextModerationOrBlock);
  const logModerationCandidateMock = vi.mocked(logModerationCandidate);
  const logImageModerationCandidateMock = vi.mocked(logImageModerationCandidate);

  beforeEach(() => {
    vi.clearAllMocks();
    enforceTextModerationOrBlockMock.mockResolvedValue(null);
  });

  it("createPost: rejects empty title", async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })) },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: "user", status: "active" }, error: null }),
              }),
            }),
          };
        }
        return {};
      }),
    } as never);

    const result = await createPost({
      journey_id: "j1",
      title: "   ",
      content: {},
      status: "draft",
    });

    expect(result).toEqual({ error: "Title is required" });
  });

  it("createPost: creates post successfully", async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })) },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: "user", status: "active" }, error: null }),
              }),
            }),
          };
        }
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: async () => ({ data: { id: "p1", content: { type: "doc" } }, error: null }),
            })),
          })),
        };
      }),
    } as never);

    const result = await createPost({
      journey_id: "j1",
      title: "Post",
      content: { type: "doc" },
      status: "draft",
    });

    expect(result).toEqual({
      success: true,
      post: { id: "p1", content: { type: "doc" } },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/journeys/j1");
    expect(logModerationCandidateMock).toHaveBeenCalled();
  });

  it("createPost: logs moderation for embedded post images", async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })) },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: "user", status: "active" }, error: null }),
              }),
            }),
          };
        }
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: async () => ({ data: { id: "p2", content: { type: "doc" } }, error: null }),
            })),
          })),
        };
      }),
    } as never);

    const content = {
      type: "doc",
      content: [{ type: "image", attrs: { src: "https://cdn.example.com/unsafe.png" } }],
    };

    const result = await createPost({
      journey_id: "j1",
      title: "Post with image",
      content,
      status: "draft",
    });

    expect(result).toEqual({
      success: true,
      post: { id: "p2", content: { type: "doc" } },
    });
    expect(logImageModerationCandidateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        relatedEntityId: "p2",
        imageUrl: "https://cdn.example.com/unsafe.png",
      })
    );
  });

  it("createPost: blocks unsafe post title and returns moderation details", async () => {
    enforceTextModerationOrBlockMock.mockResolvedValueOnce({
      message: "Your content was blocked by moderation (99% confidence, threshold 90%).",
      details: {
        contentType: "post_title",
        source: "text",
        reason: "Hugging Face moderation blocked labels: toxic (0.99)",
        confidence: 0.99,
        threshold: 0.9,
        labels: ["toxic (0.99)"],
      },
    });

    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })) },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: "user", status: "active" }, error: null }),
              }),
            }),
          };
        }
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: async () => ({ data: { id: "p3", content: { type: "doc" } }, error: null }),
            })),
          })),
        };
      }),
    } as never);

    const result = await createPost({
      journey_id: "j1",
      title: "unsafe title",
      content: { type: "doc" },
      status: "draft",
    });

    expect(result).toEqual({
      error: "Your content was blocked by moderation (99% confidence, threshold 90%).",
      moderationBlock: {
        contentType: "post_title",
        source: "text",
        reason: "Hugging Face moderation blocked labels: toxic (0.99)",
        confidence: 0.99,
        threshold: 0.9,
        labels: ["toxic (0.99)"],
      },
    });
    expect(logModerationCandidateMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalledWith("/journeys/j1");
  });

  it("updatePost: updates authored post", async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })) },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: "user", status: "active" }, error: null }),
              }),
            }),
          };
        }
        if (table === "posts") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: "p1", title: "Old", content: { type: "doc" }, author_id: "u1" },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: () => ({
                eq: () => ({
                  select: () => ({
                    single: async () => ({ data: { id: "p1", content: { type: "doc" } }, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
        };
      }),
    } as never);

    const result = await updatePost({
      id: "p1",
      title: "Updated",
      content: { type: "doc" },
      status: "published",
    });

    expect(result).toEqual({
      success: true,
      post: { id: "p1", content: { type: "doc" } },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/posts/p1");
  });

  it("deletePost: returns not found when row not deleted", async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })) },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: "user", status: "active" }, error: null }),
              }),
            }),
          };
        }
        return {
          delete: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      }),
    } as never);

    const result = await deletePost({ id: "p1" });
    expect(result).toEqual({ error: "Post not found or not authorized" });
  });
});
