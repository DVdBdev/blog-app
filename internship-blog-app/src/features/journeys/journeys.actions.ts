"use server";

import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";
import { JourneyStatus, JourneyVisibility } from "@/types";

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

  if (!data.title || data.title.trim() === "") {
    return { error: "Title is required" };
  }

  const { error } = await supabase.from("journeys").insert([
    {
      owner_id: user.id,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      visibility: data.visibility,
      status: "active",
      completed_at: null,
    },
  ]);

  if (error) {
    console.error("Error creating journey:", error);
    return { error: "Failed to create journey" };
  }

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

  if (!data.title || data.title.trim() === "") {
    return { error: "Title is required" };
  }

  const { error } = await supabase
    .from("journeys")
    .update({
      title: data.title.trim(),
      description: data.description?.trim() || null,
      visibility: data.visibility,
      status: data.status,
      completed_at: data.status === "completed" ? (data.completed_at ?? new Date().toISOString()) : null,
    })
    .eq("id", data.id)
    .eq("owner_id", user.id);

  if (error) {
    console.error("Error updating journey:", error);
    return { error: "Failed to update journey" };
  }

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

  const { data: deletedJourney, error } = await supabase
    .from("journeys")
    .delete()
    .eq("id", data.id)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

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
