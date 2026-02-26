"use client";

import { LogoutButton } from "@/components/auth/LogoutButton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserStatusChip } from "@/components/navigation/UserStatusChip";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

export function Navbar({
  user,
}: {
  user: { email?: string; username?: string; role?: "user" | "admin" | null } | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navLinkClass = (href: string) =>
    `relative text-sm font-medium transition-all duration-200 hover:text-foreground hover:-translate-y-[1px] after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:rounded-full after:bg-primary after:transition-all after:duration-200 ${
      pathname === href
        ? "text-foreground after:w-full"
        : "text-muted-foreground after:w-0 hover:after:w-full"
    }`;
  const mobileNavLinkClass = (href: string) =>
    `block w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      pathname === href
        ? "bg-muted text-foreground"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    }`;

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between gap-4 px-5 py-4 sm:px-6 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70 relative">
      <Link href="/" className="min-w-0 text-xl font-bold text-primary transition-transform duration-200 hover:scale-[1.01] hover:opacity-90">
        <span className="hidden sm:inline">Internship Blog App</span>
        <span className="sm:hidden">Blog App</span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        {user ? (
          <>
            <div className="hidden lg:flex items-center gap-3 rounded-full border border-border/70 bg-background/35 px-3 py-1">
              <Link href="/search" className={navLinkClass("/search")}>
                Search
              </Link>
              <Link href="/journeys" className={navLinkClass("/journeys")}>
                My Journeys
              </Link>
              <Link href="/users" className={navLinkClass("/users")}>
                Users
              </Link>
              <Link href="/me" className={navLinkClass("/me")}>
                My Profile
              </Link>
              <Link href="/settings" className={navLinkClass("/settings")}>
                Settings
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className={navLinkClass("/admin")}>
                  Admin
                </Link>
              )}
            </div>
            <div className="hidden lg:block">
              <UserStatusChip />
            </div>
            <span className="text-sm text-muted-foreground hidden lg:inline-block">
              {user.username ?? user.email}
            </span>
            <div className="hidden lg:block">
              <LogoutButton />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </>
        ) : (
          <>
            <Button asChild variant="ghost" className="hidden lg:inline-flex transition-transform duration-200 hover:-translate-y-[1px]">
              <Link href="/about">About</Link>
            </Button>
            <Button asChild variant="ghost" className="hidden lg:inline-flex transition-transform duration-200 hover:-translate-y-[1px]">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="default" className="hidden lg:inline-flex transition-transform duration-200 hover:-translate-y-[1px]">
              <Link href="/register">Create Account</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </>
        )}
      </div>

      <button
        type="button"
        className={`lg:hidden fixed inset-0 z-40 bg-background/60 backdrop-blur-[2px] transition-opacity duration-300 ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-label="Close mobile menu"
      />

      <div
        className={`lg:hidden absolute right-3 top-[calc(100%+0.6rem)] z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-border/80 bg-background/95 p-3 shadow-2xl backdrop-blur-md transition-all duration-300 ease-out ${
          mobileOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-95 opacity-0"
        }`}
      >
        {user ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-foreground">{user.username ?? user.email}</p>
            </div>

            <div className="grid gap-1">
              <Link href="/search" className={mobileNavLinkClass("/search")} onClick={() => setMobileOpen(false)}>
                Search
              </Link>
              <Link href="/journeys" className={mobileNavLinkClass("/journeys")} onClick={() => setMobileOpen(false)}>
                My Journeys
              </Link>
              <Link href="/users" className={mobileNavLinkClass("/users")} onClick={() => setMobileOpen(false)}>
                Users
              </Link>
              <Link href="/me" className={mobileNavLinkClass("/me")} onClick={() => setMobileOpen(false)}>
                My Profile
              </Link>
              <Link href="/settings" className={mobileNavLinkClass("/settings")} onClick={() => setMobileOpen(false)}>
                Settings
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className={mobileNavLinkClass("/admin")} onClick={() => setMobileOpen(false)}>
                  Admin
                </Link>
              )}
            </div>

            <div className="pt-2 mt-1 border-t border-border/70">
              <LogoutButton className="w-full justify-start" />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link href="/about" onClick={() => setMobileOpen(false)}>About</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link href="/login" onClick={() => setMobileOpen(false)}>Login</Link>
            </Button>
            <Button asChild variant="default" className="w-full justify-start">
              <Link href="/register" onClick={() => setMobileOpen(false)}>Create Account</Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
