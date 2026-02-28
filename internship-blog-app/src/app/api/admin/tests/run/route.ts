import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";

export const runtime = "nodejs";

type AllowedScript = "test" | "test:e2e";
type TestResultStatus = "passed" | "failed" | "skipped";

type StreamEvent =
  | { type: "start"; message: string; script: AllowedScript }
  | { type: "line"; line: string }
  | { type: "test_result"; status: TestResultStatus; name: string }
  | { type: "progress"; completed: number; total: number | null; currentTest: string | null }
  | { type: "end"; success: boolean; message: string; exitCode: number | null; failedTargets: string[] }
  | { type: "error"; message: string };

type ProgressTracker = {
  completed: number;
  total: number | null;
  currentTest: string | null;
};

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not authenticated" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,role,status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin" || profile?.status !== "active") {
    return { error: "Not authorized" };
  }

  return { error: null };
}

function stripAnsi(value: string) {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

function updateProgressFromLine(script: AllowedScript, line: string, tracker: ProgressTracker) {
  const clean = stripAnsi(line).trim();
  if (!clean) return false;

  let changed = false;

  if (script === "test:e2e") {
    const runningMatch = clean.match(/Running\s+(\d+)\s+tests?/i);
    if (runningMatch) {
      tracker.total = Number(runningMatch[1]);
      changed = true;
    }

    const progressMatch = clean.match(/\[(\d+)\/(\d+)\]/);
    if (progressMatch) {
      tracker.completed = Number(progressMatch[1]);
      tracker.total = Number(progressMatch[2]);
      changed = true;
    }

    const testNameMatch = clean.match(/›\s(.+)$/);
    if (testNameMatch) {
      tracker.currentTest = testNameMatch[1];
      changed = true;
    }
  } else {
    const lineStartsWithResult = /^(?:✓|✗|×)\s+/.test(clean);
    if (lineStartsWithResult) {
      tracker.completed += 1;
      tracker.currentTest = clean.replace(/^(?:✓|✗|×)\s+/, "");
      changed = true;
    }

    const filesMatch = clean.match(/Test Files\s+\d+\s+passed(?:\s+\|\s+\d+\s+failed)?\s+\((\d+)\)/i);
    if (filesMatch) {
      tracker.total = Number(filesMatch[1]);
      changed = true;
    }
  }

  return changed;
}

function parseScript(input: unknown): AllowedScript | null {
  if (input === "test" || input === "test:e2e") return input;
  return null;
}

function sanitizeFailedTargets(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  const unique = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const value = String(raw ?? "").trim();
    if (!value) continue;
    if (!/^[\w./\\:-]+$/.test(value)) continue;
    if (
      !value.includes(".test.") &&
      !value.includes(".spec.") &&
      !value.endsWith(".ts") &&
      !value.endsWith(".tsx") &&
      !value.endsWith(".js")
    ) {
      continue;
    }
    if (unique.has(value)) continue;
    unique.add(value);
    out.push(value);
  }
  return out;
}

function parseTestResultEvent(
  script: AllowedScript,
  line: string
): { status: TestResultStatus; name: string; failedTarget?: string } | null {
  const clean = stripAnsi(line).trim();
  if (!clean) return null;

  if (script === "test") {
    const vitestMatch = clean.match(/^(✓|✗|×)\s+(.+)$/);
    if (!vitestMatch) return null;

    const status: TestResultStatus = vitestMatch[1] === "✓" ? "passed" : "failed";
    const name = vitestMatch[2].trim();
    const fileMatch = name.match(/^([^>]+?\.(?:test|spec)\.[^ >]+)/i);

    return {
      status,
      name,
      failedTarget: status === "failed" ? fileMatch?.[1]?.trim() : undefined,
    };
  }

  const playwrightMatch = clean.match(/^(✓|✘|x|-)\s+\d+\s+(.+)$/i);
  if (!playwrightMatch) return null;

  const symbol = playwrightMatch[1].toLowerCase();
  const name = playwrightMatch[2].trim();
  const status: TestResultStatus =
    symbol === "✓" ? "passed" : symbol === "-" ? "skipped" : "failed";
  const fileMatch = name.match(/›\s+([^:]+\.spec\.[^:\s]+)/i);

  return {
    status,
    name,
    failedTarget: status === "failed" ? fileMatch?.[1]?.trim() : undefined,
  };
}

export async function POST(request: NextRequest) {
  const isProduction = process.env.IS_PRODUCTION === "true";
  if (isProduction) {
    return NextResponse.json({ error: "Test runner is disabled in production" }, { status: 403 });
  }

  const adminCheck = await requireAdminUser();
  if (adminCheck.error) {
    return NextResponse.json({ error: adminCheck.error }, { status: 403 });
  }

  let script: AllowedScript | null = null;
  let rerunFailed = false;
  let failedTargets: string[] = [];
  try {
    const body = (await request.json()) as {
      script?: string;
      rerunFailed?: boolean;
      failedTargets?: unknown[];
    };
    script = parseScript(body?.script);
    rerunFailed = Boolean(body?.rerunFailed);
    failedTargets = sanitizeFailedTargets(body?.failedTargets);
  } catch {
    script = null;
  }

  if (!script) {
    return NextResponse.json({ error: "Invalid test command" }, { status: 400 });
  }

  if (rerunFailed && script === "test" && failedTargets.length === 0) {
    return NextResponse.json({ error: "No failed unit tests available to re-run" }, { status: 400 });
  }

  const timeoutMs = script === "test:e2e" ? 300_000 : 120_000;
  const isWindows = process.platform === "win32";
  const command = isWindows ? "cmd.exe" : "npm";

  const unitBaseArgs = ["run", "test", "--", "--reporter=verbose"];
  const unitArgs = rerunFailed && script === "test" ? [...unitBaseArgs, ...failedTargets] : unitBaseArgs;
  const e2eArgs = rerunFailed && script === "test:e2e"
    ? ["run", "test:e2e", "--", "--last-failed"]
    : ["run", "test:e2e"];

  const winArgs = script === "test" ? unitArgs : e2eArgs;
  const windowsCommandString = `npm ${winArgs.join(" ")}`;

  const args = isWindows
    ? ["/d", "/s", "/c", windowsCommandString]
    : script === "test"
      ? unitArgs
      : e2eArgs;

  const encoder = new TextEncoder();
  let child: ChildProcessWithoutNullStreams | null = null;
  const tracker: ProgressTracker = { completed: 0, total: null, currentTest: null };
  const failedTargetSet = new Set<string>();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (event: StreamEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      const closeStream = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };
      const sendProgress = () => {
        send({
          type: "progress",
          completed: tracker.completed,
          total: tracker.total,
          currentTest: tracker.currentTest,
        });
      };

      send({
        type: "start",
        message: rerunFailed ? `Running failed tests only: npm run ${script}` : `Running npm run ${script}`,
        script,
      });

      child = spawn(command, args, {
        cwd: process.cwd(),
        windowsHide: true,
      });

      const handleLine = (rawLine: string) => {
        const line = rawLine.replace(/\r/g, "");
        if (!line.trim()) return;

        send({ type: "line", line });

        const resultEvent = parseTestResultEvent(script, line);
        if (resultEvent) {
          send({ type: "test_result", status: resultEvent.status, name: resultEvent.name });
          if (resultEvent.failedTarget) {
            failedTargetSet.add(resultEvent.failedTarget);
          }
        }

        if (updateProgressFromLine(script, line, tracker)) {
          sendProgress();
        }
      };

      const attachLineReader = (streamData: NodeJS.ReadableStream) => {
        let buffered = "";
        streamData.on("data", (chunk: Buffer | string) => {
          buffered += chunk.toString();
          const parts = buffered.split("\n");
          buffered = parts.pop() ?? "";
          for (const line of parts) {
            handleLine(line);
          }
        });
        streamData.on("end", () => {
          if (buffered.trim()) {
            handleLine(buffered);
          }
        });
      };

      attachLineReader(child.stdout);
      attachLineReader(child.stderr);

      const timeout = setTimeout(() => {
        child?.kill();
        send({ type: "error", message: `Timed out after ${Math.round(timeoutMs / 1000)}s` });
      }, timeoutMs);

      const abortHandler = () => {
        child?.kill();
        clearTimeout(timeout);
        send({ type: "error", message: "Test run aborted by client" });
      };

      request.signal.addEventListener("abort", abortHandler);

      child.on("error", (error) => {
        clearTimeout(timeout);
        send({ type: "error", message: error.message || "Failed to start test command" });
        closeStream();
      });

      child.on("close", (code) => {
        clearTimeout(timeout);
        request.signal.removeEventListener("abort", abortHandler);
        send({
          type: "end",
          success: code === 0,
          message: code === 0 ? `Completed: npm run ${script}` : `Failed: npm run ${script}`,
          exitCode: code,
          failedTargets: [...failedTargetSet],
        });
        closeStream();
      });
    },
    cancel() {
      child?.kill();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
