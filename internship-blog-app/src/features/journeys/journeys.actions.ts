"use server";

import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";
import { JourneyVisibility } from "@/types";

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
    },
  ]);

  if (error) {
    console.error("Error creating journey:", error);
    return { error: "Failed to create journey" };
  }

  revalidatePath("/journeys");
  return { success: true };
}
