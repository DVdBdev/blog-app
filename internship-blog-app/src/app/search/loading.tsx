import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="page-shell container mx-auto py-6 sm:py-8 px-4 max-w-5xl">
      <div className="space-y-6">
        <section className="surface-card p-6 space-y-4">
          <div className="space-y-3">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full md:w-32" />
            <Skeleton className="h-10 w-full md:w-32" />
            <Skeleton className="h-10 w-full md:w-24" />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-52" />
          </div>

          <div className="grid gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="surface-card">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-7 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
