import { Journey } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Globe, Lock, Link as LinkIcon } from "lucide-react";
import Link from "next/link";

interface JourneyCardProps {
  journey: Journey;
}

export function JourneyCard({ journey }: JourneyCardProps) {
  const formattedDate = new Date(journey.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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
    <Link href={`/journeys/${journey.id}`} className="group block h-full">
      <Card className="surface-card interactive-card hover:bg-muted/50 h-full flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <CardTitle className="line-clamp-2 text-lg">{journey.title}</CardTitle>
            <Badge variant="secondary" className="capitalize flex items-center whitespace-nowrap">
              {getVisibilityIcon()}
              {journey.visibility}
            </Badge>
          </div>
          {journey.description && (
            <CardDescription className="line-clamp-3 mt-2">
              {journey.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex-grow" />
        <CardFooter className="text-sm text-muted-foreground flex items-center gap-2 border-t border-border/70 pt-4">
          <CalendarDays className="h-4 w-4" />
          <span>Started {formattedDate}</span>
        </CardFooter>
      </Card>
    </Link>
  );
}
