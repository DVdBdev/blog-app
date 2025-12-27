"use client";

import { useState } from "react";
import { updatePassword } from "@/features/auth/auth.service";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updatePassword(password);
    alert("Password updated. You can now log in.");
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Set new password</h1>
      <input
        type="password"
        placeholder="New password"
        onChange={e => setPassword(e.target.value)}
      />
      <button type="submit">Update password</button>
    </form>
  );
}
