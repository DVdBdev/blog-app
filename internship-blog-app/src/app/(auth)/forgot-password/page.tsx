"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/features/auth/auth.service";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { AuthField } from "@/features/auth/components/AuthField";
import { AuthMessage } from "@/features/auth/components/AuthMessage";
import { validateEmail } from "@/features/auth/lib/validation";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});

    const emailError = validateEmail(email);
    if (emailError) {
      setFieldErrors({ email: emailError });
      return;
    }

    setIsLoading(true);

    try {
      const { error: resetError } = await requestPasswordReset(email);

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccess("If an account exists with that email, we have sent password reset instructions.");
      setEmail("");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthCard
      title="Reset password"
      description="Enter your email address and we'll send you a link to reset your password."
      footer={
        <div className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/login" className="underline underline-offset-4 hover:text-primary">
            Back to login
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthMessage type="error" message={error} />
        <AuthMessage type="success" message={success} />
        
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

        <Button type="submit" className="w-full" disabled={isLoading || !!success}>
          {isLoading ? "Sending instructions..." : "Send reset instructions"}
        </Button>
      </form>
    </AuthCard>
  );
}
