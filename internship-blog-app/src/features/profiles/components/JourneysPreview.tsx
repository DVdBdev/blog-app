import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { getMyJourneys } from "@/features/journeys/journeys.server";

export async function JourneysPreview() {
  const journeys = await getMyJourneys();
  const previewJourneys = journeys.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="section-kicker">Workspace</p>
          <h2 className="section-title mt-2">Your Journeys</h2>
          <p className="section-subtitle">Your latest journeys and where to continue writing.</p>
        </div>
        <Button variant="ghost" asChild className="h-9 w-full sm:w-auto justify-center sm:justify-start">
          <Link href="/journeys">View all journeys</Link>
        </Button>
      </div>
      
      {previewJourneys.length === 0 ? (
        <div className="empty-state py-10">
          <p className="text-muted-foreground mb-4">You haven&apos;t created any journeys yet.</p>
          <Button asChild>
            <Link href="/journeys">Create your first journey</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-list">
          {previewJourneys.map((journey) => (
            <Link key={journey.id} href={`/journeys/${journey.id}`} className="group block h-full">
              <Card className="surface-card interactive-card hover:bg-muted/50 h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{journey.title}</CardTitle>
                  <CardDescription>{new Date(journey.created_at).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {journey.description || <span className="italic">No description</span>}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
