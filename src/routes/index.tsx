import { createFileRoute } from "@tanstack/react-router";
import { TerminalShell } from "@/components/terminal/shell";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <TerminalShell />;
}
