import { LogoutButton } from "@/components/auth/LogoutButton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Navbar({ user }: { user: { email?: string } | null }) {
  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <Link href="/" className="text-xl font-bold text-primary">
        Internship Blog App
      </Link>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        {user ? (
          <>
            <Link href="/journeys" className="text-sm font-medium hover:text-primary">
              My Journeys
            </Link>
            <Link href="/me" className="text-sm font-medium hover:text-primary">
              My Profile
            </Link>
            <Link href="/settings" className="text-sm font-medium hover:text-primary">
              Settings
            </Link>
            <span className="text-sm text-muted-foreground hidden sm:inline-block">{user.email}</span>
            <LogoutButton />
          </>
        ) : (
          <>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="default">
              <Link href="/register">Create Account</Link>
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
