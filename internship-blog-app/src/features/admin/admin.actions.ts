"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";

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

  if (targetProfile.role === "admin" && targetProfile.status === "active" && nextStatus === "banned") {
    const activeAdminCount = await getActiveAdminCount(supabase);
    if (activeAdminCount <= 1) {
      return { error: "Cannot ban the last active admin" };
    }
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
