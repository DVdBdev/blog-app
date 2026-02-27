import { createClient } from "@/services/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createModerationPreview, ModerationContentType, scanTextForModeration } from "./moderation.lib";
import { scanTextWithHuggingFaceModeration } from "./huggingface-moderation";
import { scanImageWithHuggingFaceModeration } from "./huggingface-image-moderation";

interface LogModerationCandidateInput {
  userId: string;
  contentType: ModerationContentType;
  relatedEntityId?: string | null;
  text: string;
}

interface LogImageModerationCandidateInput {
  userId: string;
  relatedEntityId?: string | null;
  imageUrl: string;
}

interface InsertModerationLogInput {
  userId: string;
  contentType: ModerationContentType;
  relatedEntityId?: string | null;
  reason: string;
  preview: string;
}

async function insertModerationLogEntry(
  input: InsertModerationLogInput,
  useServiceRole: boolean
): Promise<void> {
  const supabase = useServiceRole
    ? createSupabaseAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
    : await createClient();

  const { error } = await supabase.from("moderation_log").insert({
    user_id: input.userId,
    content_type: input.contentType,
    related_entity_id: input.relatedEntityId ?? null,
    flag_reason: input.reason,
    content_preview: input.preview,
    status: "pending",
  });

  if (error) {
    console.error("Error creating moderation log entry:", error);
  }
}

async function insertModerationLog(
  input: LogModerationCandidateInput,
  useServiceRole: boolean
): Promise<void> {
  const scan =
    (await scanTextWithHuggingFaceModeration(input.text)) ??
    scanTextForModeration(input.text);
  if (!scan) return;

  await insertModerationLogEntry(
    {
      userId: input.userId,
      contentType: input.contentType,
      relatedEntityId: input.relatedEntityId,
      reason: scan.reason,
      preview: scan.preview,
    },
    useServiceRole
  );
}

export async function logModerationCandidate(input: LogModerationCandidateInput): Promise<void> {
  await insertModerationLog(input, false);
}

export async function logModerationCandidateAsService(input: LogModerationCandidateInput): Promise<void> {
  await insertModerationLog(input, true);
}

export async function logImageModerationCandidate(
  input: LogImageModerationCandidateInput
): Promise<void> {
  const scan = await scanImageWithHuggingFaceModeration(input.imageUrl);
  if (!scan) return;

  await insertModerationLogEntry(
    {
      userId: input.userId,
      contentType: "post_image",
      relatedEntityId: input.relatedEntityId,
      reason: scan.reason,
      preview: scan.preview || createModerationPreview(`Image URL: ${input.imageUrl}`),
    },
    false
  );
}
