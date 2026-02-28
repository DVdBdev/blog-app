"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ModerationBlockDetails {
  reason: string;
  confidence: number;
  threshold: number;
  labels: string[];
}

interface ModerationBlockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: ModerationBlockDetails | null;
}

export function ModerationBlockedDialog({
  open,
  onOpenChange,
  details,
}: ModerationBlockedDialogProps) {
  if (!details) return null;

  const confidence = Math.round(details.confidence * 100);
  const threshold = Math.round(details.threshold * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Content Blocked</DialogTitle>
          <DialogDescription>
            Your content was not saved because it triggered moderation thresholds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <p>
            Confidence: <span className="font-medium">{confidence}%</span> | Threshold:{" "}
            <span className="font-medium">{threshold}%</span>
          </p>
          <p className="text-muted-foreground">{details.reason}</p>
          {details.labels.length > 0 ? (
            <ul className="list-disc pl-5 text-muted-foreground">
              {details.labels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

