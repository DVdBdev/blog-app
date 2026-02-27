import { createClient } from "@/services/supabase/server";
import { Post } from "@/types";

export type PostWithAuthor = Post & {
  profiles: { username: string; display_name: string | null } | null;
};

export interface PostViewResult {
  post: PostWithAuthor | null;
  /** The authenticated user's id, or null if unauthenticated. */
  currentUserId: string | null;
  /** True when the authenticated user is an admin. */
  isAdmin: boolean;
}

export interface DailyContribution {
  date: string;
  count: number;
}

export async function getPostsByJourneyId(
  journeyId: string,
  { publishedOnly = false, canManageAll = false }: { publishedOnly?: boolean; canManageAll?: boolean } = {}
): Promise<Post[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated visitors can only see published posts (RLS also enforces this).
  const forcePublishedOnly = publishedOnly || !user;

  let query = supabase
    .from("posts")
    .select("*")
    .eq("journey_id", journeyId)
    .order("created_at", { ascending: false });

  if (!forcePublishedOnly && !canManageAll) {
    // Owners viewing their own journey include drafts from their own posts.
    query = query.eq("author_id", user!.id);
  }

  if (forcePublishedOnly) {
    // Public viewer: only published posts (RLS handles the actual enforcement)
    query = query.eq("status", "published");
  }

  const { data: posts, error } = await query;

  if (error) {
    console.error("Error fetching posts:", error);
    return [];
  }

  return posts as Post[];
}

export async function getPostById(id: string): Promise<PostViewResult> {
  const supabase = await createClient();

  // Get the current user (may be null for unauthenticated visitors).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentUserId = user?.id ?? null;
  let isAdmin = false;

  if (currentUserId) {
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUserId)
      .maybeSingle();
    isAdmin = currentProfile?.role === "admin";
  }

  const { data: post, error } = await supabase
    .from("posts")
    .select("*, profiles(username, display_name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    // No row found is expected after deletion or for inaccessible records.
    if (error.code !== "PGRST116") {
      console.error("Error fetching post:", error);
    }
    return { post: null, currentUserId, isAdmin };
  }

  if (!post) {
    return { post: null, currentUserId, isAdmin };
  }

  const typedPost = post as PostWithAuthor;

  // Block unauthenticated / non-author access to drafts.
  if (typedPost.status === "draft" && currentUserId !== typedPost.author_id && !isAdmin) {
    return { post: null, currentUserId, isAdmin };
  }

  return { post: typedPost, currentUserId, isAdmin };
}

export async function getDailyPostContributionsByAuthor(
  authorId: string,
  { publishedOnly = false }: { publishedOnly?: boolean } = {}
): Promise<DailyContribution[]> {
  const supabase = await createClient();

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - 364);

  let query = supabase
    .from("posts")
    .select("created_at")
    .eq("author_id", authorId)
    .gte("created_at", startDate.toISOString());

  if (publishedOnly) {
    query = query.eq("status", "published");
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching daily post contributions:", error);
    return [];
  }

  const counts = new Map<string, number>();

  for (const row of data ?? []) {
    const createdAt = row.created_at as string;
    const day = new Date(createdAt).toISOString().slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function hasPostsByAuthor(authorId: string): Promise<boolean> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", authorId);

  if (error) {
    console.error("Error checking whether author has posts:", error);
    return false;
  }

  return (count ?? 0) > 0;
}
