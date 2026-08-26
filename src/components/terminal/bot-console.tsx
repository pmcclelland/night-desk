import { useEffect, useRef, useState } from "react";
import { clockTime } from "@/lib/format";
import { useDesk } from "@/lib/store";
import { runConsole } from "@/lib/sync";
import { Panel } from "@/components/terminal/panel";
import { cn } from "@/lib/cn";

const KIND: Record<string, string> = {
  cmd: "text-accent",
  fill: "text-up",
  signal: "text-accent",
  sys: "text-muted",
  err: "text-down",
  ai: "text-fg",
};

export function BotConsole() {
  const log = useDesk((s) => s.botLog);
  const halted = useDesk((s) => s.halted);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        input.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function send() {
    const v = text.trim();
    if (!v || busy) return;
    setText("");
    setBusy(true);
    await runConsole(v);
    setBusy(false);
  }

  return (
    <Panel title={halted ? "Bot · Halted" : "Bot"} bodyClassName="flex min-h-0 flex-col overflow-hidden">
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto px-2 py-1 font-mono text-2xs leading-5">
        {log.map((line) => (
          <div key={line.id} className="flex gap-2">
            <span className="shrink-0 text-subtle tabular-nums">{clockTime(line.t).slice(0, 8)}</span>
            <span className={cn("whitespace-pre-wrap break-words", KIND[line.kind] ?? "text-fg")}>
              {line.kind === "cmd" ? `› ${line.text}` : line.text}
            </span>
          </div>
        ))}
      </div>
      <form
        className="flex h-11 shrink-0 items-center gap-2 border-t border-border px-2 md:h-9"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <span className="text-accent">›</span>
        <input
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="BUY 10 NVDA  ·  what’s my risk if I buy 5 NVDA"
          className="h-full min-w-0 flex-1 bg-transparent font-mono text-xs text-fg outline-none placeholder:text-subtle"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
        />
        {busy ? <span className="console-cursor h-3 w-1.5 bg-accent" /> : null}
      </form>
    </Panel>
  );
}
