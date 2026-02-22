import { LogoutButton } from "@/components/auth/LogoutButton";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar({ user }: { user: { email?: string } | null }) {
  return (
    <nav className="flex items-center justify-between p-4 border-b bg-background">
      <Link href="/" className="text-xl font-bold text-primary">
        Internship Blog App
      </Link>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link href="/journeys" className="text-sm font-medium hover:text-primary">
              My Journeys
            </Link>
            <Link href="/me" className="text-sm font-medium hover:text-primary">
              My Profile
            </Link>
            <span className="text-sm text-muted-foreground hidden sm:inline-block">{user.email}</span>
            <LogoutButton />
          </>
        ) : (
          <Button asChild variant="default">
            <Link href="/login">Login</Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
