import { createClient } from "@/services/supabase/server";
import { Post } from "@/types";

export type PostWithAuthor = Post & {
  profiles: { username: string; display_name: string | null } | null;
};

export interface PostViewResult {
  post: PostWithAuthor | null;
  /** The authenticated user's id, or null if unauthenticated. */
  currentUserId: string | null;
}

export async function getPostsByJourneyId(
  journeyId: string,
  { publishedOnly = false }: { publishedOnly?: boolean } = {}
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

  if (!forcePublishedOnly) {
    // Owner: scope to their own posts so drafts are included
    query = query.eq("author_id", user!.id);
  } else {
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

  const { data: post, error } = await supabase
    .from("posts")
    .select("*, profiles(username, display_name)")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching post:", error);
    return { post: null, currentUserId };
  }

  const typedPost = post as PostWithAuthor;

  // Block unauthenticated / non-author access to drafts.
  if (typedPost.status === "draft" && currentUserId !== typedPost.author_id) {
    return { post: null, currentUserId };
  }

  return { post: typedPost, currentUserId };
}
