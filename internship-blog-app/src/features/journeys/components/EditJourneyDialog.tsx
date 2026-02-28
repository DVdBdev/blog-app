"use client";

import { useState } from "react";
import { Journey, JourneyStatus, JourneyVisibility } from "@/types";
import { updateJourney, UpdateJourneyData } from "../journeys.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil } from "lucide-react";
import { ModerationBlockedDialog } from "@/features/moderation/components/ModerationBlockedDialog";

interface EditJourneyDialogProps {
  journey: Journey;
}

interface ModerationBlockDetails {
  reason: string;
  confidence: number;
  threshold: number;
  labels: string[];
}

export function EditJourneyDialog({ journey }: EditJourneyDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [moderationDialogOpen, setModerationDialogOpen] = useState(false);
  const [moderationBlock, setModerationBlock] = useState<ModerationBlockDetails | null>(null);

  const [formData, setFormData] = useState<UpdateJourneyData>({
    id: journey.id,
    title: journey.title,
    description: journey.description || "",
    visibility: journey.visibility,
    status: journey.status ?? "active",
    completed_at: journey.completed_at ?? null,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: UpdateJourneyData) => ({ ...prev, [name]: value }));
  };

  const handleVisibilityChange = (value: JourneyVisibility) => {
    setFormData((prev: UpdateJourneyData) => ({ ...prev, visibility: value }));
  };

  const handleStatusChange = (value: JourneyStatus) => {
    setFormData((prev: UpdateJourneyData) => ({
      ...prev,
      status: value,
      completed_at:
        value === "completed"
          ? (prev.completed_at ?? new Date().toISOString())
          : null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateJourney(formData);
      if (result.error) {
        setError(result.error);
        if ("moderationBlock" in result && result.moderationBlock) {
          setModerationBlock(result.moderationBlock as ModerationBlockDetails);
          setModerationDialogOpen(true);
        }
      } else {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 1500);
      }
    } catch (err) {
      console.error("Error updating journey:", err);
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Pencil className="h-4 w-4" />
          Edit Journey
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Journey</DialogTitle>
          <DialogDescription>
            Update the details of your journey.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-green-50 text-green-900 border-green-200">
              <AlertDescription>Journey updated successfully!</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
              className="resize-none"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              value={formData.visibility}
              onValueChange={handleVisibilityChange}
            >
              <SelectTrigger id="visibility">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public (Visible to everyone)</SelectItem>
                <SelectItem value="unlisted">Unlisted (Anyone with the link)</SelectItem>
                <SelectItem value="private">Private (Only you)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Journey status</Label>
            <Select
              value={formData.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.title.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <ModerationBlockedDialog
        open={moderationDialogOpen}
        onOpenChange={setModerationDialogOpen}
        details={moderationBlock}
      />
    </Dialog>
  );
}
