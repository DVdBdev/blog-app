import { getCurrentUser } from "@/features/auth/auth.server";
import { getCurrentProfile } from "@/features/profiles/profile.server";
import { StarsBackground } from "@/components/animate-ui/components/backgrounds/stars";
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
        <StarsBackground
          className="fixed inset-0 z-0 !bg-none !bg-[#f3f4f6] dark:hidden"
          starColor="rgba(15,23,42,0.55)"
          speed={80}
          pointerEvents={false}
        />
        <StarsBackground
          className="fixed inset-0 z-0 hidden !bg-black dark:block"
          starColor="#ffffff"
          speed={80}
          pointerEvents={false}
        />
        <div className="relative z-10">
          <Navbar
            user={
              user
                ? {
                    email: user.email ?? undefined,
                    username: profile?.username ?? undefined,
                    role: profile?.role,
                  }
                : null
            }
          />
          {children}
        </div>
      </body>
    </html>
  );
}
