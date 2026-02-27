import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  banUserFromModerationAction,
  deleteModerationLogAction,
  deleteAllUserContentFromModerationAction,
  deleteFlaggedContentFromModerationAction,
  setModerationStatusAction,
  setUserStatusAction,
} from "./admin.actions";
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
  const deleteEqMock = vi.fn(async () => ({ error: null }));
  const deleteMock = vi.fn(() => ({ eq: deleteEqMock }));
  const fromMock = vi.fn(() => ({
    select: selectMock,
    update: updateMock,
    delete: deleteMock,
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

  return { supabase, updateMock, updateEqMock, deleteEqMock };
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

describe("moderation enforcement actions", () => {
  const createClientMock = vi.mocked(createClient);
  const revalidatePathMock = vi.mocked(revalidatePath);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires confirmation for ban action", async () => {
    const formData = new FormData();
    formData.set("logId", "log-1");
    formData.set("targetUserId", "user-1");

    const result = await banUserFromModerationAction(formData);
    expect(result).toEqual({ error: "Confirmation required before enforcement action" });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("bans a user from moderation queue and marks action_taken", async () => {
    const { supabase, updateEqMock } = buildSupabaseMock({
      authUserId: "admin-1",
      maybeSingleResults: [
        { data: { id: "admin-1", role: "admin", status: "active" }, error: null },
        { data: { id: "user-2", role: "user", status: "active" }, error: null },
      ],
    });
    createClientMock.mockResolvedValue(supabase as never);

    const formData = new FormData();
    formData.set("logId", "log-1");
    formData.set("targetUserId", "user-2");
    formData.set("confirm", "yes");

    const result = await banUserFromModerationAction(formData);
    expect(result).toEqual({ success: true });
    expect(updateEqMock).toHaveBeenCalledWith("id", "user-2");
    expect(updateEqMock).toHaveBeenCalledWith("id", "log-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin");
  });

  it("deletes flagged post content and marks action_taken", async () => {
    const { supabase, deleteEqMock, updateEqMock } = buildSupabaseMock({
      authUserId: "admin-1",
      maybeSingleResults: [{ data: { id: "admin-1", role: "admin", status: "active" }, error: null }],
    });
    createClientMock.mockResolvedValue(supabase as never);

    const formData = new FormData();
    formData.set("logId", "log-2");
    formData.set("targetUserId", "user-2");
    formData.set("contentType", "post_content");
    formData.set("relatedEntityId", "post-9");
    formData.set("confirm", "yes");

    const result = await deleteFlaggedContentFromModerationAction(formData);
    expect(result).toEqual({ success: true });
    expect(deleteEqMock).toHaveBeenCalledWith("id", "post-9");
    expect(updateEqMock).toHaveBeenCalledWith("id", "log-2");
  });

  it("deletes all user content and marks action_taken", async () => {
    const { supabase, deleteEqMock, updateEqMock } = buildSupabaseMock({
      authUserId: "admin-1",
      maybeSingleResults: [{ data: { id: "admin-1", role: "admin", status: "active" }, error: null }],
    });
    createClientMock.mockResolvedValue(supabase as never);

    const formData = new FormData();
    formData.set("logId", "log-3");
    formData.set("targetUserId", "user-7");
    formData.set("confirm", "yes");

    const result = await deleteAllUserContentFromModerationAction(formData);
    expect(result).toEqual({ success: true });
    expect(deleteEqMock).toHaveBeenCalledWith("author_id", "user-7");
    expect(deleteEqMock).toHaveBeenCalledWith("owner_id", "user-7");
    expect(updateEqMock).toHaveBeenCalledWith("id", "log-3");
  });

  it("deletes moderation log entry after confirmation", async () => {
    const { supabase, deleteEqMock } = buildSupabaseMock({
      authUserId: "admin-1",
      maybeSingleResults: [{ data: { id: "admin-1", role: "admin", status: "active" }, error: null }],
    });
    createClientMock.mockResolvedValue(supabase as never);

    const formData = new FormData();
    formData.set("logId", "log-9");
    formData.set("confirm", "yes");

    const result = await deleteModerationLogAction(formData);
    expect(result).toEqual({ success: true });
    expect(deleteEqMock).toHaveBeenCalledWith("id", "log-9");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin");
  });
});

describe("setModerationStatusAction", () => {
  const createClientMock = vi.mocked(createClient);
  const revalidatePathMock = vi.mocked(revalidatePath);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid moderation status request", async () => {
    const formData = new FormData();
    formData.set("logId", "log-1");
    formData.set("nextStatus", "pending");

    const result = await setModerationStatusAction(formData);

    expect(result).toEqual({ error: "Invalid moderation status request" });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("allows admin to mark moderation entry reviewed", async () => {
    const { supabase, updateMock, updateEqMock } = buildSupabaseMock({
      authUserId: "admin-1",
      maybeSingleResults: [{ data: { id: "admin-1", role: "admin", status: "active" }, error: null }],
    });
    createClientMock.mockResolvedValue(supabase as never);

    const formData = new FormData();
    formData.set("logId", "log-1");
    formData.set("nextStatus", "reviewed");

    const result = await setModerationStatusAction(formData);

    expect(result).toEqual({ success: true });
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: "reviewed", reviewed_by: "admin-1" }));
    expect(updateEqMock).toHaveBeenCalledWith("id", "log-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin");
  });

  it("allows admin to dismiss moderation entry", async () => {
    const { supabase, updateMock, updateEqMock } = buildSupabaseMock({
      authUserId: "admin-1",
      maybeSingleResults: [{ data: { id: "admin-1", role: "admin", status: "active" }, error: null }],
    });
    createClientMock.mockResolvedValue(supabase as never);

    const formData = new FormData();
    formData.set("logId", "log-2");
    formData.set("nextStatus", "dismissed");

    const result = await setModerationStatusAction(formData);

    expect(result).toEqual({ success: true });
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: "dismissed", reviewed_by: "admin-1" }));
    expect(updateEqMock).toHaveBeenCalledWith("id", "log-2");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin");
  });
});
