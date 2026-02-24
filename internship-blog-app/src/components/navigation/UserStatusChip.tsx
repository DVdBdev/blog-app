"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type PresenceStatus = "online" | "away" | "offline";

const STATUS_ORDER: PresenceStatus[] = ["online", "away", "offline"];
const STORAGE_KEY = "presence_status";

const STATUS_META: Record<
  PresenceStatus,
  { label: string; hint: string; dotClass: string; chipClass: string }
> = {
  online: {
    label: "Online",
    hint: "shipping features",
    dotClass: "bg-emerald-500",
    chipClass: "border-emerald-500/30 text-emerald-300",
  },
  away: {
    label: "Away",
    hint: "coffee + ideas",
    dotClass: "bg-amber-400",
    chipClass: "border-amber-400/30 text-amber-300",
  },
  offline: {
    label: "Offline",
    hint: "deep work cave",
    dotClass: "bg-slate-400",
    chipClass: "border-slate-400/30 text-slate-300",
  },
};

function nextStatus(current: PresenceStatus): PresenceStatus {
  const index = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(index + 1) % STATUS_ORDER.length];
}

export function UserStatusChip() {
  const [status, setStatus] = useState<PresenceStatus>(() => {
    if (typeof window === "undefined") return "online";
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "online" || stored === "away" || stored === "offline"
      ? stored
      : "online";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, status);
  }, [status]);

  const meta = useMemo(() => STATUS_META[status], [status]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setStatus((prev) => nextStatus(prev))}
      className={`hidden md:inline-flex h-8 gap-2 rounded-full border bg-background/40 px-2.5 text-xs transition-colors ${meta.chipClass}`}
      title={`Status: ${meta.label} (${meta.hint}). Click to cycle.`}
    >
      <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
      <span>{meta.label}</span>
    </Button>
  );
}
