"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import { deleteJourney } from "@/features/journeys/journeys.actions";

interface DeleteJourneyButtonProps {
  journeyId: string;
  journeyTitle: string;
}

export function DeleteJourneyButton({ journeyId, journeyTitle }: DeleteJourneyButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteJourney({ id: journeyId });
      if ("error" in result) {
        window.alert(result.error);
        return;
      }

      setOpen(false);
      router.push("/journeys");
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Delete journey"
          className="h-10 w-10 border-rose-500/55 bg-rose-500/16 text-rose-300 hover:bg-rose-500/24 hover:border-rose-400 hover:text-rose-200"
        >
          <Trash2 className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete journey?</DialogTitle>
          <DialogDescription>
            This will permanently delete "{journeyTitle}" and all posts inside it. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete journey"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
