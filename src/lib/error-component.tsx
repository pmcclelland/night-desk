import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  // Router >=1.170.41 types `error` as `unknown`; anything thrown can land here.
  const message = error instanceof Error ? error.message : "";
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-down" aria-hidden="true">
        <TriangleAlert className="size-8" strokeWidth={1.75} />
      </span>
      <h1 className="font-mono text-sm tracking-widest uppercase">Desk fault</h1>
      <p className="max-w-md font-mono text-xs break-words text-muted">
        {message || "An unexpected error occurred. Reload the terminal."}
      </p>
    </main>
  );
}
