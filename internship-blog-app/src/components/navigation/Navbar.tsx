import { LogoutButton } from "@/components/auth/LogoutButton";

export function Navbar({ user }: { user: { email?: string } | null }) {
  return (
    <nav>
      <strong>Internship Blog App</strong>

      <div style={{ marginLeft: "auto" }}>
        {user ? (
          <>
            <span>{user.email}</span>
            <LogoutButton />
          </>
        ) : (
          <a href="/login">Login</a>
        )}
      </div>
    </nav>
  );
}
