import Link from "next/link";
import { Search, FileText, Map, CalendarDays, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { searchPublicContent, SearchResultItem, SearchSort } from "@/features/search/search.server";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    sort?: string;
  }>;
}

function normalizeType(value: string | undefined): "journeys" {
  if (value === "journeys") return "journeys";
  return "journeys";
}

function normalizeSort(value: string | undefined): SearchSort {
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

function SearchResultCard({ item }: { item: SearchResultItem }) {
  if (item.kind === "post") {
    return (
      <Link href={`/posts/${item.id}`} className="group block">
        <article className="surface-card interactive-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Post</Badge>
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(item.createdAt)}
            </div>
          </div>

          <h2 className="mt-3 text-xl font-semibold tracking-tight">{item.title}</h2>

          {item.snippet ? (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{item.snippet}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground italic">No excerpt provided.</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {item.authorUsername ? (
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-4 w-4" />
                {item.authorDisplayName ?? item.authorUsername}
              </span>
            ) : null}

            {item.journeyTitle ? (
              <span className="inline-flex items-center gap-1">
                <Map className="h-4 w-4" />
                {item.journeyTitle}
              </span>
            ) : null}
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/journeys/${item.id}`} className="group block">
      <article className="surface-card interactive-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Journey</Badge>
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(item.createdAt)}
          </div>
        </div>

        <h2 className="mt-3 text-xl font-semibold tracking-tight">{item.title}</h2>

        {item.snippet ? (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{item.snippet}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground italic">No description provided.</p>
        )}

        {item.ownerUsername ? (
          <div className="mt-4">
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <UserRound className="h-4 w-4" />
              {item.ownerDisplayName ?? item.ownerUsername}
            </span>
          </div>
        ) : null}
      </article>
    </Link>
  );
}

export const metadata = {
  title: "Search | Internship Blog App",
  description: "Search public journeys",
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const type = normalizeType(params.type);
  const sort = normalizeSort(params.sort);

  const results = await searchPublicContent({
    query,
    type,
    sort,
  });

  return (
    <main className="page-shell container mx-auto py-8 px-4 max-w-5xl">
      <div className="space-y-6">
        <section className="surface-card p-6 space-y-4">
          <div>
            <p className="muted-pill mb-3">Explore</p>
            <h1 className="section-title">Search</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Find public journeys by keyword, creator, or title.
            </p>
          </div>

          <form action="/search" method="get" className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search journeys and usernames..."
                className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <input type="hidden" name="type" value="journeys" />

            <select
              name="sort"
              defaultValue={sort}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="relevance">Relevance</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>

            <Button type="submit" className="h-10">
              Search
            </Button>
          </form>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {results.total} result{results.total === 1 ? "" : "s"}
              {query ? ` for "${query}"` : ""}
            </p>
          </div>

          {results.items.length === 0 ? (
            <div className="surface-card p-10 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">No matching content</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a broader keyword or sort by newest.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {results.items.map((item) => (
                <SearchResultCard key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
