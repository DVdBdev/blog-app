export type ModerationContentType =
  | "username"
  | "profile_bio"
  | "journey_title"
  | "journey_description"
  | "post_title"
  | "post_content"
  | "post_image";

export interface ModerationScanResult {
  reason: string;
  preview: string;
}

const FLAG_RULES: Array<{ regex: RegExp; reason: string }> = [
  { regex: /\bspam\b/i, reason: "Potential spam language" },
  { regex: /\bscam\b/i, reason: "Potential scam language" },
  { regex: /\bfraud\b/i, reason: "Potential fraudulent language" },
  { regex: /\bhate\b/i, reason: "Potential hate speech language" },
  { regex: /\bracist\b/i, reason: "Potential hate speech language" },
  { regex: /\bracism\b/i, reason: "Potential hate speech language" },
  { regex: /\bracial\s+slur\b/i, reason: "Potential hate speech language" },
  { regex: /\bwhite\s+supremac(y|ist)\b/i, reason: "Potential hate speech language" },
  { regex: /\bethnic\s+cleansing\b/i, reason: "Potential hate speech language" },
  { regex: /\bviolence\b/i, reason: "Potential violent language" },
  { regex: /\babuse\b/i, reason: "Potential abusive language" },
];

function normalizeForModeration(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getExtraKeywords(): string[] {
  const raw = process.env.MODERATION_EXTRA_KEYWORDS ?? "";
  return raw
    .split(",")
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length >= 2);
}

export function createModerationPreview(text: string, maxLength = 180): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}...`;
}

export function scanTextForModeration(text: string): ModerationScanResult | null {
  const normalized = normalizeForModeration(text);
  if (!normalized) return null;

  const matchedRule = FLAG_RULES.find((rule) => rule.regex.test(normalized));
  if (matchedRule) {
    return {
      reason: matchedRule.reason,
      preview: createModerationPreview(normalized),
    };
  }

  const lowered = normalized.toLowerCase();
  const customMatch = getExtraKeywords().find((term) => lowered.includes(term));
  if (!customMatch) return null;

  return {
    reason: "Potential policy keyword match",
    preview: createModerationPreview(normalized),
  };
}

export function extractRichTextContent(content: unknown): string {
  const chunks: string[] = [];

  const walk = (node: unknown) => {
    if (!node) return;
    if (typeof node === "string") {
      chunks.push(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (typeof node === "object") {
      const typed = node as { text?: unknown; content?: unknown; attrs?: Record<string, unknown> };
      if (typeof typed.text === "string") {
        chunks.push(typed.text);
      }
      if (typed.attrs) {
        const attrsText = Object.values(typed.attrs)
          .filter((value): value is string => typeof value === "string")
          .join(" ");
        if (attrsText) chunks.push(attrsText);
      }
      walk(typed.content);
    }
  };

  walk(content);
  return chunks.join(" ").replace(/\s+/g, " ").trim();
}

export function extractImageUrlsFromRichText(content: unknown): string[] {
  const urls = new Set<string>();

  const walk = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (typeof node === "object") {
      const typed = node as {
        type?: unknown;
        attrs?: Record<string, unknown>;
        content?: unknown;
      };

      if (typed.type === "image") {
        const src = typed.attrs?.src;
        if (typeof src === "string" && /^https?:\/\//i.test(src)) {
          urls.add(src);
        }
      }

      walk(typed.content);
    }
  };

  walk(content);
  return [...urls];
}
