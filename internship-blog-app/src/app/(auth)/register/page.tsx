"use client";

import { useState } from "react";
import Link from "next/link";
import { registerUser } from "@/features/auth/auth.actions";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { AuthField } from "@/features/auth/components/AuthField";
import { AuthMessage } from "@/features/auth/components/AuthMessage";
import { validateEmail, validatePassword, validateUsername, validateConfirmPassword } from "@/features/auth/lib/validation";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});

    const emailError = validateEmail(email);
    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);
    const confirmError = validateConfirmPassword(password, confirmPassword);

    if (emailError || usernameError || passwordError || confirmError) {
      setFieldErrors({
        email: emailError || undefined,
        username: usernameError || undefined,
        password: passwordError || undefined,
        confirmPassword: confirmError || undefined,
      });
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append("username", username);

      const result = await registerUser(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess("Account created successfully! Please check your email to verify your account.");
      // Clear form
      setEmail("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthCard
      title="Create an account"
      description="Enter your details below to create your account"
      footer={
        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="underline underline-offset-4 hover:text-primary">
            Sign in
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthMessage type="error" message={error} />
        <AuthMessage type="success" message={success} />
        
        <AuthField
          id="username"
          label="Username"
          type="text"
          placeholder="johndoe"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={fieldErrors.username}
          disabled={isLoading || !!success}
          autoComplete="username"
        />

        <AuthField
          id="email"
          label="Email"
          type="email"
          placeholder="m@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          disabled={isLoading || !!success}
          autoComplete="email"
        />

        <AuthField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          disabled={isLoading || !!success}
          autoComplete="new-password"
        />

        <AuthField
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
          disabled={isLoading || !!success}
          autoComplete="new-password"
        />

        <Button type="submit" className="w-full" disabled={isLoading || !!success}>
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
