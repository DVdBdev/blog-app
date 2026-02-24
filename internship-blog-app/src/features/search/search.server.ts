import { createClient } from "@/services/supabase/server";
import { Journey, Profile } from "@/types";

export type SearchType = "all" | "posts" | "journeys";
export type SearchSort = "relevance" | "newest" | "oldest";

interface SearchOptions {
  query: string;
  type: SearchType;
  sort: SearchSort;
  limitPerType?: number;
}

type SearchPost = {
  id: string;
  title: string;
  excerpt: string | null;
  created_at: string;
  author_id: string;
  journey_id: string;
  status: "draft" | "published";
};

export type SearchResultItem =
  | {
      kind: "post";
      id: string;
      title: string;
      snippet: string | null;
      createdAt: string;
      authorId: string;
      authorUsername: string | null;
      authorDisplayName: string | null;
      journeyId: string;
      journeyTitle: string | null;
      relevanceScore: number;
    }
  | {
      kind: "journey";
      id: string;
      title: string;
      snippet: string | null;
      createdAt: string;
      ownerId: string;
      ownerUsername: string | null;
      ownerDisplayName: string | null;
      relevanceScore: number;
    };

export interface SearchResponse {
  query: string;
  type: SearchType;
  sort: SearchSort;
  total: number;
  items: SearchResultItem[];
}

function normalizeTerm(value: string) {
  return value.trim().toLowerCase();
}

function escapeLike(value: string) {
  return value.replace(/[%_]/g, (m) => `\\${m}`);
}

function scoreText(text: string | null | undefined, term: string) {
  if (!text || !term) return 0;
  const normalized = text.toLowerCase();
  if (normalized === term) return 45;
  if (normalized.startsWith(term)) return 30;
  if (normalized.includes(term)) return 18;
  return 0;
}

function scoreName(username: string | null, displayName: string | null, term: string) {
  return scoreText(username, term) + scoreText(displayName, term);
}

function compareBySort(
  a: SearchResultItem,
  b: SearchResultItem,
  sort: SearchSort,
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

export async function searchPublicContent({
  query,
  type,
  sort,
  limitPerType = 30,
}: SearchOptions): Promise<SearchResponse> {
  const supabase = await createClient();
  const normalizedQuery = normalizeTerm(query);
  const hasTerm = normalizedQuery.length > 0;
  const likePattern = `%${escapeLike(normalizedQuery)}%`;

  let matchingProfileIds: string[] = [];
  if (hasTerm) {
    const { data: matchedProfiles } = await supabase
      .from("profiles")
      .select("id")
      .or(`username.ilike.${likePattern},display_name.ilike.${likePattern}`)
      .limit(40);

    matchingProfileIds = (matchedProfiles ?? []).map((p) => p.id as string);
  }

  let posts: SearchPost[] = [];
  if (type === "all" || type === "posts") {
    let postQuery = supabase
      .from("posts")
      .select("id,title,excerpt,created_at,author_id,journey_id,status")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limitPerType);

    if (hasTerm) {
      const clauses = [`title.ilike.${likePattern}`, `excerpt.ilike.${likePattern}`];
      if (matchingProfileIds.length > 0) {
        clauses.push(`author_id.in.(${matchingProfileIds.join(",")})`);
      }
      postQuery = postQuery.or(clauses.join(","));
    }

    const { data: postData, error } = await postQuery;
    if (error) {
      console.error("Error searching posts:", error);
    } else {
      posts = (postData ?? []) as SearchPost[];
    }
  }

  let journeys: Journey[] = [];
  if (type === "all" || type === "journeys") {
    let journeyQuery = supabase
      .from("journeys")
      .select("id,owner_id,title,description,visibility,created_at,updated_at")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(limitPerType);

    if (hasTerm) {
      const clauses = [`title.ilike.${likePattern}`, `description.ilike.${likePattern}`];
      if (matchingProfileIds.length > 0) {
        clauses.push(`owner_id.in.(${matchingProfileIds.join(",")})`);
      }
      journeyQuery = journeyQuery.or(clauses.join(","));
    }

    const { data: journeyData, error } = await journeyQuery;
    if (error) {
      console.error("Error searching journeys:", error);
    } else {
      journeys = (journeyData ?? []) as Journey[];
    }
  }

  const profileIds = Array.from(
    new Set([
      ...posts.map((post) => post.author_id),
      ...journeys.map((journey) => journey.owner_id),
    ]),
  );

  const journeyIds = Array.from(new Set(posts.map((post) => post.journey_id)));

  let profileMap = new Map<string, Pick<Profile, "id" | "username" | "display_name">>();
  if (profileIds.length > 0) {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id,username,display_name")
      .in("id", profileIds);

    if (error) {
      console.error("Error loading search profiles:", error);
    } else {
      profileMap = new Map(
        (profiles ?? []).map((profile) => [
          profile.id as string,
          {
            id: profile.id as string,
            username: (profile.username as string) ?? null,
            display_name: (profile.display_name as string | null) ?? null,
          },
        ]),
      );
    }
  }

  let journeyTitleMap = new Map<string, string>();
  if (journeyIds.length > 0) {
    const { data: journeyRows, error } = await supabase
      .from("journeys")
      .select("id,title")
      .in("id", journeyIds);

    if (error) {
      console.error("Error loading journey titles for search:", error);
    } else {
      journeyTitleMap = new Map(
        (journeyRows ?? []).map((row) => [row.id as string, row.title as string]),
      );
    }
  }

  const postItems: SearchResultItem[] = posts.map((post) => {
    const profile = profileMap.get(post.author_id);
    const relevanceScore = hasTerm
      ? scoreText(post.title, normalizedQuery) * 2 +
        scoreText(post.excerpt, normalizedQuery) +
        scoreName(profile?.username ?? null, profile?.display_name ?? null, normalizedQuery)
      : 0;

    return {
      kind: "post",
      id: post.id,
      title: post.title,
      snippet: post.excerpt,
      createdAt: post.created_at,
      authorId: post.author_id,
      authorUsername: profile?.username ?? null,
      authorDisplayName: profile?.display_name ?? null,
      journeyId: post.journey_id,
      journeyTitle: journeyTitleMap.get(post.journey_id) ?? null,
      relevanceScore,
    };
  });

  const journeyItems: SearchResultItem[] = journeys.map((journey) => {
    const profile = profileMap.get(journey.owner_id);
    const relevanceScore = hasTerm
      ? scoreText(journey.title, normalizedQuery) * 2 +
        scoreText(journey.description, normalizedQuery) +
        scoreName(profile?.username ?? null, profile?.display_name ?? null, normalizedQuery)
      : 0;

    return {
      kind: "journey",
      id: journey.id,
      title: journey.title,
      snippet: journey.description,
      createdAt: journey.created_at,
      ownerId: journey.owner_id,
      ownerUsername: profile?.username ?? null,
      ownerDisplayName: profile?.display_name ?? null,
      relevanceScore,
    };
  });

  const items = [...postItems, ...journeyItems].sort((a, b) =>
    compareBySort(a, b, sort, hasTerm),
  );

  return {
    query,
    type,
    sort,
    total: items.length,
    items,
  };
}
