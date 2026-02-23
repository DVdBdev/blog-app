import { JourneyVisibility, PostStatus } from "@/types";

export const THEME_STORAGE_KEY = "theme";
export const DEFAULT_JOURNEY_VISIBILITY_KEY = "blogapp.default_journey_visibility";
export const DEFAULT_POST_STATUS_KEY = "blogapp.default_post_status";

export type ThemePreference = "system" | "light" | "dark";
const THEME_TRANSITION_CLASS = "theme-transition";
const THEME_TRANSITION_MS = 280;

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function getThemePreference(): ThemePreference {
  if (!canUseStorage()) {
    return "system";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return "system";
}

export function applyThemePreference(theme: ThemePreference) {
  if (!canUseStorage()) {
    return;
  }

  const root = document.documentElement;
  root.classList.add(THEME_TRANSITION_CLASS);

  if (theme === "system") {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    root.classList.toggle("dark", theme === "dark");
  }

  window.setTimeout(() => {
    root.classList.remove(THEME_TRANSITION_CLASS);
  }, THEME_TRANSITION_MS);
}

export function getDefaultJourneyVisibility(): JourneyVisibility {
  if (!canUseStorage()) {
    return "public";
  }

  const stored = window.localStorage.getItem(DEFAULT_JOURNEY_VISIBILITY_KEY);
  if (stored === "public" || stored === "unlisted" || stored === "private") {
    return stored;
  }
  return "public";
}

export function setDefaultJourneyVisibility(value: JourneyVisibility) {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(DEFAULT_JOURNEY_VISIBILITY_KEY, value);
}

export function getDefaultPostStatus(): PostStatus {
  if (!canUseStorage()) {
    return "draft";
  }

  const stored = window.localStorage.getItem(DEFAULT_POST_STATUS_KEY);
  if (stored === "draft" || stored === "published") {
    return stored;
  }
  return "draft";
}

export function setDefaultPostStatus(value: PostStatus) {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(DEFAULT_POST_STATUS_KEY, value);
}
