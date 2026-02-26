/**
 * Public (unauthenticated-safe) data access for journeys.
 * These functions rely on RLS to enforce visibility rules — no auth cookie required.
 */
import { createClient } from "@/services/supabase/server";
import { Journey, Profile } from "@/types";

export interface HomepageJourneyItem {
  journey: Journey;
  ownerName: string | null;
  ownerUsername: string | null;
}

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

/**
 * Fetch recent public journeys where the owner has role = admin.
 * Used by the homepage showcase to keep curation logic in the data layer.
 */
export async function getRecentAdminPublicJourneys(limit = 3): Promise<HomepageJourneyItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("journeys")
    .select("*, profiles!inner(username,display_name,role)")
    .eq("visibility", "public")
    .eq("profiles.role", "admin")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching admin public journeys for home:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const journey = row as unknown as Journey;
    const owner = (row as { profiles?: { username?: string | null; display_name?: string | null } | null }).profiles;

    return {
      journey,
      ownerName: owner?.display_name ?? owner?.username ?? "Unknown writer",
      ownerUsername: owner?.username ?? null,
    };
  });
}
