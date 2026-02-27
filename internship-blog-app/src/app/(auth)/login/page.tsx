import { redirect } from "next/navigation";
import { createClient } from "@/services/supabase/server";
import { LoginPageClient } from "@/features/auth/components/LoginPageClient";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return <LoginPageClient />;
}
