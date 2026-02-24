import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getMyJourneys } from "@/features/journeys/journeys.server";
import { JourneyList } from "@/features/journeys/components/JourneyList";
import { CreateJourneyDialog } from "@/features/journeys/components/CreateJourneyDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/services/supabase/server";

export const metadata = {
  title: "My Journeys | Internship Blog App",
  description: "View and manage your internship journeys",
};

async function JourneysContent() {
  const journeys = await getMyJourneys();

  return (
    <div className="space-y-8">
      <div className="surface-card p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="muted-pill mb-3">Workspace</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Journeys</h1>
          <p className="text-muted-foreground mt-1">
            Track and share your internship experiences.
          </p>
        </div>
        {journeys.length > 0 && <CreateJourneyDialog />}
      </div>

      <JourneyList journeys={journeys} />
    </div>
  );
}

function JourneysSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default async function JourneysPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="page-shell container mx-auto py-6 sm:py-8 px-4 max-w-6xl">
      <Suspense fallback={<JourneysSkeleton />}>
        <JourneysContent />
      </Suspense>
    </main>
  );
}
