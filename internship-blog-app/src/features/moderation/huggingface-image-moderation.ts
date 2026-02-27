import { createModerationPreview, type ModerationScanResult } from "./moderation.lib";

interface HuggingFaceImageLabelScore {
  label?: string;
  score?: number;
}

function parseThreshold(): number {
  const parsed = Number(process.env.HUGGINGFACE_IMAGE_MODERATION_THRESHOLD ?? "0.7");
  if (Number.isNaN(parsed)) return 0.7;
  return Math.min(1, Math.max(0, parsed));
}

function normalizeLabel(label: string): string {
  return label.toLowerCase().replaceAll("_", " ").replaceAll("-", " ");
}

function isUnsafeImageLabel(label: string): boolean {
  const normalized = normalizeLabel(label);
  const unsafeTerms = ["nsfw", "porn", "hentai", "nudity", "explicit", "sexual"];
  return unsafeTerms.some((term) => normalized.includes(term));
}

function extractScores(payload: unknown): HuggingFaceImageLabelScore[] {
  if (!Array.isArray(payload)) return [];

  if (payload.length > 0 && Array.isArray(payload[0])) {
    return payload[0] as HuggingFaceImageLabelScore[];
  }

  return payload as HuggingFaceImageLabelScore[];
}

export async function scanImageWithHuggingFaceModeration(
  imageUrl: string
): Promise<ModerationScanResult | null> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return null;

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    console.error("Failed to fetch image for moderation:", imageResponse.status, imageResponse.statusText);
    return null;
  }

  const contentType = imageResponse.headers.get("content-type") ?? "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    return null;
  }

  const model = process.env.HUGGINGFACE_IMAGE_MODERATION_MODEL ?? "Falconsai/nsfw_image_detection";
  const threshold = parseThreshold();

  try {
    const response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": contentType,
      },
      body: await imageResponse.arrayBuffer(),
    });

    if (!response.ok) {
      console.error(
        "Hugging Face image moderation request failed:",
        response.status,
        response.statusText
      );
      return null;
    }

    const json = (await response.json()) as unknown;
    const scores = extractScores(json);

    const flaggedLabels = scores
      .filter((entry) => {
        const label = typeof entry.label === "string" ? entry.label : "";
        const score = typeof entry.score === "number" ? entry.score : 0;
        return isUnsafeImageLabel(label) && score >= threshold;
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map((entry) => `${normalizeLabel(entry.label ?? "unknown")} (${(entry.score ?? 0).toFixed(2)})`);

    if (flaggedLabels.length === 0) return null;

    return {
      reason: `Hugging Face image moderation flagged labels: ${flaggedLabels.join(", ")}`,
      preview: createModerationPreview(`Image URL: ${imageUrl}`),
    };
  } catch (error) {
    console.error("Hugging Face image moderation request error:", error);
    return null;
  }
}
