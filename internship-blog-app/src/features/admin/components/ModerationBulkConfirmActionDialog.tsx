"use client";

import { FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ModerationBulkConfirmActionDialogProps {
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
  title: string;
  description: string;
  submitLabel: string;
  sourceFormId: string;
  disabled?: boolean;
}

export function ModerationBulkConfirmActionDialog({
  action,
  title,
  description,
  submitLabel,
  sourceFormId,
  disabled,
}: ModerationBulkConfirmActionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sourceForm = document.getElementById(sourceFormId) as HTMLFormElement | null;
    if (!sourceForm) {
      setError("Bulk selection form is unavailable.");
      return;
    }

    const formData = new FormData(sourceForm);
    formData.set("confirm", "yes");

    startTransition(async () => {
      setError(null);
      const result = await action(formData);
      if (result?.success) {
        setOpen(false);
        return;
      }
      setError(result?.error ?? "Action failed");
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="destructive" disabled={disabled}>
          {submitLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
