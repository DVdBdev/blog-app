import { createModerationPreview, type ModerationScanResult } from "./moderation.lib";

interface HuggingFaceLabelScore {
  label?: string;
  score?: number;
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
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return null;

  const model = process.env.HUGGINGFACE_MODERATION_MODEL ?? "unitary/toxic-bert";
  const threshold = parseThreshold();

  try {
    const response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!response.ok) {
      console.error("Hugging Face moderation request failed:", response.status, response.statusText);
      return null;
    }

    const json = (await response.json()) as unknown;
    const scores = extractScores(json);

    const flaggedLabels = scores
      .filter((entry) => {
        const label = typeof entry.label === "string" ? entry.label : "";
        const score = typeof entry.score === "number" ? entry.score : 0;
        return isUnsafeLabel(label) && score >= threshold;
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map((entry) => `${normalizeLabel(entry.label ?? "unknown")} (${(entry.score ?? 0).toFixed(2)})`);

    if (flaggedLabels.length === 0) return null;

    return {
      reason: `Hugging Face moderation flagged labels: ${flaggedLabels.join(", ")}`,
      preview: createModerationPreview(text),
    };
  } catch (error) {
    console.error("Hugging Face moderation request error:", error);
    return null;
  }
}
