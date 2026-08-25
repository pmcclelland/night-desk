const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const usdFine = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export function money(n: number, compact = false) {
  if (!Number.isFinite(n)) return "—";
  return compact && Math.abs(n) >= 10000 ? usdCompact.format(n) : usd.format(n);
}

export function moneyFine(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n >= 1000 ? usd.format(n) : usdFine.format(n);
}

export function px(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return n.toFixed(2);
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

export function qty(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function pct(n: number, signed = true) {
  if (!Number.isFinite(n)) return "—";
  const v = `${n >= 0 && signed ? "+" : ""}${n.toFixed(2)}%`;
  return v;
}

export function signedMoney(n: number) {
  if (!Number.isFinite(n)) return "—";
  const core = usd.format(Math.abs(n));
  if (n > 0) return `+${core}`;
  if (n < 0) return `-${core}`;
  return core;
}

export function vol(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
}

export function clockTime(ts = Date.now()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date(ts));
}

export function clockDate(ts = Date.now()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "2-digit",
  }).format(new Date(ts));
}

export function barTime(ts: number, intraday: boolean) {
  const d = new Date(ts);
  if (intraday) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(d);
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function relativeFill(ts: number) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
}

export function signClass(n: number) {
  if (n > 0.0000001) return "text-up";
  if (n < -0.0000001) return "text-down";
  return "text-muted";
}
