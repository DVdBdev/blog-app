import { Journey } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Globe, Lock, Link as LinkIcon, UserRound } from "lucide-react";
import Link from "next/link";

interface JourneyCardProps {
  journey: Journey;
  ownerName?: string | null;
  ownerUsername?: string | null;
}

export function JourneyCard({ journey, ownerName, ownerUsername }: JourneyCardProps) {
  const status = journey.status ?? "active";
  const completedAt = journey.completed_at ? new Date(journey.completed_at) : null;
  const startedAt = new Date(journey.created_at);
  const dateRangeLabel =
    status === "completed" && completedAt
      ? `${startedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${completedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : `Since ${startedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const getVisibilityIcon = () => {
    switch (journey.visibility) {
      case "public":
        return <Globe className="h-3 w-3 mr-1" />;
      case "private":
        return <Lock className="h-3 w-3 mr-1" />;
      case "unlisted":
        return <LinkIcon className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <Card className="surface-card interactive-card hover:bg-muted/50 h-full flex flex-col relative group">
      <Link
        href={`/journeys/${journey.id}`}
        className="absolute inset-0 rounded-xl z-10"
        aria-label={`Open journey ${journey.title}`}
      />
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3 sm:gap-4">
          <CardTitle className="line-clamp-2 text-lg">{journey.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={status === "completed" ? "default" : "secondary"}
              className="capitalize whitespace-nowrap"
            >
              {status}
            </Badge>
            <Badge variant="secondary" className="capitalize flex items-center whitespace-nowrap">
              {getVisibilityIcon()}
              {journey.visibility}
            </Badge>
          </div>
        </div>
        {journey.description && (
          <CardDescription className="line-clamp-3 mt-2">
            {journey.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
        {ownerName ? (
          ownerUsername ? (
            <Link
              href={`/u/${ownerUsername}`}
              className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground transition-colors relative z-20"
            >
              <UserRound className="h-4 w-4" />
              By {ownerName}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground inline-flex items-center gap-1">
              <UserRound className="h-4 w-4" />
              By {ownerName}
            </p>
          )
        ) : null}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground flex items-center gap-2 border-t border-border/70 pt-4">
        <CalendarDays className="h-4 w-4" />
        <span>{dateRangeLabel}</span>
      </CardFooter>
    </Card>
  );
}
