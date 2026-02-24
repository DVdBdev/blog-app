"use server";

import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";
import { PostStatus } from "@/types";

export interface CreatePostData {
  journey_id: string;
  title: string;
  content: Record<string, unknown>; // JSONB
  status: PostStatus;
}

export async function createPost(data: CreatePostData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not authenticated" };
  }

  if (!data.title || data.title.trim() === "") {
    return { error: "Title is required" };
  }

  const { data: inserted, error } = await supabase
    .from("posts")
    .insert([
      {
        journey_id: data.journey_id,
        author_id: user.id,
        title: data.title.trim(),
        content: data.content,
        status: data.status,
      },
    ])
    .select("id,content")
    .single();

  if (error) {
    console.error("Error creating post:", error);
    return { error: "Failed to create post" };
  }

  revalidatePath(`/journeys/${data.journey_id}`);
  return { success: true, post: inserted };
}

export interface UpdatePostData {
  id: string;
  title: string;
  content: Record<string, unknown>;
  status: PostStatus;
}

export async function updatePost(data: UpdatePostData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not authenticated" };
  }

  if (!data.title || data.title.trim() === "") {
    return { error: "Title is required" };
  }

  const { data: updated, error } = await supabase
    .from("posts")
    .update({
      title: data.title.trim(),
      content: data.content,
      status: data.status,
    })
    .eq("id", data.id)
    .eq("author_id", user.id)
    .select("id,content")
    .single();

  if (error) {
    console.error("Error updating post:", error);
    return { error: "Failed to update post" };
  }

  revalidatePath(`/posts/${data.id}`);
  return { success: true, post: updated };
}

export interface DeletePostData {
  id: string;
}

export async function deletePost(data: DeletePostData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not authenticated" };
  }

  const { data: deletedPost, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", data.id)
    .eq("author_id", user.id)
    .select("id,journey_id")
    .maybeSingle();

  if (error) {
    console.error("Error deleting post:", error);
    return { error: "Failed to delete post" };
  }

  if (!deletedPost) {
    return { error: "Post not found or not authorized" };
  }

  const journeyId = deletedPost.journey_id as string;
  revalidatePath(`/posts/${data.id}`);
  revalidatePath(`/journeys/${journeyId}`);
  revalidatePath("/search");
  return { success: true, journeyId };
}
