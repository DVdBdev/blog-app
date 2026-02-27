"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { runAdminTestsAction } from "@/features/admin/admin.actions";

type AdminTestRunState = {
  status: "idle" | "success" | "error";
  message: string;
  output: string;
};

const initialAdminTestRunState: AdminTestRunState = {
  status: "idle",
  message: "",
  output: "",
};

export function AdminTestRunner() {
  const [state, formAction, isPending] = useActionState(runAdminTestsAction, initialAdminTestRunState);

  return (
    <section className="surface-card p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Test Runner</h2>
        <p className="text-sm text-muted-foreground">
          Runs project test scripts from the server in this environment. Use for local/admin diagnostics only.
        </p>
      </div>

      <form action={formAction} className="flex flex-wrap gap-2">
        <Button type="submit" name="script" value="test" disabled={isPending}>
          Run unit/integration tests
        </Button>
        <Button type="submit" name="script" value="test:e2e" variant="outline" disabled={isPending}>
          Run e2e tests
        </Button>
      </form>

      {state.message ? (
        <div className="space-y-2">
          <p className={`text-sm ${state.status === "error" ? "text-red-400" : "text-green-400"}`}>{state.message}</p>
          {state.output ? (
            <pre className="max-h-80 overflow-auto rounded-md border border-border bg-background p-3 text-xs">
              {state.output}
            </pre>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
