import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-down" aria-hidden="true">
        <TriangleAlert className="size-8" strokeWidth={1.75} />
      </span>
      <h1 className="font-mono text-sm tracking-widest uppercase">Desk fault</h1>
      <p className="max-w-md font-mono text-xs break-words text-muted">
        {error.message || "An unexpected error occurred. Reload the terminal."}
      </p>
    </main>
  );
}
