import type { BookCurveSnapshot } from "./book-curve.ts";
import type { CurveRange } from "./types.ts";

export const RANGE_PHRASE: Record<CurveRange, string> = {
  "1W": "this week",
  "1M": "this month",
  "3M": "the past three months",
};

export const RANGE_LABEL: Record<CurveRange, string> = {
  "1W": "Week",
  "1M": "Month",
  "3M": "3 months",
};

export function formatPlainPct(n: number, digits = 1) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.abs(n).toFixed(digits)}%`;
}

export function formatPoints(n: number, digits = 1) {
  if (!Number.isFinite(n)) return "—";
  return Math.abs(n).toFixed(digits);
}

/** Sentence for the review hero: book return vs the S&P 500 (SPY). */
export function curveHeadline(snap: BookCurveSnapshot | null): string {
  if (!snap || snap.bookRet == null) {
    return "No performance picture for this window yet.";
  }
  const window = RANGE_PHRASE[snap.range];
  const you =
    snap.bookRet >= 0
      ? `You're up ${formatPlainPct(snap.bookRet)} ${window}`
      : `You're down ${formatPlainPct(snap.bookRet)} ${window}`;
  if (snap.vsSpy == null || snap.spyRet == null) return `${you}.`;
  const vs = snap.vsSpy;
  const bench = "the S&P 500";
  const vsBit =
    Math.abs(vs) < 0.05
      ? `about even with ${bench}`
      : vs > 0
        ? `${formatPoints(vs)} points ahead of ${bench}`
        : `${formatPoints(vs)} points behind ${bench}`;
  return `${you}, ${vsBit}.`;
}

export function directionPlain(direction: string | null): string {
  const d = (direction ?? "").toLowerCase();
  if (d === "long") return "Looking for a rise";
  if (d === "short") return "Looking for a fall";
  return "No direction noted";
}

export function convictionPlain(label: string | null): string {
  switch ((label ?? "").toLowerCase()) {
    case "high":
      return "High confidence";
    case "medium-high":
      return "Fairly confident";
    case "medium":
      return "Moderate confidence";
    case "low":
      return "Low confidence";
    default:
      return "Confidence not set";
  }
}

export function evidencePlain(status: string | null): string {
  switch ((status ?? "").toLowerCase()) {
    case "confirmed":
      return "Supported";
    case "partial":
      return "Partly supported";
    case "open":
      return "Still unproven";
    default:
      return "Evidence not tagged";
  }
}

export function checkpointKindPlain(kind: string): string {
  switch (kind) {
    case "confirm":
      return "Would confirm";
    case "break":
      return "Would break it";
    case "next":
      return "Next check-in";
    case "other":
      return "Watch date";
    default:
      return kind;
  }
}

export function catalystKindPlain(kind: "earn" | "exdiv"): string {
  switch (kind) {
    case "earn":
      return "Earnings";
    case "exdiv":
      return "Ex-dividend";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function catalystWhenPlain(kind: "earn" | "exdiv", detail: string | null): string | null {
  if (kind === "earn") {
    const v = (detail ?? "").trim().toUpperCase();
    if (v === "AMC") return "after the close";
    if (v === "BMO") return "before the open";
    return detail;
  }
  if (kind === "exdiv") {
    return detail ? `you must own it by this date to receive ${detail}` : "you must own it by this date to receive the dividend";
  }
  const _exhaustive: never = kind;
  return _exhaustive;
}

export function thesisAgePlain(ageDays: number, stale: boolean): string {
  if (!Number.isFinite(ageDays) || ageDays < 0) return "No note yet";
  if (stale) return "Needs a fresh look (over 30 days old)";
  if (ageDays < 1) {
    const hours = Math.round(ageDays * 24);
    if (hours <= 0) return "Written earlier today";
    return hours === 1 ? "Written about an hour ago" : `Written about ${hours} hours ago`;
  }
  if (ageDays < 2) return "Written yesterday";
  const days = Math.floor(ageDays);
  return `Written ${days} days ago`;
}

export function humanizeSlug(slug: string | null): string {
  if (!slug) return "Untitled chain";
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function journalSidePlain(side: "long" | "short"): string {
  switch (side) {
    case "long":
      return "Bought, then sold";
    case "short":
      return "Sold short, then covered";
    default: {
      const _exhaustive: never = side;
      return _exhaustive;
    }
  }
}

export function newsAgo(ts: number, now = Date.now()): string {
  if (!Number.isFinite(ts) || ts <= 0) return "";
  const delta = Math.max(0, now - ts);
  const m = Math.round(delta / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  }).format(new Date(ts));
}
