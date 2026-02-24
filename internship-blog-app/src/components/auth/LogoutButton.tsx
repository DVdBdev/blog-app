"use client";

import { signOut } from "@/features/auth/auth.service";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LogoutButton({ className }: { className?: string } = {}) {
  async function handleLogout() {
    await signOut();
    window.location.assign("/");
  }

  return (
    <Button variant="outline" onClick={handleLogout} className={cn(className)}>
      Logout
    </Button>
  );
}
