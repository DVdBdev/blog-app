"use client";

import { useState } from "react";
import { signUp } from "@/features/auth/auth.service";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signUp(email, password);
    alert("Account created. Check your email if confirmation is enabled.");
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Register</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <button type="submit">Create account</button>
    </form>
  );
}
