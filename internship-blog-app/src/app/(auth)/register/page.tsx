import { redirect } from "next/navigation";
import { createClient } from "@/services/supabase/server";
import { RegisterPageClient } from "@/features/auth/components/RegisterPageClient";

export default async function RegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return <RegisterPageClient />;
}
