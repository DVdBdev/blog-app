"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { AuthField } from "@/features/auth/components/AuthField";
import { AuthMessage } from "@/features/auth/components/AuthMessage";
import { validatePassword, validateConfirmPassword } from "@/features/auth/lib/validation";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const supabase = createBrowserSupabaseClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  useEffect(() => {
    supabase.auth.getSession().then(() => {
      setReady(true);
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});

    const passwordError = validatePassword(password);
    const confirmError = validateConfirmPassword(password, confirmPassword);

    if (passwordError || confirmError) {
      setFieldErrors({
        password: passwordError || undefined,
        confirmPassword: confirmError || undefined,
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess("Password updated successfully. You can now log in with your new password.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!ready) {
    return (
      <AuthCard title="Preparing reset" description="Please wait while we verify your request...">
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set new password"
      description="Please enter your new password below."
      footer={
        success && (
          <div className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline underline-offset-4 hover:text-primary">
              Go to login
            </Link>
          </div>
        )
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthMessage type="error" message={error} />
        <AuthMessage type="success" message={success} />
        
        <AuthField
          id="password"
          label="New Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          disabled={isLoading || !!success}
          autoComplete="new-password"
        />

        <AuthField
          id="confirmPassword"
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
          disabled={isLoading || !!success}
          autoComplete="new-password"
        />

        <Button type="submit" className="w-full" disabled={isLoading || !!success}>
          {isLoading ? "Updating password..." : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}
