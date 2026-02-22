import { createClient } from "@/services/supabase/server";
import { Journey } from "@/types";

export async function getMyJourneys(): Promise<Journey[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data: journeys, error } = await supabase
    .from("journeys")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching journeys:", error);
    return [];
  }

  return journeys as Journey[];
}
