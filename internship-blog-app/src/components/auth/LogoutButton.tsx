"use client";

import { signOut } from "@/features/auth/auth.service";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await signOut();

    // Trigger server re-render
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={handleLogout}>
      Logout
    </button>
  );
}
