import { Suspense } from "react";
import { getPostById } from "@/features/posts/posts.server";
import { EditPostDialog } from "@/features/posts/components/EditPostDialog";
import { RichTextRenderer } from "@/features/posts/components/RichTextRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Post Details | Internship Blog App",
};

interface PostPageProps {
  params: Promise<{ id: string }>;
}

async function PostContent({ id }: { id: string }) {
  const post = await getPostById(id);

  if (!post) {
    return (
      <div className="text-center py-16 border rounded-lg bg-muted/20 border-dashed">
        <h2 className="text-2xl font-bold mb-2">Post not found</h2>
        <p className="text-muted-foreground mb-6">
          The post you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
        </p>
        <Button asChild>
          <Link href="/journeys">Back to Journeys</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
          <Link href={`/journeys/${post.journey_id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Journey
          </Link>
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Badge variant={post.status === "published" ? "default" : "secondary"} className="capitalize">
                {post.status}
              </Badge>
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                <span>
                  Created {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>
              {post.updated_at !== post.created_at && (
                <span className="italic">
                  (Updated {new Date(post.updated_at).toLocaleDateString()})
                </span>
              )}
            </div>
          </div>
          <EditPostDialog post={post} />
        </div>
      </div>

      <div className="border rounded-lg p-6 bg-card min-h-[300px]">
        <RichTextRenderer content={post.content} />
      </div>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;

  return (
    <main className="container mx-auto py-8 px-4 max-w-4xl">
      <Suspense fallback={<PostSkeleton />}>
        <PostContent id={id} />
      </Suspense>
    </main>
  );
}
