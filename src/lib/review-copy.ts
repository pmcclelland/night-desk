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
  return titleCaseWords(slug.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim());
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Vault dates, including partials like 2026-08-XX → Aug 2026. */
export function formatVaultDate(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const m = trimmed.match(/^(\d{4})-(\d{2})(?:-(\d{2}|XX))?$/i);
  if (!m) return trimmed;
  const year = m[1];
  const month = Number(m[2]);
  const monthName = MONTH_SHORT[month - 1];
  if (!monthName) return trimmed;
  const day = m[3];
  if (!day || day.toUpperCase() === "XX") return `${monthName} ${year}`;
  return `${monthName} ${Number(day)}, ${year}`;
}

const KEEP_CAPS = new Set([
  "AAPL",
  "AI",
  "AMC",
  "AMD",
  "API",
  "BMO",
  "CEO",
  "CFO",
  "CPI",
  "CPU",
  "CUDA",
  "ETF",
  "EU",
  "FDA",
  "GDP",
  "GPU",
  "IPO",
  "META",
  "MSFT",
  "NFLX",
  "NVDA",
  "SEC",
  "SPY",
  "TSLA",
  "UK",
  "US",
  "USA",
]);

/** Turn shouty vault copy ("CONVICTION DOWNGRADED") into sentence case. */
export function softenShouting(text: string): string {
  return text.replace(/\b[A-Z]{3,}(?:\s+[A-Z]{3,})*\b/g, (block, offset: number) => {
    const words = block.split(/\s+/);
    const atSentence =
      offset === 0 || /[:.!?]\s*$/.test(text.slice(Math.max(0, offset - 2), offset));
    return words
      .map((word, i) => {
        if (KEEP_CAPS.has(word)) return word;
        const lower = word.toLowerCase();
        if (i === 0 && atSentence) return lower.charAt(0).toUpperCase() + lower.slice(1);
        if (i === 0) return lower.charAt(0).toUpperCase() + lower.slice(1);
        return lower;
      })
      .join(" ");
  });
}

const SMALL_TITLE_WORDS = new Set(["a", "an", "and", "at", "by", "for", "in", "of", "on", "or", "the", "to"]);

function titleCaseWords(phrase: string): string {
  const words = phrase.split(/\s+/).filter(Boolean);
  return words
    .map((word, i) => {
      const upper = word.toUpperCase();
      if (KEEP_CAPS.has(upper)) return upper;
      const lower = word.toLowerCase();
      if (i > 0 && SMALL_TITLE_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/** Readable title from a vault slug or URL — never the raw slug. */
export function sourceTitle(ref: string): string {
  const trimmed = ref.trim();
  if (!trimmed) return "Untitled source";
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const host = url.hostname.replace(/^www\./, "");
      const last = url.pathname.split("/").filter(Boolean).at(-1);
      if (!last || last === host) return host;
      return `${host} · ${titleCaseWords(decodeURIComponent(last).replace(/[-_]+/g, " "))}`;
    } catch {
      return trimmed;
    }
  }
  let slug = trimmed.replace(/^\d{4}-\d{2}-(?:\d{2}|XX)-/i, "");
  slug = slug.replace(/^feed-/i, "");
  const parts = slug.split(/[-_]+/).filter(Boolean);
  if (parts.length > 1 && parts[parts.length - 1]!.length <= 2) parts.pop();
  if (parts.length === 0) return "Untitled source";
  return titleCaseWords(parts.join(" "));
}

export function nextCheckInPlain(
  checkpoints: Array<{ kind: string; date: string | null; label: string | null }>,
): string | null {
  const next = checkpoints.find((c) => c.kind === "next") ?? checkpoints.find((c) => c.date) ?? null;
  if (!next) return null;
  const when = formatVaultDate(next.date);
  const raw = next.label?.trim() || null;
  const label = raw && raw.length <= 36 ? raw : null;
  if (when && label) return `Next check-in · ${when} — ${label}`;
  if (when) return `Next check-in · ${when}`;
  if (raw) {
    const clipped = raw.split(/[.(]/)[0]!.trim();
    const short = clipped.length <= 36 ? clipped : `${clipped.slice(0, 33).trimEnd()}…`;
    return `Next check-in · ${short}`;
  }
  return "Next check-in";
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
