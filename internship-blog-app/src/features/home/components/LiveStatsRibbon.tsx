"use client";

import { useEffect, useMemo, useState } from "react";

interface LiveStatsRibbonProps {
  publishedPosts: number;
  publicJourneys: number;
  writers: number;
}

interface StatItem {
  id: string;
  label: string;
  value: number;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const nextValue = Math.round(target * easeOutCubic(progress));
      setValue(nextValue);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

function StatTile({ label, value }: { label: string; value: number }) {
  const animatedValue = useCountUp(value);

  return (
    <article className="statTile">
      <p className="statValue">{animatedValue.toLocaleString("en-US")}</p>
      <p className="statLabel">{label}</p>
    </article>
  );
}

export function LiveStatsRibbon({
  publishedPosts,
  publicJourneys,
  writers,
}: LiveStatsRibbonProps) {
  const stats = useMemo<StatItem[]>(
    () => [
      { id: "published-posts", label: "Posts Published", value: publishedPosts },
      { id: "public-journeys", label: "Public Journeys", value: publicJourneys },
      { id: "writers", label: "Active Writers", value: writers },
    ],
    [publishedPosts, publicJourneys, writers],
  );

  return (
    <section className="statsRibbon" aria-label="Platform stats">
      {stats.map((stat) => (
        <StatTile key={stat.id} label={stat.label} value={stat.value} />
      ))}
    </section>
  );
}
