import { getCurrentUser } from "@/features/auth/auth.server";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <header>
          {user ? `Logged in as ${user.email}` : "Not logged in"}
        </header>
        {children}
      </body>
    </html>
  );
}
