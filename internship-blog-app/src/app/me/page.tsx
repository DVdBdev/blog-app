import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/features/profiles/profile.server";
import { ProfileHeaderCard } from "@/features/profiles/components/ProfileHeaderCard";
import { ProfileDetailsCard } from "@/features/profiles/components/ProfileDetailsCard";
import { JourneysPreview } from "@/features/profiles/components/JourneysPreview";
import { ProfileSkeleton } from "@/features/profiles/components/ProfileSkeleton";

export const metadata = {
  title: "My Profile | Internship Blog App",
  description: "View and manage your profile",
};

async function ProfileContent() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="space-y-8">
      <ProfileHeaderCard profile={profile} />
      
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <ProfileDetailsCard profile={profile} />
        </div>
        <div className="md:col-span-2">
          <JourneysPreview />
        </div>
      </div>
    </div>
  );
}

export default function MyProfilePage() {
  return (
    <main className="container mx-auto py-8 px-4 max-w-6xl">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent />
      </Suspense>
    </main>
  );
}
