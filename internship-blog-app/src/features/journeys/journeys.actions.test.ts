import { beforeEach, describe, expect, it, vi } from "vitest";
import { createJourney, deleteJourney, updateJourney } from "./journeys.actions";
import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";
import { requireActiveAccount } from "@/features/auth/account-status.server";
import { logModerationCandidate } from "@/features/moderation/moderation.server";

vi.mock("@/services/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/auth/account-status.server", () => ({
  requireActiveAccount: vi.fn(),
}));

vi.mock("@/features/moderation/moderation.server", () => ({
  enforceTextModerationOrBlock: vi.fn(async () => null),
  logModerationCandidate: vi.fn(async () => {}),
}));

function resolvedQuery<T>(result: T) {
  const query: {
    eq: ReturnType<typeof vi.fn>;
    then: (resolve: (value: T) => unknown) => Promise<unknown>;
  } = {
    eq: vi.fn(() => query),
    then: (resolve) => Promise.resolve(result).then(resolve),
  };
  return query;
}

describe("journeys actions", () => {
  const createClientMock = vi.mocked(createClient);
  const requireActiveAccountMock = vi.mocked(requireActiveAccount);
  const revalidatePathMock = vi.mocked(revalidatePath);
  const logModerationCandidateMock = vi.mocked(logModerationCandidate);

  beforeEach(() => {
    vi.clearAllMocks();
    requireActiveAccountMock.mockResolvedValue({} as never);
  });

  it("createJourney: rejects unauthenticated users", async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: true })) },
    } as never);

    const result = await createJourney({ title: "Hello", visibility: "public" });
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("createJourney: creates journey for active user", async () => {
    const singleMock = vi.fn(async () => ({ data: { id: "j1" }, error: null }));
    const insertMock = vi.fn(() => ({
      select: vi.fn(() => ({ single: singleMock })),
    }));
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })) },
      from: vi.fn(() => ({ insert: insertMock })),
    } as never);

    const result = await createJourney({
      title: "  My Journey  ",
      description: "  desc  ",
      visibility: "public",
    });

    expect(result).toEqual({ success: true });
    expect(insertMock).toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/journeys");
    expect(logModerationCandidateMock).toHaveBeenCalled();
  });

  it("updateJourney: updates owned journey for non-admin", async () => {
    const updateQuery = resolvedQuery({ error: null });
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
          update: vi.fn(() => ({
            eq: vi.fn(() => updateQuery),
          })),
        };
      }),
    } as never);

    const result = await updateJourney({
      id: "j1",
      title: "Updated",
      visibility: "public",
      status: "active",
    });

    expect(result).toEqual({ success: true });
    expect(updateQuery.eq).toHaveBeenCalledWith("owner_id", "u1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/journeys/j1");
  });

  it("deleteJourney: returns not authorized when no row deleted", async () => {
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

    const result = await deleteJourney({ id: "j1" });
    expect(result).toEqual({ error: "Journey not found or not authorized" });
  });
});
