import { createClient } from "@/services/supabase/server";

export type UserDirectorySort = "relevance" | "newest" | "oldest";

export interface UserDirectoryItem {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  company: string | null;
  fieldDomain: string | null;
  location: string | null;
  createdAt: string;
  relevanceScore: number;
}

interface SearchPublicProfilesOptions {
  query: string;
  sort: UserDirectorySort;
  limit?: number;
}

function normalizeTerm(value: string) {
  return value.trim().toLowerCase();
}

function escapeLike(value: string) {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}

function scoreText(text: string | null | undefined, term: string) {
  if (!text || !term) return 0;
  const normalized = text.toLowerCase();

  if (normalized === term) return 45;
  if (normalized.startsWith(term)) return 30;
  if (normalized.includes(term)) return 18;

  return 0;
}

function compareUsers(
  a: UserDirectoryItem,
  b: UserDirectoryItem,
  sort: UserDirectorySort,
  hasTerm: boolean,
) {
  if (sort === "relevance" && hasTerm) {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }

  if (sort === "oldest") {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export async function searchPublicProfiles({
  query,
  sort,
  limit = 60,
}: SearchPublicProfilesOptions): Promise<UserDirectoryItem[]> {
  const supabase = await createClient();
  const normalizedQuery = normalizeTerm(query);
  const hasTerm = normalizedQuery.length > 0;

  let profileQuery = supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,bio,company,field_domain,location,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (hasTerm) {
    const likePattern = `%${escapeLike(normalizedQuery)}%`;
    profileQuery = profileQuery.or(
      [
        `username.ilike.${likePattern}`,
        `display_name.ilike.${likePattern}`,
        `bio.ilike.${likePattern}`,
        `company.ilike.${likePattern}`,
        `field_domain.ilike.${likePattern}`,
        `location.ilike.${likePattern}`,
      ].join(","),
    );
  }

  const { data, error } = await profileQuery;

  if (error) {
    console.error("Error loading public profiles:", error);
    return [];
  }

  const users = (data ?? [])
    .filter((profile) => typeof profile.username === "string" && profile.username.length > 0)
    .map((profile) => {
      const username = profile.username as string;
      const displayName = (profile.display_name as string | null) ?? null;
      const bio = (profile.bio as string | null) ?? null;
      const company = (profile.company as string | null) ?? null;
      const fieldDomain = (profile.field_domain as string | null) ?? null;
      const location = (profile.location as string | null) ?? null;

      const relevanceScore = hasTerm
        ? scoreText(username, normalizedQuery) * 2 +
          scoreText(displayName, normalizedQuery) * 2 +
          scoreText(company, normalizedQuery) +
          scoreText(fieldDomain, normalizedQuery) +
          scoreText(location, normalizedQuery) +
          scoreText(bio, normalizedQuery)
        : 0;

      return {
        id: profile.id as string,
        username,
        displayName,
        avatarUrl: (profile.avatar_url as string | null) ?? null,
        bio,
        company,
        fieldDomain,
        location,
        createdAt: profile.created_at as string,
        relevanceScore,
      } satisfies UserDirectoryItem;
    })
    .sort((a, b) => compareUsers(a, b, sort, hasTerm));

  return users;
}