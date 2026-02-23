import Link from "next/link";
import { ArrowRight, BookText, Globe2, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/features/auth/auth.server";
import { Button } from "@/components/ui/button";
import styles from "./page.module.css";

export default async function Home() {
  const user = await getCurrentUser();
  const primaryHref = user ? "/journeys" : "/register";
  const primaryLabel = user ? "Open My Journeys" : "Create Free Account";
  const secondaryHref = user ? "/me" : "/login";
  const secondaryLabel = user ? "See Profile" : "Login";

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={`${styles.badge} ${styles.reveal1}`}>
          <Sparkles className="h-4 w-4" />
          Build a portfolio from your internship journey
        </p>

        <h1 className={`${styles.title} ${styles.reveal2}`}>
          Write better internship stories with rich posts, media, and public profiles.
        </h1>

        <p className={`${styles.subtitle} ${styles.reveal3}`}>
          Capture your wins, lessons, and milestones in one place. Share selected journeys publicly while
          keeping drafts private until they are ready.
        </p>

        <div className={`${styles.actions} ${styles.reveal4}`}>
          <Button asChild size="lg" className={styles.primaryCta}>
            <Link href={primaryHref}>
              {primaryLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className={styles.secondaryCta}>
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={`${styles.card} ${styles.reveal2}`}>
          <div className={styles.iconWrap}>
            <BookText className="h-5 w-5" />
          </div>
          <h2>Powerful Post Editor</h2>
          <p>Format text with headings, lists, quotes, and images to make each update stand out.</p>
        </article>

        <article className={`${styles.card} ${styles.reveal3}`}>
          <div className={styles.iconWrap}>
            <Globe2 className="h-5 w-5" />
          </div>
          <h2>Public + Private Control</h2>
          <p>Keep drafts private, publish when ready, and share your profile and journeys with confidence.</p>
        </article>

        <article className={`${styles.card} ${styles.reveal4}`}>
          <div className={styles.iconWrap}>
            <Sparkles className="h-5 w-5" />
          </div>
          <h2>Portfolio Ready</h2>
          <p>Turn day-to-day internship progress into a clean, professional story recruiters can read.</p>
        </article>
      </section>
    </main>
  );
}
