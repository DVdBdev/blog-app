import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Account Suspended | Internship Blog App",
  description: "This account has been suspended.",
};

export default function SuspendedPage() {
  return (
    <main className="page-shell container mx-auto py-12 px-4 max-w-2xl">
      <section className="surface-card p-6 sm:p-8 space-y-4 text-center">
        <p className="muted-pill mx-auto w-fit">Moderation</p>
        <h1 className="section-title">Account Suspended</h1>
        <p className="section-subtitle">
          This account is currently suspended and cannot access platform features.
        </p>
        <div className="pt-2">
          <Button asChild variant="outline">
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
