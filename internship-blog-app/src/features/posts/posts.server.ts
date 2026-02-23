import { createClient } from "@/services/supabase/server";
import { Post } from "@/types";

export async function getPostsByJourneyId(journeyId: string): Promise<Post[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .eq("journey_id", journeyId)
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching posts:", error);
    return [];
  }

  return posts as Post[];
}

export async function getPostById(id: string): Promise<Post | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .eq("author_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching post:", error);
    return null;
  }

  return post as Post;
}
