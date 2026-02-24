import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/features/profiles/profile.server";
import { ProfileHeaderCard } from "@/features/profiles/components/ProfileHeaderCard";
import { ProfileDetailsCard } from "@/features/profiles/components/ProfileDetailsCard";
import { JourneysPreview } from "@/features/profiles/components/JourneysPreview";
import { ProfileSkeleton } from "@/features/profiles/components/ProfileSkeleton";
import { ContributionHeatmap } from "@/features/profiles/components/ContributionHeatmap";
import { getDailyPostContributionsByAuthor, hasPostsByAuthor } from "@/features/posts/posts.server";
import { ProfileCompletionCard } from "@/features/profiles/components/ProfileCompletionCard";

export const metadata = {
  title: "My Profile | Internship Blog App",
  description: "View and manage your profile",
};

async function ProfileContent() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const [contributions, hasAtLeastOnePost] = await Promise.all([
    getDailyPostContributionsByAuthor(profile.id),
    hasPostsByAuthor(profile.id),
  ]);
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 sm:space-y-8">
      <ProfileHeaderCard profile={profile} />

      <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <ProfileDetailsCard profile={profile} />
        </div>
        <div className="md:col-span-2">
          <JourneysPreview />
        </div>
      </div>

      <div className="grid gap-6 sm:gap-8 2xl:grid-cols-3">
        <div className="2xl:col-span-1">
          <ProfileCompletionCard profile={profile} hasAtLeastOnePost={hasAtLeastOnePost} />
        </div>
        <div className="2xl:col-span-2">
          <ContributionHeatmap contributions={contributions} todayIso={todayIso} />
        </div>
      </div>
    </div>
  );
}

export default function MyProfilePage() {
  return (
    <main className="page-shell container mx-auto py-6 sm:py-8 px-4 max-w-6xl">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent />
      </Suspense>
    </main>
  );
}
