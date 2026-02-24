"use client";

import { signOut } from "@/features/auth/auth.service";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LogoutButton({ className }: { className?: string } = {}) {
  const router = useRouter();

  async function handleLogout() {
    await signOut();

    // Trigger server re-render
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={handleLogout} className={cn(className)}>
      Logout
    </Button>
  );
}
