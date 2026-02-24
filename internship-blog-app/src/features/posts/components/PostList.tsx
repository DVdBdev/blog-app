import { Post } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, FileText } from "lucide-react";
import Link from "next/link";

interface PostListProps {
  posts: Post[];
}

export function PostList({ posts }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Start documenting your journey by creating your first post.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 timeline-list stagger-list">
      {posts.map((post) => (
        <Link key={post.id} href={`/posts/${post.id}`} className="group block">
          <Card className="surface-card interactive-card hover:bg-muted/50 timeline-item">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3 sm:gap-4">
                <CardTitle className="text-lg">{post.title}</CardTitle>
                <Badge variant={post.status === "published" ? "default" : "secondary"} className="capitalize">
                  {post.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>
                  {new Date(post.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
