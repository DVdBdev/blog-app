import Link from "next/link";
import { CalendarDays, MapPin, Search, UserRound, BriefcaseBusiness } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  searchPublicProfiles,
  UserDirectoryItem,
  UserDirectorySort,
} from "@/features/profiles/users.server";

interface UsersPageProps {
  searchParams: Promise<{
    q?: string;
    sort?: string;
  }>;
}

function normalizeSort(value: string | undefined): UserDirectorySort {
  if (value === "newest" || value === "oldest") return value;
  return "relevance";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(item: UserDirectoryItem) {
  const source = item.displayName?.trim() || item.username;

  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function UserCard({ user }: { user: UserDirectoryItem }) {
  return (
    <Link href={`/u/${user.username}`} className="group block">
      <article className="surface-card interactive-card p-5 h-full">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.username} />
            <AvatarFallback>{getInitials(user)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold leading-tight truncate">
              {user.displayName ?? user.username}
            </h2>
            <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
          </div>
        </div>

        {user.bio ? (
          <p className="mt-4 text-sm text-muted-foreground line-clamp-3">{user.bio}</p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground italic">No bio yet.</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {user.company ? (
            <Badge variant="secondary" className="inline-flex items-center gap-1">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              {user.company}
            </Badge>
          ) : null}

          {user.location ? (
            <Badge variant="outline" className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {user.location}
            </Badge>
          ) : null}

          {user.fieldDomain ? <Badge variant="outline">{user.fieldDomain}</Badge> : null}
        </div>

        <p className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          Joined {formatDate(user.createdAt)}
        </p>
      </article>
    </Link>
  );
}

export const metadata = {
  title: "Users | Internship Blog App",
  description: "Browse and search community members.",
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const sort = normalizeSort(params.sort);

  const users = await searchPublicProfiles({
    query,
    sort,
  });

  return (
    <main className="page-shell container mx-auto py-6 sm:py-8 px-4 max-w-6xl">
      <div className="space-y-6">
        <section className="surface-card p-4 sm:p-6 space-y-4">
          <div>
            <p className="muted-pill mb-3">Community</p>
            <h1 className="section-title">Users</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse creators and search by username, name, company, location, or bio.
            </p>
          </div>

          <form action="/users" method="get" className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search users..."
                className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <select
              name="sort"
              defaultValue={sort}
              className="h-10 w-full md:w-auto rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="relevance">Relevance</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>

            <Button type="submit" className="h-10 w-full md:w-auto">
              Search
            </Button>
          </form>
        </section>

        <section className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {users.length} user{users.length === 1 ? "" : "s"}
            {query ? ` found for "${query}"` : ""}
          </p>

          {users.length === 0 ? (
            <div className="surface-card p-10 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UserRound className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">No matching users</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a different keyword or adjust sort.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {users.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}