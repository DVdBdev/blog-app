import { createClient } from "@/services/supabase/server";
import { UserRole } from "@/types";

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching current user role:", error);
    return null;
  }

  return ((profile?.role as UserRole | null) ?? "user");
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === "admin";
}
