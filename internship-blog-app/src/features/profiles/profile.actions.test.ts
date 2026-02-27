import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateProfile } from "./profile.actions";
import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";
import { logModerationCandidate } from "@/features/moderation/moderation.server";

vi.mock("@/services/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/moderation/moderation.server", () => ({
  logModerationCandidate: vi.fn(async () => {}),
}));

describe("updateProfile", () => {
  const createClientMock = vi.mocked(createClient);
  const revalidatePathMock = vi.mocked(revalidatePath);
  const logModerationCandidateMock = vi.mocked(logModerationCandidate);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated users", async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: true })) },
    } as never);

    const result = await updateProfile({ bio: "hello" });
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("updates profile and revalidates /me", async () => {
    const updateEqMock = vi.fn(async () => ({ error: null }));
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })) },
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: updateEqMock,
        })),
      })),
    } as never);

    const result = await updateProfile({ display_name: "New Name" });
    expect(result).toEqual({ success: true });
    expect(updateEqMock).toHaveBeenCalledWith("id", "u1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/me");
    expect(logModerationCandidateMock).not.toHaveBeenCalled();
  });

  it("logs moderation candidate when bio is updated", async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })) },
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: null })),
        })),
      })),
    } as never);

    await updateProfile({ bio: "potential spam content" });
    expect(logModerationCandidateMock).toHaveBeenCalled();
  });
});
