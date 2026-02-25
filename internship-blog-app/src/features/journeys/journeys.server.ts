import { createClient } from "@/services/supabase/server";
import { Journey } from "@/types";

export interface JourneyViewResult {
  journey: Journey | null;
  /** The authenticated user's id, or null if unauthenticated. */
  currentUserId: string | null;
  /** Journey owner's preferred display name, when available. */
  ownerName: string | null;
  /** Journey owner's username (used to build /u/[username] links). */
  ownerUsername: string | null;
}

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

export async function getJourneyById(id: string): Promise<JourneyViewResult> {
  const supabase = await createClient();

  // currentUserId may be null for unauthenticated visitors.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentUserId = user?.id ?? null;

  const { data: journey, error } = await supabase
    .from("journeys")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    // "No rows" after delete should be treated as a normal not-found case.
    if (error.code === "PGRST116") {
      return { journey: null, currentUserId, ownerName: null, ownerUsername: null };
    }
    console.error("Error fetching journey:", error);
    return { journey: null, currentUserId, ownerName: null, ownerUsername: null };
  }

  if (!journey) {
    return { journey: null, currentUserId, ownerName: null, ownerUsername: null };
  }

  const typedJourney = journey as Journey;

  // Deny access to private journeys for non-owners (defence-in-depth; RLS handles it too).
  if (typedJourney.visibility === "private" && currentUserId !== typedJourney.owner_id) {
    return { journey: null, currentUserId, ownerName: null, ownerUsername: null };
  }

  let ownerName: string | null = null;
  let ownerUsername: string | null = null;
  const { data: owner, error: ownerError } = await supabase
    .from("profiles")
    .select("display_name,username")
    .eq("id", typedJourney.owner_id)
    .maybeSingle();

  if (ownerError) {
    console.error("Error fetching journey owner:", ownerError);
  } else if (owner) {
    ownerUsername = (owner.username as string | null) ?? null;
    ownerName = (owner.display_name as string | null) ?? ownerUsername ?? null;
  }

  return { journey: typedJourney, currentUserId, ownerName, ownerUsername };
}
