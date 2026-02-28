"use server";

import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";
import { JourneyStatus, JourneyVisibility } from "@/types";
import { requireActiveAccount } from "@/features/auth/account-status.server";
import { enforceTextModerationOrBlock, logModerationCandidate } from "@/features/moderation/moderation.server";

export interface CreateJourneyData {
  title: string;
  description?: string;
  visibility: JourneyVisibility;
}

export async function createJourney(data: CreateJourneyData) {
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

  const description = data.description?.trim() ?? "";
  const [blockedTitle, blockedDescription] = await Promise.all([
    enforceTextModerationOrBlock({
      userId: user.id,
      contentType: "journey_title",
      text: data.title,
    }),
    description
      ? enforceTextModerationOrBlock({
          userId: user.id,
          contentType: "journey_description",
          text: description,
        })
      : Promise.resolve(null),
  ]);
  if (blockedTitle) return { error: blockedTitle.message, moderationBlock: blockedTitle.details };
  if (blockedDescription) return { error: blockedDescription.message, moderationBlock: blockedDescription.details };

  const { data: insertedJourney, error } = await supabase
    .from("journeys")
    .insert([
      {
        owner_id: user.id,
        title: data.title.trim(),
        description: description || null,
        visibility: data.visibility,
        status: "active",
        completed_at: null,
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("Error creating journey:", error);
    return { error: "Failed to create journey" };
  }

  const journeyId = insertedJourney?.id as string;
  const moderationLogTasks: Array<Promise<void>> = [
    logModerationCandidate({
      userId: user.id,
      contentType: "journey_title",
      relatedEntityId: journeyId,
      text: data.title,
    }),
  ];
  if (description) {
    moderationLogTasks.push(
      logModerationCandidate({
        userId: user.id,
        contentType: "journey_description",
        relatedEntityId: journeyId,
        text: description,
      })
    );
  }
  await Promise.allSettled(moderationLogTasks);

  revalidatePath("/journeys");
  return { success: true };
}

export interface UpdateJourneyData {
  id: string;
  title: string;
  description?: string;
  visibility: JourneyVisibility;
  status: JourneyStatus;
  completed_at?: string | null;
}

export async function updateJourney(data: UpdateJourneyData) {
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

  const description = data.description?.trim() ?? "";
  const [blockedTitle, blockedDescription] = await Promise.all([
    enforceTextModerationOrBlock({
      userId: user.id,
      contentType: "journey_title",
      relatedEntityId: data.id,
      text: data.title,
    }),
    description
      ? enforceTextModerationOrBlock({
          userId: user.id,
          contentType: "journey_description",
          relatedEntityId: data.id,
          text: description,
        })
      : Promise.resolve(null),
  ]);
  if (blockedTitle) return { error: blockedTitle.message, moderationBlock: blockedTitle.details };
  if (blockedDescription) return { error: blockedDescription.message, moderationBlock: blockedDescription.details };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  let query = supabase
    .from("journeys")
    .update({
      title: data.title.trim(),
      description: description || null,
      visibility: data.visibility,
      status: data.status,
      completed_at: data.status === "completed" ? (data.completed_at ?? new Date().toISOString()) : null,
    })
    .eq("id", data.id);

  if (!isAdmin) {
    query = query.eq("owner_id", user.id);
  }

  const { error } = await query;

  if (error) {
    console.error("Error updating journey:", error);
    return { error: "Failed to update journey" };
  }

  const moderationLogTasks: Array<Promise<void>> = [
    logModerationCandidate({
      userId: user.id,
      contentType: "journey_title",
      relatedEntityId: data.id,
      text: data.title,
    }),
  ];
  if (description) {
    moderationLogTasks.push(
      logModerationCandidate({
        userId: user.id,
        contentType: "journey_description",
        relatedEntityId: data.id,
        text: description,
      })
    );
  }
  await Promise.allSettled(moderationLogTasks);

  revalidatePath(`/journeys/${data.id}`);
  revalidatePath("/journeys");
  return { success: true };
}

export interface DeleteJourneyData {
  id: string;
}

export async function deleteJourney(data: DeleteJourneyData) {
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
    .from("journeys")
    .delete()
    .eq("id", data.id);

  if (!isAdmin) {
    query = query.eq("owner_id", user.id);
  }

  const { data: deletedJourney, error } = await query.select("id").maybeSingle();

  if (error) {
    console.error("Error deleting journey:", error);
    return { error: "Failed to delete journey" };
  }

  if (!deletedJourney) {
    return { error: "Journey not found or not authorized" };
  }

  revalidatePath(`/journeys/${data.id}`);
  revalidatePath("/journeys");
  revalidatePath("/search");
  return { success: true };
}
