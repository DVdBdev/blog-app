import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "About | Internship Blog App",
  description: "Project notes and progress log.",
};

const sectionPlaceholders = [
  {
    title: "Project Overview",
    points: [
      "What this project is about",
      "Who it is for",
      "What problem it solves",
    ],
  },
  {
    title: "Team Notes",
    points: [
      "Who worked on what",
      "How tasks were divided",
      "How collaboration is organized",
    ],
  },
  {
    title: "What We Built",
    points: [
      "Key features implemented",
      "Main technical decisions",
      "Biggest challenges and fixes",
    ],
  },
  {
    title: "Next Steps",
    points: [
      "Planned improvements",
      "Open issues",
      "Ideas to test later",
    ],
  },
];

export default function AboutPage() {
  return (
    <main className="page-shell container mx-auto py-8 px-4 max-w-5xl">
      <section className="surface-card p-6 sm:p-8">
        <p className="section-kicker">About This Project</p>
        <h1 className="section-title mt-3">Team Workspace Notes</h1>
        <p className="section-subtitle max-w-2xl">
          This page is a shared template for project context, progress updates, and team notes.
          Replace each block with your real content as you go.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 mt-6">
        {sectionPlaceholders.map((section) => (
          <Card key={section.title} className="surface-card">
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {section.points.map((point) => (
                  <li key={point} className="rounded-md border border-dashed border-border/70 px-3 py-2">
                    {point}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
