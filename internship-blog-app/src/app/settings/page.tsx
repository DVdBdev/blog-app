import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/features/profiles/profile.server";
import { SettingsPanel } from "@/features/settings/components/SettingsPanel";

export const metadata = {
  title: "Settings | Internship Blog App",
  description: "Manage appearance, content defaults, and account settings.",
};

export default async function SettingsPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <main className="page-shell container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Personalize your experience and configure your default publishing behavior.
        </p>
      </div>

      <SettingsPanel profile={profile} />
    </main>
  );
}
