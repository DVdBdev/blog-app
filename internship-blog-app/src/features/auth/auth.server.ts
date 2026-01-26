
import { createClient } from "@/services/supabase/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    // Optional: log or handle silently
    return null;
  }

  return data.user;
}