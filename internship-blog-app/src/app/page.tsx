import Link from "next/link";
import { createClient } from "@/services/supabase/server";
import { getCurrentUser } from "@/features/auth/auth.server";
import { Journey } from "@/types";
import { JourneyCard } from "@/features/journeys/components/JourneyCard";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);

  const { data, error } = await supabase
    .from("journeys")
    .select("*")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("Error fetching home journeys:", error);
  }

  const journeys = (data ?? []) as Journey[];
  const ownerIds = Array.from(new Set(journeys.map((journey) => journey.owner_id)));
  let ownerNameById = new Map<string, string>();

  if (ownerIds.length > 0) {
    const { data: owners, error: ownersError } = await supabase
      .from("profiles")
      .select("id,username,display_name")
      .in("id", ownerIds);

    if (ownersError) {
      console.error("Error fetching journey owners for home:", ownersError);
    } else {
      ownerNameById = new Map(
        (owners ?? []).map((owner) => [
          owner.id as string,
          ((owner.display_name as string | null) ?? (owner.username as string | null) ?? "Unknown writer"),
        ]),
      );
    }
  }

  const viewAllHref = user ? "/journeys" : "/search?type=journeys";

  return (
    <main className="page-shell container mx-auto py-8 px-4 max-w-6xl space-y-6">
      <section className="surface-card p-6 md:p-8">
        <p className="section-kicker w-fit">Journeys Showcase</p>
        <h1 className="section-title mt-3">Follow the makers and their journeys</h1>
        <p className="section-subtitle max-w-3xl">
          Real internship stories from start to finish. Browse recent public journeys and see how people
          document progress, lessons, and outcomes.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Latest Public Journeys</h2>
          <Button asChild variant="outline" size="sm">
            <Link href={viewAllHref}>View all journeys</Link>
          </Button>
        </div>

        {journeys.length === 0 ? (
          <div className="empty-state">
            <h3 className="text-xl font-semibold mb-2">No public journeys yet</h3>
            <p className="text-muted-foreground">Check back soon for new updates from the community.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {journeys.map((journey) => (
              <JourneyCard
                key={journey.id}
                journey={journey}
                ownerName={ownerNameById.get(journey.owner_id) ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
