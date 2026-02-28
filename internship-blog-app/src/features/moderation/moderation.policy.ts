import { createModerationPreview, scanTextForModeration, type ModerationContentType } from "./moderation.lib";
import { scanImageWithHuggingFaceModerationDetailed } from "./huggingface-image-moderation";
import { scanTextWithHuggingFaceModerationDetailed } from "./huggingface-moderation";

export interface ModerationBlockDetails {
  contentType: ModerationContentType;
  source: "text" | "image";
  reason: string;
  confidence: number;
  threshold: number;
  labels: string[];
}

const MODERATION_DEBUG_LOGS = process.env.MODERATION_DEBUG_LOGS === "true";

function debugModerationLog(event: string, payload: Record<string, string | number | boolean | null>) {
  if (!MODERATION_DEBUG_LOGS) return;
  console.info(`[moderation-debug] ${event} ${JSON.stringify(payload)}`);
}

function parseThreshold(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? `${fallback}`);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

function generalTextThreshold() {
  return parseThreshold(process.env.HUGGINGFACE_MODERATION_BLOCK_THRESHOLD, 0.9);
}

function severeTextThreshold() {
  return parseThreshold(process.env.HUGGINGFACE_MODERATION_BLOCK_THRESHOLD_SEVERE, 0.8);
}

function imageThreshold() {
  return parseThreshold(process.env.HUGGINGFACE_IMAGE_BLOCK_THRESHOLD, 0.9);
}

function isSevereLabel(label: string) {
  const normalized = label.toLowerCase();
  return (
    normalized.includes("severe toxic") ||
    normalized.includes("identity hate") ||
    normalized.includes("threat") ||
    normalized.includes("violence")
  );
}

export async function getTextModerationBlockDetails(
  contentType: ModerationContentType,
  text: string
): Promise<ModerationBlockDetails | null> {
  const localScan = scanTextForModeration(text);
  const hfDetailed = await scanTextWithHuggingFaceModerationDetailed(text);

  if (!hfDetailed) {
    if (!localScan) {
      debugModerationLog("text_block", {
        contentType,
        source: "huggingface_unavailable",
        blocked: false,
        confidence: 0,
        threshold: generalTextThreshold(),
      });
      return null;
    }
    debugModerationLog("text_block", {
      contentType,
      source: "local_fallback",
      blocked: true,
      confidence: 1,
      threshold: 1,
    });
    return {
      contentType,
      source: "text",
      reason: `${localScan.reason} (local fallback)`,
      confidence: 1,
      threshold: 1,
      labels: [createModerationPreview(localScan.preview)],
    };
  }

  const general = generalTextThreshold();
  const severe = severeTextThreshold();

  const matched = hfDetailed.labels
    .filter((entry) => entry.unsafe)
    .filter((entry) => {
      const threshold = isSevereLabel(entry.normalizedLabel) ? severe : general;
      return entry.score >= threshold;
    })
    .sort((a, b) => b.score - a.score);

  if (matched.length === 0) {
    debugModerationLog("text_block", {
      contentType,
      source: "huggingface",
      blocked: false,
      confidence: 0,
      threshold: general,
    });
    return null;
  }

  const strongest = matched[0];
  const threshold = isSevereLabel(strongest.normalizedLabel) ? severe : general;
  const labels = matched.map((entry) => `${entry.normalizedLabel} (${entry.score.toFixed(2)})`);

  debugModerationLog("text_block", {
    contentType,
    source: "huggingface",
    blocked: true,
    confidence: strongest.score,
    threshold,
  });
  return {
    contentType,
    source: "text",
    reason: `Hugging Face moderation blocked labels: ${labels.join(", ")}`,
    confidence: strongest.score,
    threshold,
    labels,
  };
}

export async function getImageModerationBlockDetails(
  contentType: ModerationContentType,
  imageUrl: string
): Promise<ModerationBlockDetails | null> {
  const hfDetailed = await scanImageWithHuggingFaceModerationDetailed(imageUrl);
  if (!hfDetailed) {
    debugModerationLog("image_block", {
      contentType,
      source: "huggingface_unavailable",
      blocked: false,
      confidence: 0,
      threshold: imageThreshold(),
    });
    return null;
  }

  const threshold = imageThreshold();
  const matched = hfDetailed.labels
    .filter((entry) => entry.unsafe && entry.score >= threshold)
    .sort((a, b) => b.score - a.score);

  if (matched.length === 0) {
    debugModerationLog("image_block", {
      contentType,
      source: "huggingface",
      blocked: false,
      confidence: 0,
      threshold,
    });
    return null;
  }

  const labels = matched.map((entry) => `${entry.normalizedLabel} (${entry.score.toFixed(2)})`);

  debugModerationLog("image_block", {
    contentType,
    source: "huggingface",
    blocked: true,
    confidence: matched[0].score,
    threshold,
  });
  return {
    contentType,
    source: "image",
    reason: `Hugging Face image moderation blocked labels: ${labels.join(", ")}`,
    confidence: matched[0].score,
    threshold,
    labels,
  };
}
