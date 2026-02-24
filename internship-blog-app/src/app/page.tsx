import Link from "next/link";
import { ArrowRight, BookText, Globe2, Sparkles, Flag, NotebookPen, BriefcaseBusiness } from "lucide-react";
import { getCurrentUser } from "@/features/auth/auth.server";
import { getCurrentProfile } from "@/features/profiles/profile.server";
import { Button } from "@/components/ui/button";
import { createClient } from "@/services/supabase/server";
import { LiveStatsRibbon } from "@/features/home/components/LiveStatsRibbon";
import styles from "./page.module.css";

export default async function Home() {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);
  const supabase = await createClient();

  const [publishedPostsResult, publicJourneysResult, writersResult] = await Promise.all([
    supabase
      .from("posts")
      .select("id", { head: true, count: "exact" })
      .eq("status", "published"),
    supabase
      .from("journeys")
      .select("id", { head: true, count: "exact" })
      .eq("visibility", "public"),
    supabase.from("profiles").select("id", { head: true, count: "exact" }),
  ]);

  const publishedPosts = publishedPostsResult.count ?? 0;
  const publicJourneys = publicJourneysResult.count ?? 0;
  const writers = writersResult.count ?? 0;

  const isLoggedIn = !!user;
  const primaryHref = user ? "/journeys" : "/register";
  const primaryLabel = user ? "Open My Journeys" : "Create Free Account";
  const secondaryHref = user ? "/me" : "/login";
  const secondaryLabel = user ? "See Profile" : "Login";
  const displayName = profile?.username ?? user?.email?.split("@")[0] ?? "there";

  const rhythmTitle = isLoggedIn
    ? "Track your internship story in a clear, recruiter-friendly rhythm."
    : "Start your internship story with a structure recruiters can scan quickly.";
  const rhythmDescription = isLoggedIn
    ? "Capture moments consistently from onboarding to outcomes. The structure stays simple, and the presentation stays polished."
    : "From day one goals to final outcomes, build a public-ready story without overthinking format.";
  const bottomCtaText = isLoggedIn
    ? "Ready to structure your next internship update?"
    : "Build your first internship update in minutes.";
  const bottomCtaLabel = isLoggedIn ? "Start Writing" : "Create Free Account";

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        {isLoggedIn ? (
          <>
            <p className={`${styles.badge} ${styles.reveal1}`}>
              <Sparkles className="h-4 w-4" />
              Welcome back, {displayName}
            </p>

            <h1 className={`${styles.title} ${styles.reveal2}`}>
              Keep your internship momentum going.
            </h1>

            <p className={`${styles.subtitle} ${styles.reveal3}`}>
              Jump back into your journeys, publish updates, and keep your public story polished.
            </p>
          </>
        ) : (
          <>
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
          </>
        )}

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

        {isLoggedIn ? (
          <div className={`${styles.statsWrap} ${styles.reveal4}`}>
            <LiveStatsRibbon
              publishedPosts={publishedPosts}
              publicJourneys={publicJourneys}
              writers={writers}
            />
          </div>
        ) : null}
      </section>

      {isLoggedIn ? (
        <section className={styles.grid}>
          <article className={`${styles.card} ${styles.cardInteractiveLite} ${styles.reveal2}`}>
            <div className={styles.iconWrap}>
              <BookText className="h-5 w-5" />
            </div>
            <h2>Continue Writing</h2>
            <p>Capture one concrete update from this week and keep your timeline fresh.</p>
            <Button asChild variant="outline" size="sm" className={styles.cardAction}>
              <Link href="/journeys">Open Journeys</Link>
            </Button>
          </article>

          <article className={`${styles.card} ${styles.cardInteractiveLite} ${styles.reveal3}`}>
            <div className={styles.iconWrap}>
              <Globe2 className="h-5 w-5" />
            </div>
            <h2>Refine Public Profile</h2>
            <p>Check your public page and make sure your story reads clearly to recruiters.</p>
            <Button asChild variant="outline" size="sm" className={styles.cardAction}>
              <Link href="/me">Open Profile</Link>
            </Button>
          </article>

          <article className={`${styles.card} ${styles.cardInteractiveLite} ${styles.reveal4}`}>
            <div className={styles.iconWrap}>
              <Sparkles className="h-5 w-5" />
            </div>
            <h2>Explore Community</h2>
            <p>See how others structure updates and improve your own writing cadence.</p>
            <Button asChild variant="outline" size="sm" className={styles.cardAction}>
              <Link href="/search">Search Posts</Link>
            </Button>
          </article>
        </section>
      ) : (
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
      )}

      <div className={styles.sectionDivider} aria-hidden />

      <section className={`${styles.rhythm} ${styles.reveal4}`}>
        <div className={styles.rhythmHeader}>
          <p className={styles.kicker}>Professional Flow</p>
          <h2>{rhythmTitle}</h2>
          <p>{rhythmDescription}</p>
        </div>

        <div className={styles.timelineShell}>
          <div className={styles.timelineLine} />
          <div className={styles.timelineGlow} />

          <div className={styles.milestoneGrid}>
            <article className={styles.milestone}>
              <span className={styles.milestoneIcon}>
                <Flag className="h-4 w-4" />
              </span>
              <h3>Week 1</h3>
              <p>Set goals and baseline skills.</p>
            </article>
            <article className={styles.milestone}>
              <span className={styles.milestoneIcon}>
                <NotebookPen className="h-4 w-4" />
              </span>
              <h3>Midpoint</h3>
              <p>Document wins and lessons learned.</p>
            </article>
            <article className={styles.milestone}>
              <span className={styles.milestoneIcon}>
                <BriefcaseBusiness className="h-4 w-4" />
              </span>
              <h3>Final Review</h3>
              <p>Present outcomes and impact clearly.</p>
            </article>
          </div>
        </div>

        <div className={styles.bottomCta}>
          <p>{bottomCtaText}</p>
          <Button asChild variant="outline" className={styles.bottomCtaButton}>
            <Link href={primaryHref}>{bottomCtaLabel}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
