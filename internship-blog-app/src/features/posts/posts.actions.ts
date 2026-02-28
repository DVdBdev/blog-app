"use server";

import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";
import { PostStatus } from "@/types";
import { requireActiveAccount } from "@/features/auth/account-status.server";
import {
  enforceImageModerationOrBlock,
  enforceTextModerationOrBlock,
  logImageModerationCandidate,
  logModerationCandidate,
} from "@/features/moderation/moderation.server";
import { extractImageUrlsFromRichText, extractRichTextContent } from "@/features/moderation/moderation.lib";

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

  const { error: statusError } = await requireActiveAccount();
  if (statusError) {
    return { error: "Account suspended" };
  }

  if (!data.title || data.title.trim() === "") {
    return { error: "Title is required" };
  }

  const blockedTitle = await enforceTextModerationOrBlock({
    userId: user.id,
    contentType: "post_title",
    text: data.title,
  });
  if (blockedTitle) {
    return { error: blockedTitle.message, moderationBlock: blockedTitle.details };
  }

  const createdPostText = extractRichTextContent(data.content);
  if (createdPostText) {
    const blockedContent = await enforceTextModerationOrBlock({
      userId: user.id,
      contentType: "post_content",
      text: createdPostText,
    });
    if (blockedContent) {
      return { error: blockedContent.message, moderationBlock: blockedContent.details };
    }
  }

  const createdPostImages = extractImageUrlsFromRichText(data.content);
  for (const imageUrl of createdPostImages) {
    const blockedImage = await enforceImageModerationOrBlock({
      userId: user.id,
      contentType: "post_image",
      imageUrl,
    });
    if (blockedImage) {
      return { error: blockedImage.message, moderationBlock: blockedImage.details };
    }
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

  await logModerationCandidate({
    userId: user.id,
    contentType: "post_title",
    relatedEntityId: inserted.id as string,
    text: data.title,
  });
  if (createdPostText) {
    await logModerationCandidate({
      userId: user.id,
      contentType: "post_content",
      relatedEntityId: inserted.id as string,
      text: createdPostText,
    });
  }
  for (const imageUrl of createdPostImages) {
    await logImageModerationCandidate({
      userId: user.id,
      relatedEntityId: inserted.id as string,
      imageUrl,
    });
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

  const { error: statusError } = await requireActiveAccount();
  if (statusError) {
    return { error: "Account suspended" };
  }

  if (!data.title || data.title.trim() === "") {
    return { error: "Title is required" };
  }

  const blockedTitle = await enforceTextModerationOrBlock({
    userId: user.id,
    contentType: "post_title",
    relatedEntityId: data.id,
    text: data.title,
  });
  if (blockedTitle) {
    return { error: blockedTitle.message, moderationBlock: blockedTitle.details };
  }

  const updatedPostText = extractRichTextContent(data.content);
  if (updatedPostText) {
    const blockedContent = await enforceTextModerationOrBlock({
      userId: user.id,
      contentType: "post_content",
      relatedEntityId: data.id,
      text: updatedPostText,
    });
    if (blockedContent) {
      return { error: blockedContent.message, moderationBlock: blockedContent.details };
    }
  }

  const updatedPostImages = extractImageUrlsFromRichText(data.content);
  for (const imageUrl of updatedPostImages) {
    const blockedImage = await enforceImageModerationOrBlock({
      userId: user.id,
      contentType: "post_image",
      relatedEntityId: data.id,
      imageUrl,
    });
    if (blockedImage) {
      return { error: blockedImage.message, moderationBlock: blockedImage.details };
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  let query = supabase
    .from("posts")
    .update({
      title: data.title.trim(),
      content: data.content,
      status: data.status,
    })
    .eq("id", data.id);

  if (!isAdmin) {
    query = query.eq("author_id", user.id);
  }

  const { data: updated, error } = await query.select("id,content").single();

  if (error) {
    console.error("Error updating post:", error);
    return { error: "Failed to update post" };
  }

  await logModerationCandidate({
    userId: user.id,
    contentType: "post_title",
    relatedEntityId: data.id,
    text: data.title,
  });
  if (updatedPostText) {
    await logModerationCandidate({
      userId: user.id,
      contentType: "post_content",
      relatedEntityId: data.id,
      text: updatedPostText,
    });
  }
  for (const imageUrl of updatedPostImages) {
    await logImageModerationCandidate({
      userId: user.id,
      relatedEntityId: data.id,
      imageUrl,
    });
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

  const { error: statusError } = await requireActiveAccount();
  if (statusError) {
    return { error: "Account suspended" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  let query = supabase
    .from("posts")
    .delete()
    .eq("id", data.id);

  if (!isAdmin) {
    query = query.eq("author_id", user.id);
  }

  const { data: deletedPost, error } = await query.select("id,journey_id").maybeSingle();

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
