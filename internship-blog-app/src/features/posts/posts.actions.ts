"use server";

import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";
import { PostStatus } from "@/types";
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

const POST_PERF_LOGS_ENABLED = process.env.POST_PERF_LOGS === "true";

function perfStart() {
  return process.hrtime.bigint();
}

function perfEnd(action: string, startedAt: bigint, stage: string, meta?: Record<string, string | number | boolean>) {
  if (!POST_PERF_LOGS_ENABLED) return;
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  console.info(`[post-perf] ${action}.${stage} ${durationMs.toFixed(1)}ms${suffix}`);
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeContentForCompare(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

function runModerationLogsInBackground(tasks: Array<Promise<void>>) {
  void Promise.allSettled(tasks).catch((error) => {
    console.error("Background moderation logging failed:", error);
  });
}

async function findBlockedImage(
  input: {
    userId: string;
    relatedEntityId?: string;
    imageUrls: string[];
  }
) {
  const concurrency = 2;
  for (let index = 0; index < input.imageUrls.length; index += concurrency) {
    const batch = input.imageUrls.slice(index, index + concurrency);
    const results = await Promise.all(
      batch.map((imageUrl) =>
        enforceImageModerationOrBlock({
          userId: input.userId,
          contentType: "post_image",
          relatedEntityId: input.relatedEntityId,
          imageUrl,
        })
      )
    );
    const blocked = results.find(Boolean);
    if (blocked) return blocked;
  }
  return null;
}

async function getAuthenticatedActor(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ userId: string; isAdmin: boolean; error: string | null }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { userId: "", isAdmin: false, error: "Not authenticated" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching actor profile:", profileError);
  }

  if ((profile?.status as string | undefined) === "banned") {
    return { userId: user.id, isAdmin: false, error: "Account suspended" };
  }

  return { userId: user.id, isAdmin: profile?.role === "admin", error: null };
}

export async function createPost(data: CreatePostData) {
  const startedAt = perfStart();
  const supabase = await createClient();
  const actor = await getAuthenticatedActor(supabase);
  perfEnd("createPost", startedAt, "auth");
  if (actor.error) {
    return { error: actor.error };
  }

  if (!data.title || data.title.trim() === "") {
    return { error: "Title is required" };
  }

  const normalizedTitle = normalizeText(data.title);
  const createdPostText = extractRichTextContent(data.content);
  const createdPostImages = extractImageUrlsFromRichText(data.content);

  const moderationStartedAt = perfStart();
  const [blockedTitle, blockedContent] = await Promise.all([
    enforceTextModerationOrBlock({
      userId: actor.userId,
      contentType: "post_title",
      text: normalizedTitle,
    }),
    createdPostText
      ? enforceTextModerationOrBlock({
          userId: actor.userId,
          contentType: "post_content",
          text: createdPostText,
        })
      : Promise.resolve(null),
  ]);
  perfEnd("createPost", moderationStartedAt, "moderate_text", {
    hasContent: Boolean(createdPostText),
  });
  if (blockedTitle) return { error: blockedTitle.message, moderationBlock: blockedTitle.details };
  if (blockedContent) return { error: blockedContent.message, moderationBlock: blockedContent.details };

  const imageModerationStartedAt = perfStart();
  const blockedImage = await findBlockedImage({
    userId: actor.userId,
    imageUrls: createdPostImages,
  });
  if (blockedImage) {
    return { error: blockedImage.message, moderationBlock: blockedImage.details };
  }
  perfEnd("createPost", imageModerationStartedAt, "moderate_images", {
    imageCount: createdPostImages.length,
  });

  const insertStartedAt = perfStart();
  const { data: inserted, error } = await supabase
    .from("posts")
    .insert([
      {
        journey_id: data.journey_id,
        author_id: actor.userId,
        title: normalizedTitle,
        content: data.content,
        status: data.status,
      },
    ])
    .select("id,content")
    .single();
  perfEnd("createPost", insertStartedAt, "insert");

  if (error) {
    console.error("Error creating post:", error);
    return { error: "Failed to create post" };
  }

  const logStartedAt = perfStart();
  const moderationLogTasks: Array<Promise<void>> = [
    logModerationCandidate({
      userId: actor.userId,
      contentType: "post_title",
      relatedEntityId: inserted.id as string,
      text: normalizedTitle,
    }),
  ];
  if (createdPostText) {
    moderationLogTasks.push(
      logModerationCandidate({
        userId: actor.userId,
        contentType: "post_content",
        relatedEntityId: inserted.id as string,
        text: createdPostText,
      })
    );
  }
  for (const imageUrl of createdPostImages) {
    moderationLogTasks.push(
      logImageModerationCandidate({
        userId: actor.userId,
        relatedEntityId: inserted.id as string,
        imageUrl,
      })
    );
  }
  runModerationLogsInBackground(moderationLogTasks);
  perfEnd("createPost", logStartedAt, "log_moderation", {
    taskCount: moderationLogTasks.length,
  });

  const revalidateStartedAt = perfStart();
  revalidatePath(`/journeys/${data.journey_id}`);
  perfEnd("createPost", revalidateStartedAt, "revalidate");
  return { success: true, post: inserted };
}

export interface UpdatePostData {
  id: string;
  title: string;
  content: Record<string, unknown>;
  status: PostStatus;
}

export async function updatePost(data: UpdatePostData) {
  const startedAt = perfStart();
  const supabase = await createClient();
  const actor = await getAuthenticatedActor(supabase);
  perfEnd("updatePost", startedAt, "auth");
  if (actor.error) {
    return { error: actor.error };
  }

  if (!data.title || data.title.trim() === "") {
    return { error: "Title is required" };
  }

  const existingPostStartedAt = perfStart();
  const { data: existingPost, error: existingPostError } = await supabase
    .from("posts")
    .select("id,title,content,status,author_id")
    .eq("id", data.id)
    .maybeSingle();
  perfEnd("updatePost", existingPostStartedAt, "load_existing", {
    found: Boolean(existingPost),
  });
  if (existingPostError) {
    console.error("Error fetching existing post before update:", existingPostError);
  }

  const normalizedTitle = normalizeText(data.title);
  const updatedPostText = extractRichTextContent(data.content);
  const updatedPostImages = extractImageUrlsFromRichText(data.content);

  const previousTitle = normalizeText(String(existingPost?.title ?? ""));
  const previousContent = existingPost?.content && typeof existingPost.content === "object"
    ? (existingPost.content as Record<string, unknown>)
    : {};
  const previousContentText = extractRichTextContent(previousContent);
  const previousImages = extractImageUrlsFromRichText(previousContent);

  const titleChanged = !existingPost || previousTitle !== normalizedTitle;
  const textChanged = !existingPost || normalizeText(previousContentText) !== normalizeText(updatedPostText);
  const statusChanged = !existingPost || String(existingPost.status ?? "") !== data.status;
  const imagesChanged =
    !existingPost ||
    normalizeContentForCompare({ urls: [...previousImages].sort() }) !==
      normalizeContentForCompare({ urls: [...updatedPostImages].sort() });

  if (!titleChanged && !textChanged && !imagesChanged && !statusChanged) {
    return {
      success: true,
      post: { id: data.id, content: (existingPost?.content as Record<string, unknown>) ?? data.content },
    };
  }

  const moderationStartedAt = perfStart();
  const [blockedTitle, blockedContent] = await Promise.all([
    titleChanged
      ? enforceTextModerationOrBlock({
          userId: actor.userId,
          contentType: "post_title",
          relatedEntityId: data.id,
          text: normalizedTitle,
        })
      : Promise.resolve(null),
    textChanged && updatedPostText
      ? enforceTextModerationOrBlock({
          userId: actor.userId,
          contentType: "post_content",
          relatedEntityId: data.id,
          text: updatedPostText,
        })
      : Promise.resolve(null),
  ]);
  perfEnd("updatePost", moderationStartedAt, "moderate_text", {
    titleChanged,
    textChanged,
  });
  if (blockedTitle) return { error: blockedTitle.message, moderationBlock: blockedTitle.details };
  if (blockedContent) return { error: blockedContent.message, moderationBlock: blockedContent.details };

  const imageModerationStartedAt = perfStart();
  if (imagesChanged) {
    const blockedImage = await findBlockedImage({
      userId: actor.userId,
      relatedEntityId: data.id,
      imageUrls: updatedPostImages,
    });
    if (blockedImage) {
      return { error: blockedImage.message, moderationBlock: blockedImage.details };
    }
  }
  perfEnd("updatePost", imageModerationStartedAt, "moderate_images", {
    imageCount: updatedPostImages.length,
    imagesChanged,
  });

  let query = supabase
    .from("posts")
    .update({
      title: normalizedTitle,
      content: data.content,
      status: data.status,
    })
    .eq("id", data.id);

  if (!actor.isAdmin) {
    query = query.eq("author_id", actor.userId);
  }

  const updateStartedAt = perfStart();
  const { data: updated, error } = await query.select("id,content").single();
  perfEnd("updatePost", updateStartedAt, "update");

  if (error) {
    console.error("Error updating post:", error);
    return { error: "Failed to update post" };
  }

  const moderationLogTasks: Array<Promise<void>> = [];
  if (titleChanged) {
    moderationLogTasks.push(
      logModerationCandidate({
        userId: actor.userId,
        contentType: "post_title",
        relatedEntityId: data.id,
        text: normalizedTitle,
      })
    );
  }
  if (textChanged && updatedPostText) {
    moderationLogTasks.push(
      logModerationCandidate({
        userId: actor.userId,
        contentType: "post_content",
        relatedEntityId: data.id,
        text: updatedPostText,
      })
    );
  }
  if (imagesChanged) {
    for (const imageUrl of updatedPostImages) {
      moderationLogTasks.push(
        logImageModerationCandidate({
          userId: actor.userId,
          relatedEntityId: data.id,
          imageUrl,
        })
      );
    }
  }

  const logStartedAt = perfStart();
  runModerationLogsInBackground(moderationLogTasks);
  perfEnd("updatePost", logStartedAt, "log_moderation", {
    taskCount: moderationLogTasks.length,
  });

  const revalidateStartedAt = perfStart();
  revalidatePath(`/posts/${data.id}`);
  perfEnd("updatePost", revalidateStartedAt, "revalidate");
  return { success: true, post: updated };
}

export interface DeletePostData {
  id: string;
}

export async function deletePost(data: DeletePostData) {
  const startedAt = perfStart();
  const supabase = await createClient();
  const actor = await getAuthenticatedActor(supabase);
  perfEnd("deletePost", startedAt, "auth");
  if (actor.error) {
    return { error: actor.error };
  }

  let query = supabase
    .from("posts")
    .delete()
    .eq("id", data.id);

  if (!actor.isAdmin) {
    query = query.eq("author_id", actor.userId);
  }

  const deleteStartedAt = perfStart();
  const { data: deletedPost, error } = await query.select("id,journey_id").maybeSingle();
  perfEnd("deletePost", deleteStartedAt, "delete");

  if (error) {
    console.error("Error deleting post:", error);
    return { error: "Failed to delete post" };
  }

  if (!deletedPost) {
    return { error: "Post not found or not authorized" };
  }

  const journeyId = deletedPost.journey_id as string;
  const revalidateStartedAt = perfStart();
  revalidatePath(`/posts/${data.id}`);
  revalidatePath(`/journeys/${journeyId}`);
  perfEnd("deletePost", revalidateStartedAt, "revalidate");
  return { success: true, journeyId };
}
