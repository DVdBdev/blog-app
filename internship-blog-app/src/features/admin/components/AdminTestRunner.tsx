"use client";

import { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AllowedScript = "test" | "test:e2e";
type TestResultStatus = "passed" | "failed" | "skipped";

type StreamEvent =
  | { type: "start"; message: string; script: AllowedScript }
  | { type: "line"; line: string }
  | { type: "test_result"; status: TestResultStatus; name: string }
  | { type: "progress"; completed: number; total: number | null; currentTest: string | null }
  | { type: "end"; success: boolean; message: string; exitCode: number | null; failedTargets: string[] }
  | { type: "error"; message: string };

type AdminTestRunUiState = {
  running: boolean;
  status: "idle" | "success" | "error";
  message: string;
  output: string;
  scriptLabel: string;
  progress: number;
  currentTest: string;
  activeScript: AllowedScript | null;
  lastScript: AllowedScript | null;
  failedTargets: string[];
  passed: number;
  failed: number;
  skipped: number;
};

const initialAdminTestRunState: AdminTestRunUiState = {
  running: false,
  status: "idle",
  message: "",
  output: "",
  scriptLabel: "",
  progress: 0,
  currentTest: "",
  activeScript: null,
  lastScript: null,
  failedTargets: [],
  passed: 0,
  failed: 0,
  skipped: 0,
};

function scriptToLabel(script: AllowedScript) {
  return script === "test:e2e" ? "e2e tests" : "unit/integration tests";
}

export function AdminTestRunner() {
  const [state, setState] = useState(initialAdminTestRunState);
  const abortRef = useRef<AbortController | null>(null);

  const progressLabel = useMemo(() => `${Math.max(0, Math.min(100, state.progress))}%`, [state.progress]);
  const canRerunFailed = !state.running && !!state.lastScript && state.failed > 0;

  const appendOutput = (prev: string, line: string) => {
    const next = prev ? `${prev}\n${line}` : line;
    return next.slice(-20_000);
  };

  const cancelRun = () => {
    if (!state.running) return;
    abortRef.current?.abort();
    setState((prev) => ({
      ...prev,
      message: "Cancelling test run...",
    }));
  };

  const runTests = async (script: AllowedScript, rerunFailed = false) => {
    if (state.running) return;

    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    const scriptLabel = scriptToLabel(script);

    setState((prev) => ({
      ...prev,
      running: true,
      status: "idle",
      message: rerunFailed ? `Re-running failed ${scriptLabel}...` : `Starting ${scriptLabel}...`,
      output: "",
      scriptLabel,
      progress: 5,
      currentTest: "",
      activeScript: script,
      passed: 0,
      failed: 0,
      skipped: 0,
      failedTargets: [],
    }));

    try {
      const response = await fetch("/api/admin/tests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script,
          rerunFailed,
          failedTargets: rerunFailed && script === "test" ? state.failedTargets : undefined,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        let message = "Failed to start test run";
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          // ignore JSON parse failures
        }
        setState((prev) => ({
          ...prev,
          running: false,
          status: "error",
          message,
          progress: 100,
          activeScript: null,
        }));
        return;
      }

      if (!response.body) {
        setState((prev) => ({
          ...prev,
          running: false,
          status: "error",
          message: "Streaming output is not available in this browser.",
          progress: 100,
          activeScript: null,
        }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffered = "";
      let didReceiveEnd = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffered += decoder.decode(value, { stream: true });
        const lines = buffered.split("\n");
        buffered = lines.pop() ?? "";

        for (const rawLine of lines) {
          if (!rawLine.trim()) continue;

          let event: StreamEvent | null = null;
          try {
            event = JSON.parse(rawLine) as StreamEvent;
          } catch {
            event = null;
          }
          if (!event) continue;

          if (event.type === "line") {
            setState((prev) => ({
              ...prev,
              output: appendOutput(prev.output, event.line),
            }));
            continue;
          }

          if (event.type === "start") {
            setState((prev) => ({
              ...prev,
              message: event.message,
              activeScript: event.script,
              scriptLabel: scriptToLabel(event.script),
            }));
            continue;
          }

          if (event.type === "test_result") {
            setState((prev) => ({
              ...prev,
              passed: prev.passed + (event.status === "passed" ? 1 : 0),
              failed: prev.failed + (event.status === "failed" ? 1 : 0),
              skipped: prev.skipped + (event.status === "skipped" ? 1 : 0),
            }));
            continue;
          }

          if (event.type === "progress") {
            setState((prev) => ({
              ...prev,
              progress:
                event.total && event.total > 0
                  ? Math.min(95, Math.max(10, Math.round((event.completed / event.total) * 95)))
                  : Math.min(95, prev.progress + 1),
              currentTest: event.currentTest ?? prev.currentTest,
            }));
            continue;
          }

          if (event.type === "error") {
            setState((prev) => ({
              ...prev,
              running: false,
              status: "error",
              message: event.message,
              progress: 100,
              activeScript: null,
            }));
            continue;
          }

          if (event.type === "end") {
            didReceiveEnd = true;
            setState((prev) => ({
              ...prev,
              running: false,
              status: event.success ? "success" : "error",
              message: event.message,
              progress: 100,
              activeScript: null,
              lastScript: script,
              failedTargets: event.failedTargets ?? [],
            }));
          }
        }
      }

      if (!didReceiveEnd) {
        setState((prev) => ({
          ...prev,
          running: false,
          status: "error",
          message: "Test stream ended unexpectedly.",
          progress: 100,
          activeScript: null,
        }));
      }
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "Test run cancelled."
          : "An unexpected error occurred while running tests.";

      setState((prev) => ({
        ...prev,
        running: false,
        status: "error",
        message,
        progress: 100,
        activeScript: null,
      }));
    }
  };

  return (
    <section className="surface-card p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Test Runner</h2>
        <p className="text-sm text-muted-foreground">
          Runs project test scripts from the server in this environment. Use for local/admin diagnostics only.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => runTests("test")} disabled={state.running}>
          Run unit/integration tests
        </Button>
        <Button type="button" onClick={() => runTests("test:e2e")} variant="outline" disabled={state.running}>
          Run e2e tests
        </Button>
        <Button
          type="button"
          onClick={() => state.lastScript && runTests(state.lastScript, true)}
          variant="outline"
          disabled={!canRerunFailed}
        >
          Re-run failed only
        </Button>
        <Button type="button" onClick={cancelRun} variant="outline" disabled={!state.running}>
          Cancel run
        </Button>
      </div>

      {(state.running || state.status !== "idle") && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{state.running ? `Running ${state.scriptLabel}...` : "Run complete"}</span>
            <span>{progressLabel}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all duration-300 ${state.status === "error" ? "bg-red-500" : "bg-primary"}`}
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Current test: {state.currentTest || (state.running ? "Waiting for test output..." : "N/A")}
          </p>
        </div>
      )}

      {(state.running || state.status !== "idle") && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Passed: {state.passed}</Badge>
          <Badge variant={state.failed > 0 ? "destructive" : "secondary"} className={state.failed > 0 ? "text-white" : undefined}>
            Failed: {state.failed}
          </Badge>
          <Badge variant="secondary">Skipped: {state.skipped}</Badge>
        </div>
      )}

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

