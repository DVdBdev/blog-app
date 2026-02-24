import { getCurrentUser } from "@/features/auth/auth.server";
import { getCurrentProfile } from "@/features/profiles/profile.server";
import { Navbar } from "@/components/navigation/Navbar";
import "./globals.css";

export const dynamic = "force-dynamic";

const themeInitScript = `
(() => {
  const key = "theme";
  const stored = localStorage.getItem(key);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = stored === "dark" || stored === "light" ? stored : (prefersDark ? "dark" : "light");
  document.documentElement.classList.toggle("dark", theme === "dark");
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Navbar
          user={user ? { email: user.email ?? undefined, username: profile?.username ?? undefined } : null}
        />
        {children}
      </body>
    </html>
  );
}
