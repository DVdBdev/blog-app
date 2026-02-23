/**
 * Public (unauthenticated-safe) data access for journeys.
 * These functions rely on RLS to enforce visibility rules — no auth cookie required.
 */
import { createClient } from "@/services/supabase/server";
import { Journey, Profile } from "@/types";

/**
 * Fetch a profile by username. Returns null if not found.
 * Safe to call from public (unauthenticated) pages.
 */
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      // PGRST116 = "no rows" — not a real error
      console.error("Error fetching profile by username:", error);
    }
    return null;
  }

  return profile as Profile;
}

/**
 * Fetch all PUBLIC journeys belonging to a given owner (by owner_id).
 * Only returns journeys with visibility = 'public'.
 * Safe to call from unauthenticated pages.
 */
export async function getPublicJourneysByOwner(ownerId: string): Promise<Journey[]> {
  const supabase = await createClient();

  const { data: journeys, error } = await supabase
    .from("journeys")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching public journeys:", error);
    return [];
  }

  return journeys as Journey[];
}
