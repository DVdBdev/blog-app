import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getProfileByUsername,
  getPublicJourneysByOwner,
} from "@/features/journeys/journeys.public.server";
import { PublicJourneyList } from "@/features/journeys/components/PublicJourneyList";
import type { Metadata } from "next";

interface UserJourneysPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: UserJourneysPageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  const name = profile?.display_name ?? profile?.username ?? username;
  return {
    title: profile
      ? `${name}'s Journeys | Internship Blog App`
      : "Journeys | Internship Blog App",
  };
}

async function UserJourneysContent({ username }: { username: string }) {
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  const journeys = await getPublicJourneysByOwner(profile.id);
  const displayName = profile.display_name ?? profile.username;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="-ml-3 text-muted-foreground"
      >
        <Link href={`/u/${profile.username}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Profile
        </Link>
      </Button>

      {/* Author header */}
      <div className="surface-card p-4 sm:p-5 flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
          <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{displayName}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>
      </div>

      {/* Section header */}
      <div className="space-y-1">
        <h2 className="section-title">Public Journeys</h2>
        <p className="text-sm text-muted-foreground">
          {journeys.length === 0
            ? "No public journeys shared yet."
            : `${journeys.length} journey${journeys.length === 1 ? "" : "s"} shared publicly`}
        </p>
      </div>

      <PublicJourneyList journeys={journeys} ownerName={displayName} />
    </div>
  );
}

function UserJourneysSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-28" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="space-y-1">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default async function UserJourneysPage({ params }: UserJourneysPageProps) {
  const { username } = await params;

  return (
    <main className="page-shell container mx-auto py-6 sm:py-8 px-4 max-w-5xl">
      <Suspense fallback={<UserJourneysSkeleton />}>
        <UserJourneysContent username={username} />
      </Suspense>
    </main>
  );
}
