import Link from "next/link";
import { getCurrentUser } from "@/features/auth/auth.server";
import { JourneyCard } from "@/features/journeys/components/JourneyCard";
import { Button } from "@/components/ui/button";
import { getRecentAdminPublicJourneys } from "@/features/journeys/journeys.public.server";

export default async function Home() {
  const [user, journeys] = await Promise.all([getCurrentUser(), getRecentAdminPublicJourneys(3)]);

  const viewAllHref = user ? "/journeys" : "/search?type=journeys";

  return (
    <main className="page-shell container mx-auto py-6 sm:py-8 px-4 max-w-6xl space-y-6">
      <section className="surface-card p-4 sm:p-6 md:p-8">
        <p className="section-kicker w-fit">Journeys Showcase</p>
        <h1 className="section-title mt-3">Follow the makers and their journeys</h1>
        <p className="section-subtitle max-w-3xl">
          Real internship stories from start to finish. Browse recent public journeys and see how people
          document progress, lessons, and outcomes.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Latest Admin Journeys</h2>
          <Button asChild variant="outline" size="sm">
            <Link href={viewAllHref}>View all journeys</Link>
          </Button>
        </div>

        {journeys.length === 0 ? (
          <div className="empty-state">
            <h3 className="text-xl font-semibold mb-2">No admin journeys yet</h3>
            <p className="text-muted-foreground">Admin-created public journeys will appear here once available.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {journeys.map((item) => (
              <JourneyCard
                key={item.journey.id}
                journey={item.journey}
                ownerName={item.ownerName}
                ownerUsername={item.ownerUsername}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
