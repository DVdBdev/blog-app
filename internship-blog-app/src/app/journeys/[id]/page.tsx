import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getJourneyById } from "@/features/journeys/journeys.server";
import { getPostsByJourneyId } from "@/features/posts/posts.server";
import { EditJourneyDialog } from "@/features/journeys/components/EditJourneyDialog";
import { DeleteJourneyButton } from "@/features/journeys/components/DeleteJourneyButton";
import { CreatePostDialog } from "@/features/posts/components/CreatePostDialog";
import { PostList } from "@/features/posts/components/PostList";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Lock, Link as LinkIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

interface JourneyPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: JourneyPageProps): Promise<Metadata> {
  const { id } = await params;
  const { journey } = await getJourneyById(id);
  return {
    title: journey
      ? `${journey.title} | Internship Blog App`
      : "Journey | Internship Blog App",
  };
}

function getVisibilityIcon(visibility: string) {
  switch (visibility) {
    case "public":
      return <Globe className="h-3 w-3 mr-1" />;
    case "private":
      return <Lock className="h-3 w-3 mr-1" />;
    case "unlisted":
      return <LinkIcon className="h-3 w-3 mr-1" />;
    default:
      return null;
  }
}

async function JourneyContent({ id }: { id: string }) {
  const { journey, currentUserId } = await getJourneyById(id);

  if (!journey) {
    notFound();
  }

  const isOwner = !!currentUserId && currentUserId === journey.owner_id;

  // Owners see all posts; public viewers only see published posts.
  const posts = await getPostsByJourneyId(id, { publishedOnly: !isOwner });

  return (
    <div className="space-y-8">
      <div className="surface-card p-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mb-4 -ml-3 text-muted-foreground"
        >
          {isOwner ? (
            <Link href="/journeys">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to My Journeys
            </Link>
          ) : (
            <Link href="/search?type=journeys">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Public Journeys
            </Link>
          )}
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
          <div className="space-y-2">
            <p className="section-kicker w-fit">Journey</p>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight mt-1">{journey.title}</h1>
              {/* Visibility badge is only useful context for the owner */}
              {isOwner && (
                <Badge
                  variant="secondary"
                  className="capitalize flex items-center whitespace-nowrap"
                >
                  {getVisibilityIcon(journey.visibility)}
                  {journey.visibility}
                </Badge>
              )}
            </div>
            {journey.description && (
              <p className="text-muted-foreground max-w-3xl">{journey.description}</p>
            )}
          </div>

          {isOwner && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="w-full md:w-auto">
                <EditJourneyDialog journey={journey} />
              </div>
              <div className="w-full md:w-auto">
                <CreatePostDialog journeyId={journey.id} />
              </div>
              <div className="w-full md:w-auto flex md:block justify-end">
                <DeleteJourneyButton journeyId={journey.id} journeyTitle={journey.title} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <p className="section-kicker w-fit">Timeline</p>
        <h2 className="section-title">Posts</h2>
        <p className="section-subtitle">Chronological updates from this journey.</p>
        <PostList posts={posts} />
      </div>
    </div>
  );
}

function JourneySkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function JourneyPage({ params }: JourneyPageProps) {
  const { id } = await params;

  return (
    <main className="page-shell container mx-auto py-8 px-4 max-w-4xl">
      <Suspense fallback={<JourneySkeleton />}>
        <JourneyContent id={id} />
      </Suspense>
    </main>
  );
}
