import type { MarketClock, MarketSession } from "@/lib/types";

function nyParts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const minutes =
    Number(map.hour) * 60 + Number(map.minute) + Number(map.second) / 60;
  const weekend = map.weekday === "Sat" || map.weekday === "Sun";
  return { minutes, weekend, weekday: map.weekday ?? "" };
}

const PRE = 4 * 60;
const OPEN = 9 * 60 + 30;
const CLOSE = 16 * 60;
const POST = 20 * 60;

function sessionAt(minutes: number, weekend: boolean): MarketSession {
  if (weekend) return "closed";
  if (minutes >= OPEN && minutes < CLOSE) return "open";
  if (minutes >= PRE && minutes < OPEN) return "pre";
  if (minutes >= CLOSE && minutes < POST) return "post";
  return "closed";
}

function minutesToNext(minutes: number, weekend: boolean): number {
  if (weekend) {
    // Rough: next Monday 09:30. Caller formats the countdown.
    const days = nyParts(new Date()).weekday === "Sat" ? 2 : 1;
    return days * 24 * 60 - minutes + OPEN;
  }
  if (minutes < PRE) return PRE - minutes;
  if (minutes < OPEN) return OPEN - minutes;
  if (minutes < CLOSE) return CLOSE - minutes;
  if (minutes < POST) return POST - minutes;
  return 24 * 60 - minutes + PRE;
}

function formatCountdown(totalMin: number) {
  const m = Math.max(0, Math.round(totalMin));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h <= 0) return `${mm}m`;
  return `${h}h ${mm.toString().padStart(2, "0")}m`;
}

const LABELS: Record<MarketSession, string> = {
  pre: "PRE-MARKET",
  open: "MARKET OPEN",
  post: "AFTER HOURS",
  closed: "CLOSED",
};

export function getMarketClock(now = Date.now()): MarketClock {
  const parts = nyParts(new Date(now));
  const session = sessionAt(parts.minutes, parts.weekend);
  const until = minutesToNext(parts.minutes, parts.weekend);
  const nextLabel =
    session === "pre"
      ? "open"
      : session === "open"
        ? "close"
        : session === "post"
          ? "bell"
          : "pre";
  return {
    session,
    timestamp: now,
    nextChange: now + until * 60_000,
    label: LABELS[session],
    countdown: `${formatCountdown(until)} to ${nextLabel}`,
  };
}

export function isRegularOpen(clock: MarketClock) {
  return clock.session === "open";
}
