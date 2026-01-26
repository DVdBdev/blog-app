import { getCurrentUser } from "@/features/auth/auth.server";
import { Navbar } from "@/components/navigation/Navbar";

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <Navbar user={user} />
        {children}
      </body>
    </html>
  );
}
