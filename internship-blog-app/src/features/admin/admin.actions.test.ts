import { beforeEach, describe, expect, it, vi } from "vitest";
import { setUserStatusAction } from "./admin.actions";
import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";

vi.mock("@/services/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

type MaybeSingleResult = {
  data: { id: string; role: "admin" | "user"; status: "active" | "banned" } | null;
  error: unknown;
};

function buildSupabaseMock(args: {
  authUserId: string;
  maybeSingleResults: MaybeSingleResult[];
  updateError?: unknown;
}) {
  const maybeSingleQueue = [...args.maybeSingleResults];
  const maybeSingleMock = vi.fn(async () => maybeSingleQueue.shift() ?? { data: null, error: null });
  const eqForSelectMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
  const selectMock = vi.fn(() => ({ eq: eqForSelectMock }));
  const updateEqMock = vi.fn(async () => ({ error: args.updateError ?? null }));
  const updateMock = vi.fn(() => ({ eq: updateEqMock }));
  const fromMock = vi.fn(() => ({
    select: selectMock,
    update: updateMock,
  }));

  const supabase = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: args.authUserId } },
        error: null,
      })),
    },
    from: fromMock,
  };

  return { supabase, updateMock, updateEqMock };
}

describe("setUserStatusAction", () => {
  const createClientMock = vi.mocked(createClient);
  const revalidatePathMock = vi.mocked(revalidatePath);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid status request", async () => {
    const formData = new FormData();
    formData.set("targetUserId", "u-1");
    formData.set("nextStatus", "invalid");

    const result = await setUserStatusAction(formData);

    expect(result).toEqual({ error: "Invalid status request" });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("rejects banning your own account", async () => {
    const { supabase } = buildSupabaseMock({
      authUserId: "admin-1",
      maybeSingleResults: [{ data: { id: "admin-1", role: "admin", status: "active" }, error: null }],
    });
    createClientMock.mockResolvedValue(supabase as never);

    const formData = new FormData();
    formData.set("targetUserId", "admin-1");
    formData.set("nextStatus", "banned");

    const result = await setUserStatusAction(formData);

    expect(result).toEqual({ error: "You cannot ban your own account" });
  });

  it("rejects banning another admin", async () => {
    const { supabase, updateEqMock } = buildSupabaseMock({
      authUserId: "admin-1",
      maybeSingleResults: [
        { data: { id: "admin-1", role: "admin", status: "active" }, error: null },
        { data: { id: "admin-2", role: "admin", status: "active" }, error: null },
      ],
    });
    createClientMock.mockResolvedValue(supabase as never);

    const formData = new FormData();
    formData.set("targetUserId", "admin-2");
    formData.set("nextStatus", "banned");

    const result = await setUserStatusAction(formData);

    expect(result).toEqual({ error: "Admins cannot ban other admins" });
    expect(updateEqMock).not.toHaveBeenCalled();
  });

  it("updates status for non-admin users", async () => {
    const { supabase, updateMock, updateEqMock } = buildSupabaseMock({
      authUserId: "admin-1",
      maybeSingleResults: [
        { data: { id: "admin-1", role: "admin", status: "active" }, error: null },
        { data: { id: "user-2", role: "user", status: "active" }, error: null },
      ],
    });
    createClientMock.mockResolvedValue(supabase as never);

    const formData = new FormData();
    formData.set("targetUserId", "user-2");
    formData.set("nextStatus", "banned");

    const result = await setUserStatusAction(formData);

    expect(result).toEqual({ success: true });
    expect(updateMock).toHaveBeenCalledWith({ status: "banned" });
    expect(updateEqMock).toHaveBeenCalledWith("id", "user-2");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin");
    expect(revalidatePathMock).toHaveBeenCalledWith("/users");
    expect(revalidatePathMock).toHaveBeenCalledWith("/search");
    expect(revalidatePathMock).toHaveBeenCalledWith("/journeys");
  });
});
