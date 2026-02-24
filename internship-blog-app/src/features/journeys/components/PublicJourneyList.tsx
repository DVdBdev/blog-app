import { Journey } from "@/types";
import { JourneyCard } from "./JourneyCard";
import { Map } from "lucide-react";

interface PublicJourneyListProps {
  journeys: Journey[];
  ownerName?: string;
}

export function PublicJourneyList({ journeys, ownerName }: PublicJourneyListProps) {
  if (journeys.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Map className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No public journeys yet</h3>
        <p className="text-muted-foreground max-w-md">
          {ownerName
            ? `${ownerName} hasn't shared any public journeys yet.`
            : "This user hasn't shared any public journeys yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 stagger-list">
      {journeys.map((journey) => (
        <JourneyCard key={journey.id} journey={journey} />
      ))}
    </div>
  );
}
