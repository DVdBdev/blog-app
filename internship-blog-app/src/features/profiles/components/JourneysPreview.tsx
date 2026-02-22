import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { getMyJourneys } from "@/features/journeys/journeys.server";

export async function JourneysPreview() {
  const journeys = await getMyJourneys();
  const previewJourneys = journeys.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Your Journeys</h2>
        <Button variant="ghost" asChild>
          <Link href="/journeys">View all journeys</Link>
        </Button>
      </div>
      
      {previewJourneys.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/20 border-dashed">
          <p className="text-muted-foreground mb-4">You haven't created any journeys yet.</p>
          <Button asChild>
            <Link href="/journeys">Create your first journey</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {previewJourneys.map((journey) => (
            <Card key={journey.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="line-clamp-1">{journey.title}</CardTitle>
                <CardDescription>{new Date(journey.created_at).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {journey.description || <span className="italic">No description</span>}
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/journeys/${journey.id}`}>View Journey</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
