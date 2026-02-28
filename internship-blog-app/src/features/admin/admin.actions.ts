"use server";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";
import { ModerationContentType } from "@/types";

const execFileAsync = promisify(execFile);

type AdminTestRunState = {
  status: "idle" | "success" | "error";
  message: string;
  output: string;
};

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase, user: null, error: "Not authenticated" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,role,status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin" || profile?.status !== "active") {
    return { supabase, user: null, error: "Not authorized" };
  }

  return { supabase, user, error: null };
}

async function getAdminCount(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return count ?? 0;
}

export async function setUserRoleAction(formData: FormData) {
  const targetUserId = String(formData.get("targetUserId") ?? "");
  const nextRole = String(formData.get("nextRole") ?? "") as "user" | "admin";

  if (!targetUserId || (nextRole !== "user" && nextRole !== "admin")) {
    return { error: "Invalid role request" };
  }

  const { supabase, user, error } = await requireAdminUser();
  if (error || !user) return { error: error ?? "Not authorized" };

  if (targetUserId === user.id && nextRole !== "admin") {
    return { error: "You cannot remove your own admin role" };
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id,role,status")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!targetProfile) {
    return { error: "User not found" };
  }

  if (targetProfile.role === "admin" && nextRole === "user") {
    const adminCount = await getAdminCount(supabase);
    const activeAdminCount = await getActiveAdminCount(supabase);
    if (adminCount <= 1 || (targetProfile.status === "active" && activeAdminCount <= 1)) {
      return { error: "Cannot demote the last admin" };
    }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: nextRole })
    .eq("id", targetUserId);

  if (updateError) {
    console.error("Error updating user role:", updateError);
    return { error: "Failed to update role" };
  }

  revalidatePath("/admin");
  return { success: true };
}

async function getActiveAdminCount(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("status", "active");
  return count ?? 0;
}

export async function setUserStatusAction(formData: FormData) {
  const targetUserId = String(formData.get("targetUserId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "") as "active" | "banned";

  if (!targetUserId || (nextStatus !== "active" && nextStatus !== "banned")) {
    return { error: "Invalid status request" };
  }

  const { supabase, user, error } = await requireAdminUser();
  if (error || !user) return { error: error ?? "Not authorized" };

  if (targetUserId === user.id && nextStatus === "banned") {
    return { error: "You cannot ban your own account" };
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id,role,status")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!targetProfile) {
    return { error: "User not found" };
  }

  if (targetProfile.role === "admin" && nextStatus === "banned") {
    return { error: "Admins cannot ban other admins" };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ status: nextStatus })
    .eq("id", targetUserId);

  if (updateError) {
    console.error("Error updating user status:", updateError);
    return { error: "Failed to update status" };
  }

  revalidatePath("/admin");
  revalidatePath("/users");
  revalidatePath("/search");
  revalidatePath("/journeys");
  return { success: true };
}

export async function deleteUserAction(formData: FormData) {
  const targetUserId = String(formData.get("targetUserId") ?? "");
  if (!targetUserId) return { error: "Invalid user id" };

  const { supabase, user, error } = await requireAdminUser();
  if (error || !user) return { error: error ?? "Not authorized" };

  if (targetUserId === user.id) {
    return { error: "You cannot delete your own account from admin dashboard" };
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id,role,status")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!targetProfile) {
    return { error: "User not found" };
  }

  if (targetProfile.role === "admin") {
    const activeAdminCount = await getActiveAdminCount(supabase);
    const adminCount = await getAdminCount(supabase);
    if (adminCount <= 1 || (targetProfile.status === "active" && activeAdminCount <= 1)) {
      return { error: "Cannot remove the last admin" };
    }
  }

  const supabaseAdmin = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
  if (deleteError) {
    console.error("Error deleting user:", deleteError);
    return { error: "Failed to delete user" };
  }

  revalidatePath("/admin");
  revalidatePath("/users");
  revalidatePath("/search");
  revalidatePath("/journeys");
  return { success: true };
}

export async function updateJourneyAdminAction(formData: FormData) {
  const journeyId = String(formData.get("journeyId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "") as "public" | "unlisted" | "private";
  const status = String(formData.get("status") ?? "") as "active" | "completed";

  if (!journeyId || !title) return { error: "Journey id and title are required" };
  if (!["public", "unlisted", "private"].includes(visibility)) return { error: "Invalid visibility" };
  if (!["active", "completed"].includes(status)) return { error: "Invalid status" };

  const { supabase, error } = await requireAdminUser();
  if (error) return { error };

  const { error: updateError } = await supabase
    .from("journeys")
    .update({
      title,
      visibility,
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", journeyId);

  if (updateError) {
    console.error("Error admin-updating journey:", updateError);
    return { error: "Failed to update journey" };
  }

  revalidatePath("/admin");
  revalidatePath(`/journeys/${journeyId}`);
  revalidatePath("/journeys");
  return { success: true };
}

export async function deleteJourneyAdminAction(formData: FormData) {
  const journeyId = String(formData.get("journeyId") ?? "");
  if (!journeyId) return { error: "Invalid journey id" };

  const { supabase, error } = await requireAdminUser();
  if (error) return { error };

  const { error: deleteError } = await supabase
    .from("journeys")
    .delete()
    .eq("id", journeyId);

  if (deleteError) {
    console.error("Error admin-deleting journey:", deleteError);
    return { error: "Failed to delete journey" };
  }

  revalidatePath("/admin");
  revalidatePath("/journeys");
  revalidatePath(`/journeys/${journeyId}`);
  revalidatePath("/search");
  return { success: true };
}

export async function updatePostAdminAction(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "") as "draft" | "published";

  if (!postId || !title) return { error: "Post id and title are required" };
  if (!["draft", "published"].includes(status)) return { error: "Invalid status" };

  const { supabase, error } = await requireAdminUser();
  if (error) return { error };

  const { error: updateError } = await supabase
    .from("posts")
    .update({ title, status })
    .eq("id", postId);

  if (updateError) {
    console.error("Error admin-updating post:", updateError);
    return { error: "Failed to update post" };
  }

  revalidatePath("/admin");
  revalidatePath(`/posts/${postId}`);
  revalidatePath("/search");
  return { success: true };
}

export async function runAdminTestsAction(
  _prevState: AdminTestRunState,
  formData: FormData
): Promise<AdminTestRunState> {
  const script = String(formData.get("script") ?? "");
  const allowedScripts = new Set(["test", "test:e2e"]);

  if (!allowedScripts.has(script)) {
    return {
      status: "error",
      message: "Invalid test command",
      output: "",
    };
  }

  const { error } = await requireAdminUser();
  if (error) {
    return {
      status: "error",
      message: error,
      output: "",
    };
  }

  const isProduction = process.env.IS_PRODUCTION === "true";
  if (isProduction) {
    return {
      status: "error",
      message: "Test runner is disabled in production",
      output: "",
    };
  }

  const timeoutMs = script === "test:e2e" ? 300_000 : 120_000;

  try {
    const command =
      process.platform === "win32"
        ? execFileAsync("cmd.exe", ["/d", "/s", "/c", `npm run ${script}`], {
            cwd: process.cwd(),
            timeout: timeoutMs,
            maxBuffer: 2 * 1024 * 1024,
          })
        : execFileAsync("npm", ["run", script], {
            cwd: process.cwd(),
            timeout: timeoutMs,
            maxBuffer: 2 * 1024 * 1024,
          });

    const { stdout, stderr } = await command;

    const output = `${stdout ?? ""}${stderr ?? ""}`.trim().slice(-8000);
    return {
      status: "success",
      message: `Completed: npm run ${script}`,
      output,
    };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    const output = `${err.stdout ?? ""}${err.stderr ?? ""}${err.message ? `\n${err.message}` : ""}`
      .trim()
      .slice(-8000);

    return {
      status: "error",
      message: `Failed: npm run ${script}`,
      output,
    };
  }
}

export async function deletePostAdminAction(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  if (!postId) return { error: "Invalid post id" };

  const { supabase, error } = await requireAdminUser();
  if (error) return { error };

  const { error: deleteError } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId);

  if (deleteError) {
    console.error("Error admin-deleting post:", deleteError);
    return { error: "Failed to delete post" };
  }

  revalidatePath("/admin");
  revalidatePath(`/posts/${postId}`);
  revalidatePath("/search");
  return { success: true };
}

export async function setModerationStatusAction(formData: FormData) {
  const logId = String(formData.get("logId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "") as "reviewed" | "dismissed";

  if (!logId || (nextStatus !== "reviewed" && nextStatus !== "dismissed")) {
    return { error: "Invalid moderation status request" };
  }

  const { supabase, user, error } = await requireAdminUser();
  if (error || !user) return { error: error ?? "Not authorized" };

  const { error: updateError } = await supabase
    .from("moderation_log")
    .update({
      status: nextStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", logId);

  if (updateError) {
    console.error("Error updating moderation status:", updateError);
    return { error: "Failed to update moderation status" };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function setModerationStatusBulkAction(formData: FormData) {
  const nextStatus = String(formData.get("nextStatus") ?? "") as "reviewed" | "dismissed";
  const logIds = formData
    .getAll("logIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if ((nextStatus !== "reviewed" && nextStatus !== "dismissed") || logIds.length === 0) {
    return { error: "Invalid bulk moderation request" };
  }

  const uniqueLogIds = [...new Set(logIds)];

  const { supabase, user, error } = await requireAdminUser();
  if (error || !user) return { error: error ?? "Not authorized" };

  const { error: updateError } = await supabase
    .from("moderation_log")
    .update({
      status: nextStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .in("id", uniqueLogIds)
    .eq("status", "pending");

  if (updateError) {
    console.error("Error bulk updating moderation status:", updateError);
    return { error: "Failed to update moderation status" };
  }

  revalidatePath("/admin");
  return { success: true };
}

async function setModerationActionTaken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  logId: string,
  adminUserId: string
) {
  const { error } = await supabase
    .from("moderation_log")
    .update({
      status: "action_taken",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
    })
    .eq("id", logId);

  return error;
}

function isConfirmed(formData: FormData) {
  return String(formData.get("confirm") ?? "").toLowerCase() === "yes";
}

export async function banUserFromModerationAction(formData: FormData) {
  const logId = String(formData.get("logId") ?? "");
  const targetUserId = String(formData.get("targetUserId") ?? "");

  if (!logId || !targetUserId) return { error: "Invalid moderation enforcement request" };
  if (!isConfirmed(formData)) return { error: "Confirmation required before enforcement action" };

  const { supabase, user, error } = await requireAdminUser();
  if (error || !user) return { error: error ?? "Not authorized" };

  if (targetUserId === user.id) {
    return { error: "You cannot ban your own account" };
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id,role,status")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!targetProfile) return { error: "User not found" };
  if (targetProfile.role === "admin") return { error: "Admins cannot ban other admins" };

  const { error: banError } = await supabase
    .from("profiles")
    .update({ status: "banned" })
    .eq("id", targetUserId);

  if (banError) {
    console.error("Error banning user from moderation action:", banError);
    return { error: "Failed to ban user" };
  }

  const moderationError = await setModerationActionTaken(supabase, logId, user.id);
  if (moderationError) {
    console.error("Error setting moderation action_taken after ban:", moderationError);
    return { error: "Failed to update moderation status" };
  }

  revalidatePath("/admin");
  revalidatePath("/users");
  revalidatePath("/search");
  revalidatePath("/journeys");
  return { success: true };
}

export async function deleteFlaggedContentFromModerationAction(formData: FormData) {
  const logId = String(formData.get("logId") ?? "");
  const targetUserId = String(formData.get("targetUserId") ?? "");
  const contentType = String(formData.get("contentType") ?? "") as ModerationContentType;
  const relatedEntityId = String(formData.get("relatedEntityId") ?? "");

  if (!logId || !targetUserId || !contentType) {
    return { error: "Invalid moderation enforcement request" };
  }
  if (!isConfirmed(formData)) return { error: "Confirmation required before enforcement action" };

  const { supabase, user, error } = await requireAdminUser();
  if (error || !user) return { error: error ?? "Not authorized" };

  if (
    contentType === "post_title" ||
    contentType === "post_content" ||
    contentType === "post_image"
  ) {
    if (!relatedEntityId) return { error: "Missing related content id" };
    const { error: deleteError } = await supabase.from("posts").delete().eq("id", relatedEntityId);
    if (deleteError) {
      console.error("Error deleting flagged post content:", deleteError);
      return { error: "Failed to delete flagged content" };
    }
  } else if (contentType === "journey_title" || contentType === "journey_description") {
    if (!relatedEntityId) return { error: "Missing related content id" };
    const { error: deleteError } = await supabase.from("journeys").delete().eq("id", relatedEntityId);
    if (deleteError) {
      console.error("Error deleting flagged journey content:", deleteError);
      return { error: "Failed to delete flagged content" };
    }
  } else if (contentType === "profile_bio") {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ bio: null })
      .eq("id", targetUserId);
    if (updateError) {
      console.error("Error clearing flagged profile bio:", updateError);
      return { error: "Failed to delete flagged content" };
    }
  } else if (contentType === "username") {
    const replacement = `removed-${targetUserId.slice(0, 8)}-${Date.now().toString().slice(-6)}`;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ username: replacement, display_name: null })
      .eq("id", targetUserId);
    if (updateError) {
      console.error("Error replacing flagged username:", updateError);
      return { error: "Failed to delete flagged content" };
    }
  } else {
    return { error: "Unsupported moderation content type" };
  }

  const moderationError = await setModerationActionTaken(supabase, logId, user.id);
  if (moderationError) {
    console.error("Error setting moderation action_taken after content deletion:", moderationError);
    return { error: "Failed to update moderation status" };
  }

  revalidatePath("/admin");
  revalidatePath("/search");
  revalidatePath("/journeys");
  revalidatePath("/users");
  return { success: true };
}

export async function deleteAllUserContentFromModerationAction(formData: FormData) {
  const logId = String(formData.get("logId") ?? "");
  const targetUserId = String(formData.get("targetUserId") ?? "");

  if (!logId || !targetUserId) return { error: "Invalid moderation enforcement request" };
  if (!isConfirmed(formData)) return { error: "Confirmation required before enforcement action" };

  const { supabase, user, error } = await requireAdminUser();
  if (error || !user) return { error: error ?? "Not authorized" };

  const { error: deletePostsError } = await supabase
    .from("posts")
    .delete()
    .eq("author_id", targetUserId);
  if (deletePostsError) {
    console.error("Error deleting all user posts from moderation action:", deletePostsError);
    return { error: "Failed to delete user content" };
  }

  const { error: deleteJourneysError } = await supabase
    .from("journeys")
    .delete()
    .eq("owner_id", targetUserId);
  if (deleteJourneysError) {
    console.error("Error deleting all user journeys from moderation action:", deleteJourneysError);
    return { error: "Failed to delete user content" };
  }

  const moderationError = await setModerationActionTaken(supabase, logId, user.id);
  if (moderationError) {
    console.error("Error setting moderation action_taken after delete all content:", moderationError);
    return { error: "Failed to update moderation status" };
  }

  revalidatePath("/admin");
  revalidatePath("/search");
  revalidatePath("/journeys");
  revalidatePath("/users");
  return { success: true };
}

export async function deleteModerationLogAction(formData: FormData) {
  const logId = String(formData.get("logId") ?? "");
  if (!logId) return { error: "Invalid moderation log request" };
  if (!isConfirmed(formData)) return { error: "Confirmation required before enforcement action" };

  const { supabase, error } = await requireAdminUser();
  if (error) return { error };

  const { error: deleteError } = await supabase
    .from("moderation_log")
    .delete()
    .eq("id", logId);

  if (deleteError) {
    console.error("Error deleting moderation log:", deleteError);
    return { error: "Failed to delete moderation log" };
  }

  revalidatePath("/admin");
  return { success: true };
}
