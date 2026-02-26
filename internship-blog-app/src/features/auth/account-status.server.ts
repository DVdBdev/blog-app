import { createClient } from "@/services/supabase/server";

export async function getCurrentAccountStatus(): Promise<"active" | "banned" | null> {
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
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching account status:", error);
    return null;
  }

  return (profile?.status as "active" | "banned" | null) ?? "active";
}

export async function requireActiveAccount() {
  const status = await getCurrentAccountStatus();
  if (status === "banned") {
    return { error: "Account is banned" as const };
  }

  return { error: null as null };
}
