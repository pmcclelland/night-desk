import { createFileRoute } from "@tanstack/react-router";
import { TerminalShell } from "@/components/terminal/shell";

export const Route = createFileRoute("/_desk/")({ component: TradeHome });

function TradeHome() {
  return <TerminalShell />;
}
