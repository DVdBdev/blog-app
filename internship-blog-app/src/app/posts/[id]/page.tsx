import { Suspense } from "react";
import { getPostById } from "@/features/posts/posts.server";
import { EditPostDialog } from "@/features/posts/components/EditPostDialog";
import { DeletePostButton } from "@/features/posts/components/DeletePostButton";
import { RichTextRenderer } from "@/features/posts/components/RichTextRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays, User } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

interface PostPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  const { post } = await getPostById(id);
  return {
    title: post ? `${post.title} | Internship Blog App` : "Post | Internship Blog App",
  };
}

async function PostContent({ id }: { id: string }) {
  const { post, currentUserId } = await getPostById(id);

  if (!post) {
    return (
      <div className="empty-state">
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

  const isAuthor = !!currentUserId && currentUserId === post.author_id;
  const authorName = post.profiles?.display_name ?? post.profiles?.username;

  return (
    <div className="space-y-8">
      <div className="surface-card p-6">
        {isAuthor ? (
          <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
            <Link href={`/journeys/${post.journey_id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Journey
            </Link>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
            <Link href="/search?type=journeys">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Public Journeys
            </Link>
          </Button>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
          <div className="space-y-2">
            <p className="section-kicker w-fit">Post</p>
            <h1 className="text-3xl font-bold tracking-tight mt-1">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {/* Status badge is only meaningful / shown to the author */}
              {isAuthor && (
                <Badge
                  variant={post.status === "published" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {post.status}
                </Badge>
              )}
              {/* Author name shown to non-author viewers */}
              {!isAuthor && authorName && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{authorName}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                <span>Created {new Date(post.created_at).toLocaleDateString()}</span>
              </div>
              {post.updated_at !== post.created_at && (
                <span className="italic">
                  (Updated {new Date(post.updated_at).toLocaleDateString()})
                </span>
              )}
            </div>
          </div>
          {isAuthor && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="w-full md:w-auto">
                <EditPostDialog post={post} />
              </div>
              <div className="w-full md:w-auto flex md:block justify-end">
                <DeletePostButton postId={post.id} postTitle={post.title} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="surface-card p-6 min-h-[300px]">
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
    <main className="page-shell container mx-auto py-8 px-4 max-w-4xl">
      <Suspense fallback={<PostSkeleton />}>
        <PostContent id={id} />
      </Suspense>
    </main>
  );
}
