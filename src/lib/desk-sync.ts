import { mergeBotTapes } from "@/lib/bot-log";
import { persistDesk, pullDesk } from "@/lib/server/desk-api";
import { useDesk } from "@/lib/store";

let persistTimer: number | null = null;
let hydrating = false;
let lastServerSelected: string | undefined;
let persistGeneration = 0;

export function applyPulledDesk(
  desk: Awaited<ReturnType<typeof pullDesk>>,
  opts?: { keepSelected?: string },
) {
  const local = useDesk.getState();
  const serverSelected = desk.selected;
  const serverUnchanged =
    lastServerSelected !== undefined && serverSelected === lastServerSelected;
  const selected =
    opts?.keepSelected ??
    (serverUnchanged && local.selected !== serverSelected ? local.selected : serverSelected);
  lastServerSelected = serverSelected;
  useDesk.getState().applyServerDesk({
    venue: desk.venue,
    watchlist: desk.watchlist,
    selected,
    sim: desk.sim,
    strategies: desk.strategies,
    botLog: desk.botLog,
    botLogClearedAt: desk.botLogClearedAt,
    risk: desk.risk,
    halted: desk.halted,
    creds: desk.creds,
    hasSecret: desk.hasSecret,
  });
}

export function selectSymbol(symbol: string) {
  const next = symbol.toUpperCase();
  if (!next || useDesk.getState().selected === next) return;
  useDesk.getState().setSelected(next);
  queuePersist();
}

export async function hydrateDesk() {
  if (hydrating) return;
  hydrating = true;
  try {
    const desk = await pullDesk();
    const local = useDesk.getState();
    const tape = mergeBotTapes(
      { lines: local.botLog, clearedAt: local.botLogClearedAt ?? 0 },
      { lines: desk.botLog, clearedAt: desk.botLogClearedAt },
    );
    applyPulledDesk({ ...desk, botLog: tape.lines, botLogClearedAt: tape.clearedAt });
  } catch {
    /* signed out or not owner */
  } finally {
    hydrating = false;
  }
}

export async function persistNow() {
  const generation = ++persistGeneration;
  const selectedAtStart = useDesk.getState().selected;
  const s = useDesk.getState();
  try {
    const desk = await persistDesk({
      data: {
        venue: s.venue,
        watchlist: s.watchlist,
        selected: s.selected,
        sim: s.sim,
        strategies: s.strategies,
        botLog: s.botLog,
        botLogClearedAt: s.botLogClearedAt,
        risk: s.risk,
        halted: s.halted,
      },
    });
    if (generation !== persistGeneration) return;
    const selectedNow = useDesk.getState().selected;
    applyPulledDesk(
      desk,
      selectedNow !== selectedAtStart ? { keepSelected: selectedNow } : undefined,
    );
  } catch {
    /* owner-only */
  }
}

export function queuePersist() {
  if (typeof window === "undefined") return;
  if (persistTimer) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    void persistNow();
  }, 400);
}
