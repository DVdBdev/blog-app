"use client";

import { useState } from "react";
import { requestPasswordReset } from "@/features/auth/auth.service";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await requestPasswordReset(email);
    alert("Check your email for reset instructions.");
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Reset password</h1>
      <input
        placeholder="Email"
        onChange={e => setEmail(e.target.value)}
      />
      <button type="submit">Send reset email</button>
    </form>
  );
}
