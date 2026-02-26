"use server";

import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";
import { Profile } from "@/types";

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

  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile:", error);
    return { error: "Failed to update profile" };
  }

  revalidatePath("/me");
  return { success: true };
}
