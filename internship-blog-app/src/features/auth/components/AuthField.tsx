import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React from "react";

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
}

export function AuthField({ id, label, error, className, ...props }: AuthFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={error ? "text-destructive" : ""}>
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        className={`${error ? "border-destructive focus-visible:ring-destructive" : ""} ${className || ""}`}
        {...props}
      />
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
