"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyContribution } from "@/features/posts/posts.server";

interface ContributionHeatmapProps {
  contributions: DailyContribution[];
  title?: string;
  todayIso: string;
}

type TimeframeOption = "30D" | "90D" | "1Y";

function toIsoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

const monthShortFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function parseIsoDayUtc(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getRange(days: number, todayIso: string) {
  const today = parseIsoDayUtc(todayIso);
  const start = addUtcDays(today, -(days - 1));
  return { start, today };
}

function buildWeekStarts(start: Date, end: Date) {
  const weekStarts: Date[] = [];
  const cursor = new Date(start);
  const startWeekday = (cursor.getUTCDay() + 6) % 7;
  cursor.setUTCDate(cursor.getUTCDate() - startWeekday);

  while (cursor <= end) {
    weekStarts.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return weekStarts;
}

function countCurrentStreak(contributionsByDay: Map<string, number>, fromDay: Date) {
  const cursor = new Date(fromDay);
  let streak = 0;

  while (true) {
    const count = contributionsByDay.get(toIsoDay(cursor)) ?? 0;
    if (count === 0) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export function ContributionHeatmap({
  contributions,
  title = "Contribution Activity",
  todayIso,
}: ContributionHeatmapProps) {
  const [timeframe, setTimeframe] = useState<TimeframeOption>("1Y");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const timeframeDays = timeframe === "30D" ? 30 : timeframe === "90D" ? 90 : 365;

  const {
    today,
    totalContributions,
    weeklyTotals,
    maxWeekly,
    busiestWeek,
    streak,
    monthTicks,
  } = useMemo(() => {
    const countsByDay = new Map(contributions.map((c) => [c.date, c.count]));
    const { start, today } = getRange(timeframeDays, todayIso);
    const weekStarts = buildWeekStarts(start, today);

    const weeklyTotals = weekStarts.map((weekStart) => {
      const days = Array.from({ length: 7 }, (_, i) => {
        return addUtcDays(weekStart, i);
      }).filter((date) => date >= start && date <= today);

      const total = days.reduce((sum, day) => {
        return sum + (countsByDay.get(toIsoDay(day)) ?? 0);
      }, 0);

      const weekEnd = addUtcDays(weekStart, 6);
      return { weekStart, weekEnd, total };
    });

    const totalContributions = weeklyTotals.reduce((sum, week) => sum + week.total, 0);
    const maxWeekly = Math.max(...weeklyTotals.map((w) => w.total), 0);
    const busiestWeek = weeklyTotals.reduce(
      (max, week) => (week.total > max.total ? week : max),
      weeklyTotals[0] ?? { weekStart: start, weekEnd: start, total: 0 },
    );
    const streak = countCurrentStreak(countsByDay, today);

    const monthTicks = weeklyTotals.map((week, index) => {
      const prev = index > 0 ? weeklyTotals[index - 1] : null;
      const changedMonth =
        !prev || prev.weekStart.getUTCMonth() !== week.weekStart.getUTCMonth();
      return changedMonth
        ? monthShortFormatter.format(week.weekStart)
        : "";
    });

    return {
      today,
      totalContributions,
      weeklyTotals,
      maxWeekly,
      busiestWeek,
      streak,
      monthTicks,
    };
  }, [contributions, timeframeDays, todayIso]);

  const chartWidth = Math.max(weeklyTotals.length * 18, 680);
  const chartHeight = 180;
  const paddingX = 8;
  const paddingTop = 12;
  const paddingBottom = 18;
  const drawableHeight = chartHeight - paddingTop - paddingBottom;
  const stepX =
    weeklyTotals.length > 1
      ? (chartWidth - paddingX * 2) / (weeklyTotals.length - 1)
      : 0;

  const points = weeklyTotals.map((week, index) => {
    const x = paddingX + index * stepX;
    const ratio = maxWeekly ? week.total / maxWeekly : 0;
    const y = paddingTop + (1 - ratio) * drawableHeight;
    return { x, y, week };
  });

  const toPath = (data: { x: number; y: number }[]) => {
    if (data.length === 0) return "";
    if (data.length === 1) return `M ${data[0].x} ${data[0].y}`;

    let d = `M ${data[0].x} ${data[0].y}`;
    for (let i = 0; i < data.length - 1; i += 1) {
      const current = data[i];
      const next = data[i + 1];
      const controlX = (current.x + next.x) / 2;
      d += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const linePath = toPath(points);
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`
    : "";

  const hoveredWeek =
    hoveredIndex !== null ? weeklyTotals[hoveredIndex] : null;
  const previousWeek =
    hoveredIndex !== null && hoveredIndex > 0 ? weeklyTotals[hoveredIndex - 1] : null;
  const delta = hoveredWeek ? hoveredWeek.total - (previousWeek?.total ?? 0) : 0;
  const deltaLabel =
    hoveredWeek && previousWeek
      ? delta === 0
        ? "No change"
        : `${delta > 0 ? "+" : ""}${delta} vs prev week`
      : "No previous week";

  return (
    <Card className="surface-card">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <div className="inline-flex rounded-md border border-border/70 bg-card/80 p-1">
            {(["30D", "90D", "1Y"] as TimeframeOption[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setTimeframe(option);
                  setHoveredIndex(null);
                }}
                className={`rounded px-2.5 py-1 text-xs font-medium transition ${timeframe === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {totalContributions} contribution{totalContributions === 1 ? "" : "s"} in the last {timeframe.toLowerCase()}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-card/80 p-3">
            <p className="text-xs text-muted-foreground">Current streak</p>
            <p className="mt-1 text-xl font-semibold">{streak} day{streak === 1 ? "" : "s"}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/80 p-3">
            <p className="text-xs text-muted-foreground">Busiest week</p>
            <p className="mt-1 text-xl font-semibold">{busiestWeek.total}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/80 p-3">
            <p className="text-xs text-muted-foreground">Weekly average</p>
            <p className="mt-1 text-xl font-semibold">
              {weeklyTotals.length ? (totalContributions / weeklyTotals.length).toFixed(1) : "0.0"}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[680px] space-y-2">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${weeklyTotals.length}, minmax(0, 1fr))` }}
            >
              {monthTicks.map((label, idx) => (
                <div key={idx} className="text-[10px] text-muted-foreground text-center h-3">
                  {label}
                </div>
              ))}
            </div>

            <div className="relative rounded-xl border border-border/60 bg-card/80 p-3">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="h-44 w-full"
                role="img"
                aria-label="Contribution trend over the past year"
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <defs>
                  <linearGradient id="activityZoneGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(16 185 129)" />
                    <stop offset="45%" stopColor="rgb(52 211 153)" />
                    <stop offset="75%" stopColor="rgb(245 158 11)" />
                    <stop offset="100%" stopColor="rgb(217 119 6)" />
                  </linearGradient>
                  <linearGradient id="activityAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.45" />
                    <stop offset="55%" stopColor="rgb(52 211 153)" stopOpacity="0.2" />
                    <stop offset="80%" stopColor="rgb(245 158 11)" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="rgb(217 119 6)" stopOpacity="0.08" />
                  </linearGradient>
                </defs>

                {[0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = paddingTop + drawableHeight * ratio;
                  return (
                    <line
                      key={ratio}
                      x1={paddingX}
                      x2={chartWidth - paddingX}
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity="0.15"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {areaPath ? <path d={areaPath} fill="url(#activityAreaGradient)" /> : null}
                {linePath ? (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="url(#activityZoneGradient)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}

                {points.map(({ x, y }, idx) => {
                  return (
                    <g key={idx}>
                      <rect
                        x={Math.max(paddingX, x - Math.max(8, stepX / 2))}
                        y={paddingTop}
                        width={Math.max(16, stepX || 16)}
                        height={drawableHeight + paddingBottom}
                        fill="transparent"
                        onMouseEnter={() => setHoveredIndex(idx)}
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={hoveredIndex === idx ? 4 : 2.5}
                        fill="url(#activityZoneGradient)"
                        opacity={hoveredIndex === null || hoveredIndex === idx ? 1 : 0.5}
                      />
                    </g>
                  );
                })}
              </svg>

              {hoveredWeek ? (
                <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-border/80 bg-background/95 px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-foreground">
                    {monthDayFormatter.format(hoveredWeek.weekStart)}
                    {" - "}
                    {hoveredWeek.weekEnd > today
                      ? monthDayFormatter.format(today)
                      : monthDayFormatter.format(hoveredWeek.weekEnd)}
                  </p>
                  <p className="text-muted-foreground">
                    {hoveredWeek.total} contribution{hoveredWeek.total === 1 ? "" : "s"}
                  </p>
                  <p className={delta > 0 ? "text-emerald-500" : delta < 0 ? "text-amber-500" : "text-muted-foreground"}>
                    {deltaLabel}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
