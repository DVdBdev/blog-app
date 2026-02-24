import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, BookOpen, Map } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getProfileByUsername,
  getPublicJourneysByOwner,
} from "@/features/journeys/journeys.public.server";
import { PublicJourneyList } from "@/features/journeys/components/PublicJourneyList";
import { ContributionHeatmap } from "@/features/profiles/components/ContributionHeatmap";
import { ProfileDetailsCard } from "@/features/profiles/components/ProfileDetailsCard";
import { getDailyPostContributionsByAuthor } from "@/features/posts/posts.server";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  const name = profile?.display_name ?? profile?.username ?? username;

  return {
    title: profile
      ? `${name} | Public Profile`
      : "Public Profile | Internship Blog App",
  };
}

async function PublicProfileContent({ username }: { username: string }) {
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  const journeys = await getPublicJourneysByOwner(profile.id);
  const contributions = await getDailyPostContributionsByAuthor(profile.id, {
    publishedOnly: true,
  });
  const todayIso = new Date().toISOString().slice(0, 10);
  const featuredJourneys = journeys.slice(0, 3);
  const displayName = profile.display_name ?? profile.username;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </Button>

      <Card className="surface-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>

            <div className="space-y-1 flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {profile.bio || "No bio yet."}
              </p>
            </div>

            <div className="w-full sm:w-auto grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border border-border/70 bg-card/80 px-3 py-2">
                <p className="text-muted-foreground text-xs">Public journeys</p>
                <p className="font-semibold">{journeys.length}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-card/80 px-3 py-2">
                <p className="text-muted-foreground text-xs">Contributions (1Y)</p>
                <p className="font-semibold">{contributions.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-1">
          <ProfileDetailsCard profile={profile} />
        </div>

        <section className="space-y-4 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="section-title flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Public Journeys
              </h2>
              <p className="text-sm text-muted-foreground">
                {journeys.length === 0
                  ? "No public journeys shared yet."
                  : `${journeys.length} public journey${journeys.length === 1 ? "" : "s"}`}
              </p>
            </div>

            <Button variant="outline" asChild>
              <Link href={`/u/${profile.username}/journeys`}>View all journeys</Link>
            </Button>
          </div>

          <PublicJourneyList journeys={featuredJourneys} ownerName={displayName} />
        </section>
      </div>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="section-title flex items-center gap-2">
            <Map className="h-5 w-5" />
            Public Contribution Activity
          </h2>
        </div>
      </section>

      <ContributionHeatmap
        contributions={contributions}
        title="Activity Over Time"
        todayIso={todayIso}
      />
    </div>
  );
}

function PublicProfileSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-32" />

      <Card className="surface-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Skeleton className="h-20 w-20 rounded-full" />

            <div className="space-y-2 flex-1 w-full">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full max-w-2xl mt-2" />
            </div>

            <div className="w-full sm:w-auto grid grid-cols-2 gap-2">
              <Skeleton className="h-16 w-full sm:w-32 rounded-md" />
              <Skeleton className="h-16 w-full sm:w-32 rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-1">
          <Card className="surface-card">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-28" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <section className="space-y-4 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-44" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="surface-card">
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
        </div>
      </section>

      <Card className="surface-card">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="grid grid-cols-7 gap-2">
            {[...Array(14)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-full rounded-sm" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;

  return (
    <main className="page-shell container mx-auto py-8 px-4 max-w-5xl">
      <Suspense fallback={<PublicProfileSkeleton />}>
        <PublicProfileContent username={username} />
      </Suspense>
    </main>
  );
}
