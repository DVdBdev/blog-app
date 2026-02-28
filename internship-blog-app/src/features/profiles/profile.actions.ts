"use server";

import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";
import { Profile } from "@/types";
import { enforceTextModerationOrBlock, logModerationCandidate } from "@/features/moderation/moderation.server";

export type UpdateProfileData = Partial<
  Omit<Profile, "id" | "username" | "email" | "created_at" | "updated_at" | "role" | "status">
>;

export async function updateProfile(data: UpdateProfileData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not authenticated" };
  }

  if (typeof data.bio === "string" && data.bio.trim()) {
    const blockedBio = await enforceTextModerationOrBlock({
      userId: user.id,
      contentType: "profile_bio",
      relatedEntityId: user.id,
      text: data.bio,
    });
    if (blockedBio) {
      return { error: blockedBio.message, moderationBlock: blockedBio.details };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile:", error);
    return { error: "Failed to update profile" };
  }

  if (typeof data.bio === "string" && data.bio.trim()) {
    await logModerationCandidate({
      userId: user.id,
      contentType: "profile_bio",
      relatedEntityId: user.id,
      text: data.bio,
    });
  }

  revalidatePath("/me");
  return { success: true };
}
