import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getJourneyById } from "@/features/journeys/journeys.server";
import { getPostsByJourneyId } from "@/features/posts/posts.server";
import { EditJourneyDialog } from "@/features/journeys/components/EditJourneyDialog";
import { CreatePostDialog } from "@/features/posts/components/CreatePostDialog";
import { PostList } from "@/features/posts/components/PostList";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Globe, Lock, Link as LinkIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Journey Details | Internship Blog App",
};

interface JourneyPageProps {
  params: Promise<{ id: string }>;
}

async function JourneyContent({ id }: { id: string }) {
  const journey = await getJourneyById(id);

  if (!journey) {
    redirect("/journeys");
  }

  const posts = await getPostsByJourneyId(id);

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
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
          <Link href="/journeys">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Journeys
          </Link>
        </Button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{journey.title}</h1>
              <Badge variant="secondary" className="capitalize flex items-center whitespace-nowrap">
                {getVisibilityIcon()}
                {journey.visibility}
              </Badge>
            </div>
            {journey.description && (
              <p className="text-muted-foreground max-w-3xl">{journey.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <EditJourneyDialog journey={journey} />
            <CreatePostDialog journeyId={journey.id} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Posts</h2>
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
    <main className="container mx-auto py-8 px-4 max-w-4xl">
      <Suspense fallback={<JourneySkeleton />}>
        <JourneyContent id={id} />
      </Suspense>
    </main>
  );
}
