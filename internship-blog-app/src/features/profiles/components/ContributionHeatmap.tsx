import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyContribution } from "@/features/posts/posts.server";

interface ContributionHeatmapProps {
  contributions: DailyContribution[];
  title?: string;
}

function toIsoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildGridDays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(today.getDate() - 364);

  // Monday-based week alignment (Mon=0...Sun=6)
  const startWeekday = (start.getDay() + 6) % 7;
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - startWeekday);

  const endWeekday = (today.getDay() + 6) % 7;
  const gridEnd = new Date(today);
  gridEnd.setDate(today.getDate() + (6 - endWeekday));

  const gridDays: { date: Date; inRange: boolean }[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    gridDays.push({
      date: new Date(cursor),
      inRange: cursor >= start && cursor <= today,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return gridDays;
}

export function ContributionHeatmap({
  contributions,
  title = "Contribution Activity",
}: ContributionHeatmapProps) {
  const counts = new Map(contributions.map((c) => [c.date, c.count]));
  const gridDays = buildGridDays();
  const maxCount = Math.max(...contributions.map((c) => c.count), 0);
  const totalContributions = contributions.reduce((sum, c) => sum + c.count, 0);

  const weeks: { date: Date; count: number; inRange: boolean }[][] = [];
  for (let i = 0; i < gridDays.length; i += 7) {
    const week = gridDays.slice(i, i + 7).map(({ date, inRange }) => {
      const iso = toIsoDay(date);
      return { date, count: counts.get(iso) ?? 0, inRange };
    });
    weeks.push(week);
  }

  const monthLabels = weeks.map((week, idx) => {
    const first = week[0]?.date;
    if (!first) return "";

    const prevFirst = idx > 0 ? weeks[idx - 1][0]?.date : null;
    const monthChanged = !prevFirst || prevFirst.getMonth() !== first.getMonth();
    return monthChanged ? first.toLocaleDateString("en-US", { month: "short" }) : "";
  });

  const levelClass = (count: number) => {
    if (count === 0) return "bg-muted";
    if (maxCount <= 1) return "bg-emerald-300/70 dark:bg-emerald-500/70";

    const ratio = count / maxCount;
    if (ratio < 0.34) return "bg-emerald-200 dark:bg-emerald-900";
    if (ratio < 0.67) return "bg-emerald-400/80 dark:bg-emerald-700";
    return "bg-emerald-500 dark:bg-emerald-500";
  };

  return (
    <Card className="surface-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {totalContributions} contribution{totalContributions === 1 ? "" : "s"} in the last year
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
              {monthLabels.map((label, idx) => (
                <div key={idx} className="text-[10px] text-muted-foreground text-center h-3">
                  {label}
                </div>
              ))}
            </div>

            <div className="flex gap-2 items-start">
              <div className="grid grid-rows-7 gap-1 text-[10px] text-muted-foreground mt-[1px]">
                <span className="h-3 leading-3">Mon</span>
                <span className="h-3 leading-3" />
                <span className="h-3 leading-3">Wed</span>
                <span className="h-3 leading-3" />
                <span className="h-3 leading-3">Fri</span>
                <span className="h-3 leading-3" />
                <span className="h-3 leading-3" />
              </div>

              <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-rows-7 gap-1">
                  {week.map((day) => {
                    const isoDay = toIsoDay(day.date);
                    const prettyDate = day.date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    return (
                      <div
                        key={isoDay}
                        title={`${day.count} contribution${day.count === 1 ? "" : "s"} on ${prettyDate}`}
                        className={`h-3 w-3 rounded-[3px] border border-border/30 ${day.inRange ? levelClass(day.count) : "bg-transparent border-transparent"}`}
                      />
                    );
                  })}
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>Less</span>
          <span className="h-3 w-3 rounded-[3px] bg-muted" />
          <span className="h-3 w-3 rounded-[3px] bg-emerald-200 dark:bg-emerald-900" />
          <span className="h-3 w-3 rounded-[3px] bg-emerald-400/80 dark:bg-emerald-700" />
          <span className="h-3 w-3 rounded-[3px] bg-emerald-500 dark:bg-emerald-500" />
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
