import { Journey } from "@/types";
import { JourneyCard } from "./JourneyCard";
import { CreateJourneyDialog } from "./CreateJourneyDialog";
import { Map } from "lucide-react";

interface JourneyListProps {
  journeys: Journey[];
}

export function JourneyList({ journeys }: JourneyListProps) {
  if (journeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center border rounded-lg bg-muted/20 border-dashed">
        <div className="bg-primary/10 p-4 rounded-full mb-4">
          <Map className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No journeys yet</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Start documenting your internship experience by creating your first journey.
        </p>
        <CreateJourneyDialog />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {journeys.map((journey) => (
        <JourneyCard key={journey.id} journey={journey} />
      ))}
    </div>
  );
}
