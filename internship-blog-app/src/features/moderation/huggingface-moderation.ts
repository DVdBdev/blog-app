import { createModerationPreview, type ModerationScanResult } from "./moderation.lib";

interface HuggingFaceLabelScore {
  label?: string;
  score?: number;
}

export interface HuggingFaceModerationLabel {
  label: string;
  normalizedLabel: string;
  score: number;
  unsafe: boolean;
}

export interface HuggingFaceModerationDetailedResult {
  model: string;
  labels: HuggingFaceModerationLabel[];
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === "AbortError") ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === 20)
  );
}

function parseThreshold(): number {
  const parsed = Number(process.env.HUGGINGFACE_MODERATION_THRESHOLD ?? "0.7");
  if (Number.isNaN(parsed)) return 0.7;
  return Math.min(1, Math.max(0, parsed));
}

function normalizeLabel(label: string): string {
  return label.toLowerCase().replaceAll("_", " ").replaceAll("-", " ");
}

function isUnsafeLabel(label: string): boolean {
  const normalized = normalizeLabel(label);
  const unsafeTerms = [
    "toxic",
    "severe toxic",
    "obscene",
    "identity hate",
    "insult",
    "threat",
    "hate",
    "violence",
    "harassment",
    "abuse",
  ];
  return unsafeTerms.some((term) => normalized.includes(term));
}

function extractScores(payload: unknown): HuggingFaceLabelScore[] {
  if (!Array.isArray(payload)) return [];

  if (payload.length > 0 && Array.isArray(payload[0])) {
    return payload[0] as HuggingFaceLabelScore[];
  }

  return payload as HuggingFaceLabelScore[];
}

export async function scanTextWithHuggingFaceModeration(
  text: string
): Promise<ModerationScanResult | null> {
  const detailed = await scanTextWithHuggingFaceModerationDetailed(text);
  if (!detailed) return null;

  const threshold = parseThreshold();

  const flaggedLabels = detailed.labels
    .filter((entry) => entry.unsafe && entry.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map((entry) => `${entry.normalizedLabel} (${entry.score.toFixed(2)})`);

  if (flaggedLabels.length === 0) return null;

  return {
    reason: `Hugging Face moderation flagged labels: ${flaggedLabels.join(", ")}`,
    preview: createModerationPreview(text),
  };
}

function moderationRequestTimeoutMs(): number {
  const parsed = Number(process.env.HUGGINGFACE_MODERATION_TIMEOUT_MS ?? "5000");
  if (Number.isNaN(parsed) || parsed <= 0) return 5000;
  return parsed;
}

export async function scanTextWithHuggingFaceModerationDetailed(
  text: string
): Promise<HuggingFaceModerationDetailedResult | null> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return null;

  const model = process.env.HUGGINGFACE_MODERATION_MODEL ?? "unitary/toxic-bert";
  const timeoutMs = moderationRequestTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ inputs: text }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error("Hugging Face moderation request failed:", response.status, response.statusText);
      return null;
    }

    const json = (await response.json()) as unknown;
    const scores = extractScores(json);

    const labels: HuggingFaceModerationLabel[] = scores
      .map((entry) => {
        const label = typeof entry.label === "string" ? entry.label : "unknown";
        const normalizedLabel = normalizeLabel(label);
        const score = typeof entry.score === "number" ? entry.score : 0;
        return {
          label,
          normalizedLabel,
          score,
          unsafe: isUnsafeLabel(label),
        };
      })
      .sort((a, b) => b.score - a.score);

    return { model, labels };
  } catch (error) {
    clearTimeout(timeout);
    if (isAbortError(error)) {
      return null;
    }
    console.error("Hugging Face moderation request error:", error);
    return null;
  }
}
