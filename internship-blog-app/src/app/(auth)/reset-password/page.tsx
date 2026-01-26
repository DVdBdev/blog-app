"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/services/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createBrowserSupabaseClient();
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // This is the missing step
    supabase.auth.getSession().then(() => {
      setReady(true);
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Password updated. You can now log in.");
    }
  }

  if (!ready) {
    return <p>Preparing password reset…</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Set new password</h1>
      <input
        type="password"
        placeholder="New password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Update password</button>
    </form>
  );
}
