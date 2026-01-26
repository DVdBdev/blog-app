"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/features/auth/auth.service";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await signIn(email, password);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Login</h1>

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

      <button type="submit">Login</button>
    </form>
  );
}
