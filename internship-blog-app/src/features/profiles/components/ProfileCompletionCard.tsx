"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { Profile } from "@/types";

interface ProfileCompletionCardProps {
  profile: Profile;
  hasAtLeastOnePost: boolean;
}

interface CompletionTask {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  actionType: "open-editor" | "link";
  actionHref?: string;
  actionLabel: string;
}

function hasValue(value: string | null | undefined) {
  return !!value && value.trim().length > 0;
}

export function ProfileCompletionCard({
  profile,
  hasAtLeastOnePost,
}: ProfileCompletionCardProps) {
  const tasks: CompletionTask[] = [
    {
      id: "avatar",
      label: "Add a profile photo",
      description: "A recognizable avatar helps people trust and remember your profile.",
      completed: hasValue(profile.avatar_url),
      actionType: "open-editor",
      actionLabel: "Edit profile",
    },
    {
      id: "bio",
      label: "Write a short bio",
      description: "Summarize your internship focus and what you are working on.",
      completed: hasValue(profile.bio),
      actionType: "open-editor",
      actionLabel: "Add bio",
    },
    {
      id: "links",
      label: "Add at least one social link",
      description: "Include GitHub, LinkedIn, or a personal website for stronger credibility.",
      completed:
        hasValue(profile.github_url) ||
        hasValue(profile.linkedin_url) ||
        hasValue(profile.website_url),
      actionType: "open-editor",
      actionLabel: "Add links",
    },
    {
      id: "details",
      label: "Fill one profile detail",
      description: "Company, field, education, or location gives better context about you.",
      completed:
        hasValue(profile.company) ||
        hasValue(profile.field_domain) ||
        hasValue(profile.education) ||
        hasValue(profile.location),
      actionType: "open-editor",
      actionLabel: "Add details",
    },
    {
      id: "first-post",
      label: "Publish your first post",
      description: "Start documenting your experience to make your profile more useful.",
      completed: hasAtLeastOnePost,
      actionType: "link",
      actionHref: "/journeys",
      actionLabel: "Create post",
    },
  ];

  const openEditor = () => {
    window.dispatchEvent(new CustomEvent("open-edit-profile-modal"));
  };

  const completedCount = tasks.filter((task) => task.completed).length;
  const progress = Math.round((completedCount / tasks.length) * 100);
  const nextTask = tasks.find((task) => !task.completed) ?? null;
  const isComplete = completedCount === tasks.length;

  if (isComplete) {
    return (
      <Card className="surface-card">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Profile Complete</CardTitle>
            <Badge variant="default">100%</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <div className="flex min-w-0 items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p className="min-w-0 text-sm text-foreground break-words">
                Nice work. Your profile is fully set up and ready for visitors.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="surface-card">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Profile Completion</CardTitle>
          <Badge variant={progress === 100 ? "default" : "secondary"}>
            {completedCount}/{tasks.length} complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-amber-500 via-emerald-500 to-emerald-600 transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground whitespace-nowrap">{progress}%</p>
        </div>

        {nextTask ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Next Best Action
            </p>
            <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{nextTask.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{nextTask.description}</p>
              </div>
              {nextTask.actionType === "open-editor" ? (
                <Button variant="outline" size="sm" onClick={openEditor} className="w-full sm:w-auto">
                  {nextTask.actionLabel}
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                  <Link href={nextTask.actionHref ?? "/journeys"}>{nextTask.actionLabel}</Link>
                </Button>
              )}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-md border border-border/70 bg-card/80 px-3 py-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {task.completed ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <CircleDashed className="h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{task.label}</p>
                    {!task.completed ? (
                      <p className="text-xs text-muted-foreground">{task.description}</p>
                    ) : null}
                  </div>
                </div>

                {!task.completed ? (
                  task.actionType === "open-editor" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 sm:h-7 px-2 text-xs shrink-0 w-full sm:w-auto"
                      onClick={openEditor}
                    >
                      {task.actionLabel}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" asChild className="h-8 sm:h-7 px-2 text-xs shrink-0 w-full sm:w-auto">
                      <Link href={task.actionHref ?? "/journeys"}>{task.actionLabel}</Link>
                    </Button>
                  )
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
