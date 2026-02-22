import { createClient } from "@supabase/supabase-js";
import { Profile } from "@/types";

// We use the service role key to bypass RLS when creating a profile during registration
// because the user might not be fully authenticated yet (e.g., email confirmation required).
export async function createProfileForUser(
  id: string,
  email: string,
  username: string
): Promise<{ data: Profile | null; error: Error | null }> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .insert([
      {
        id,
        email,
        username,
        display_name: username,
      },
    ])
    .select()
    .single();

  return { data, error };
}

export async function checkUsernameTaken(username: string): Promise<boolean> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "no rows returned"
    console.error("Error checking username:", error);
  }

  return !!data;
}
