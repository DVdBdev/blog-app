"use server";

import { createClient } from "@/services/supabase/server";
import { createProfileForUser, checkUsernameTaken } from "@/features/profiles/profile.service";
import { logModerationCandidateAsService } from "@/features/moderation/moderation.server";

export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;

  if (!email || !password || !username) {
    return { error: "Missing required fields" };
  }

  // Check if username is taken
  const isTaken = await checkUsernameTaken(username);
  if (isTaken) {
    return { error: "Username is already taken" };
  }

  const supabase = await createClient();

  // Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: "Failed to create user account" };
  }

  // If identities is empty, it means the user already exists
  if (authData.user.identities && authData.user.identities.length === 0) {
    return { error: "Email is already registered" };
  }

  // Create the profile
  const { error: profileError } = await createProfileForUser(
    authData.user.id,
    email,
    username
  );

  if (profileError) {
    // If profile creation fails, we should ideally clean up the auth user,
    // but Supabase doesn't allow deleting users from the client.
    // We log the error and return a friendly message.
    console.error("Failed to create profile:", profileError);
    return { error: "Account created, but failed to set up profile. Please contact support." };
  }

  await logModerationCandidateAsService({
    userId: authData.user.id,
    contentType: "username",
    relatedEntityId: authData.user.id,
    text: username,
  });

  return { success: true };
}
