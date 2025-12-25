import { AppShell } from "@/components/layout/AppShell";
import { Navbar } from "@/components/navigation/Navbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}