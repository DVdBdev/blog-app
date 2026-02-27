"use server";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";

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

  const isEnabled = process.env.NODE_ENV !== "production" || process.env.ENABLE_ADMIN_TEST_RUNNER === "true";
  if (!isEnabled) {
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
