import { supabaseBrowser } from "@/services/supabase/client";

export async function signUp(email: string, password: string) {
  const supabase = supabaseBrowser();
  return supabase.auth.signUp({ email, password });
}

export async function signIn(email: string, password: string) {
  const supabase = supabaseBrowser();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  const supabase = supabaseBrowser();
  return supabase.auth.signOut();
}

export async function requestPasswordReset(email: string) {
  const supabase = supabaseBrowser();
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

export async function updatePassword(newPassword: string) {
  const supabase = supabaseBrowser();
  return supabase.auth.updateUser({ password: newPassword });
}
