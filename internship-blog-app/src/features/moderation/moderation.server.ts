import { createClient } from "@/services/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createModerationPreview, ModerationContentType, scanTextForModeration } from "./moderation.lib";
import { scanTextWithHuggingFaceModeration } from "./huggingface-moderation";
import { scanImageWithHuggingFaceModeration } from "./huggingface-image-moderation";
import { getImageModerationBlockDetails, getTextModerationBlockDetails, type ModerationBlockDetails } from "./moderation.policy";

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

interface EnforceTextModerationInput {
  userId: string;
  contentType: ModerationContentType;
  text: string;
  relatedEntityId?: string | null;
}

interface EnforceImageModerationInput {
  userId: string;
  contentType: ModerationContentType;
  imageUrl: string;
  relatedEntityId?: string | null;
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

export interface ModerationBlockResponse {
  message: string;
  details: ModerationBlockDetails;
}

function formatBlockMessage(details: ModerationBlockDetails) {
  const confidence = Math.round(details.confidence * 100);
  const threshold = Math.round(details.threshold * 100);
  return `Your content was blocked by moderation (${confidence}% confidence, threshold ${threshold}%).`;
}

export async function enforceTextModerationOrBlock(
  input: EnforceTextModerationInput
): Promise<ModerationBlockResponse | null> {
  const details = await getTextModerationBlockDetails(input.contentType, input.text);
  if (!details) return null;

  await insertModerationLogEntry(
    {
      userId: input.userId,
      contentType: input.contentType,
      relatedEntityId: input.relatedEntityId,
      reason: details.reason,
      preview: createModerationPreview(input.text),
    },
    false
  );

  return {
    message: formatBlockMessage(details),
    details,
  };
}

export async function enforceImageModerationOrBlock(
  input: EnforceImageModerationInput
): Promise<ModerationBlockResponse | null> {
  const details = await getImageModerationBlockDetails(input.contentType, input.imageUrl);
  if (!details) return null;

  await insertModerationLogEntry(
    {
      userId: input.userId,
      contentType: input.contentType,
      relatedEntityId: input.relatedEntityId,
      reason: details.reason,
      preview: createModerationPreview(`Image URL: ${input.imageUrl}`),
    },
    false
  );

  return {
    message: formatBlockMessage(details),
    details,
  };
}

async function insertModerationLog(
  input: LogModerationCandidateInput,
  useServiceRole: boolean
): Promise<void> {
  const hfScan = await scanTextWithHuggingFaceModeration(input.text);
  const localScan = hfScan ? null : scanTextForModeration(input.text);
  const scan = hfScan ?? localScan;
  if (!scan) return;

  const reason =
    localScan && !/\(\d\.\d{2}\)/.test(localScan.reason)
      ? `${localScan.reason} (local rule 1.00)`
      : scan.reason;

  await insertModerationLogEntry(
    {
      userId: input.userId,
      contentType: input.contentType,
      relatedEntityId: input.relatedEntityId,
      reason,
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
