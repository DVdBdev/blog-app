import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPost, deletePost, updatePost } from "./posts.actions";
import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";
import { requireActiveAccount } from "@/features/auth/account-status.server";

vi.mock("@/services/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/auth/account-status.server", () => ({
  requireActiveAccount: vi.fn(),
}));

describe("posts actions", () => {
  const createClientMock = vi.mocked(createClient);
  const requireActiveAccountMock = vi.mocked(requireActiveAccount);
  const revalidatePathMock = vi.mocked(revalidatePath);

  beforeEach(() => {
    vi.clearAllMocks();
    requireActiveAccountMock.mockResolvedValue({} as never);
  });

  it("createPost: rejects empty title", async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })) },
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
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: async () => ({ data: { id: "p1", content: { type: "doc" } }, error: null }),
          })),
        })),
      })),
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
  });

  it("updatePost: updates authored post", async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })) },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: "user" } }),
              }),
            }),
          };
        }
        return {
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
                maybeSingle: async () => ({ data: { role: "user" } }),
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
