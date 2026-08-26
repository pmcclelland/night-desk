import { persistDesk, pullDesk } from "@/lib/server/desk-api";
import { useDesk } from "@/lib/store";

let persistTimer: number | null = null;
let hydrating = false;

export function applyPulledDesk(desk: Awaited<ReturnType<typeof pullDesk>>) {
  useDesk.getState().applyServerDesk({
    venue: desk.venue,
    watchlist: desk.watchlist,
    selected: desk.selected,
    sim: desk.sim,
    strategies: desk.strategies,
    botLog: desk.botLog,
    risk: desk.risk,
    halted: desk.halted,
    creds: desk.creds,
    hasSecret: desk.hasSecret,
  });
}

export async function hydrateDesk() {
  if (hydrating) return;
  hydrating = true;
  try {
    const desk = await pullDesk();
    const local = useDesk.getState();
    if (desk.botLog.length === 0 && local.botLog.length > 0) {
      await persistNow();
      return;
    }
    applyPulledDesk(desk);
  } catch {
    /* signed out or not owner */
  } finally {
    hydrating = false;
  }
}

export async function persistNow() {
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
        risk: s.risk,
        halted: s.halted,
      },
    });
    applyPulledDesk(desk);
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
