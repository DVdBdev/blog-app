import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import React from "react";

interface AuthMessageProps {
  type: "error" | "success";
  message: string;
  title?: string;
}

export function AuthMessage({ type, message, title }: AuthMessageProps) {
  if (!message) return null;

  const isError = type === "error";

  return (
    <Alert variant={isError ? "destructive" : "default"} className={!isError ? "border-green-500 text-green-600 dark:text-green-400" : ""}>
      {isError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 !text-green-600 dark:!text-green-400" />}
      <AlertTitle>{title || (isError ? "Error" : "Success")}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
