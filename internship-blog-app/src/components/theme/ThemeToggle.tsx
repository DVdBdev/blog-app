"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyThemePreference } from "@/lib/user-preferences";

export function ThemeToggle() {
  function handleToggle() {
    const isDark = document.documentElement.classList.contains("dark");
    applyThemePreference(isDark ? "light" : "dark");
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={handleToggle}>
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  );
}
