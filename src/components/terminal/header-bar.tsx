import { Maximize2, Minimize2, Power, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { clockDate, clockTime, money, pct, signClass, signedMoney } from "@/lib/format";
import { getMarketClock } from "@/lib/market-hours";
import { useNow } from "@/lib/hooks";
import { selectVenue, useDesk, useLiveBook } from "@/lib/store";
import { killSwitch } from "@/lib/sync";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { TapeSource } from "@/lib/types";

const VENUE: Record<string, string> = {
  sim: "SIM",
  "alpaca-paper": "PAPER",
  "alpaca-live": "LIVE",
};

const TAPE: Record<TapeSource, { label: string; title: string }> = {
  alpaca: { label: "IEX", title: "Alpaca Market Data — IEX real-time" },
  yahoo: { label: "YH", title: "Yahoo Finance delayed tape" },
  mixed: { label: "MIX", title: "Alpaca IEX with Yahoo fill-ins" },
  seed: { label: "SEED", title: "Offline seed quotes" },
};

export function HeaderBar() {
  const now = useNow(1000);
  const clock = now ? getMarketClock(now) : null;
  const venue = useDesk(selectVenue);
  const guestDemo = useDesk((s) => s.guestDemo);
  const halted = useDesk((s) => s.halted);
  const tapeSource = useDesk((s) => s.tapeSource);
  const immersive = useDesk((s) => s.immersive);
  const chartFocus = useDesk((s) => s.chartFocus);
  const setImmersive = useDesk((s) => s.setImmersive);
  const setChartFocus = useDesk((s) => s.setChartFocus);
  const { account } = useLiveBook();
  const openSettings = useDesk((s) => s.setSettingsOpen);
  const tape = TAPE[tapeSource];
  const alpacaVenue = venue !== "sim";
  const tapeWarn = alpacaVenue && tapeSource !== "alpaca";

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-bg px-2 md:h-10 md:px-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="font-mono text-xs font-medium tracking-widest text-accent">NIGHTDESK</span>
        <span
          className={cn(
            "font-mono text-micro tracking-widest uppercase",
            venue === "alpaca-live" ? "text-down" : "text-muted",
            !guestDemo && "hidden md:inline",
          )}
        >
          {VENUE[venue]}
        </span>
        <span
          title={tape.title}
          className={cn(
            "font-mono text-micro tracking-widest uppercase",
            tapeWarn ? "text-down" : "text-subtle",
            !guestDemo && "hidden md:inline",
          )}
        >
          {tape.label}
        </span>
        {halted ? (
          <span className="font-mono text-micro tracking-widest text-down uppercase">Halt</span>
        ) : null}
        {chartFocus ? (
          <button
            type="button"
            onClick={() => setChartFocus(false)}
            className="hidden font-mono text-micro tracking-widest text-accent uppercase md:inline"
            title="Exit chart focus"
          >
            Chart
          </button>
        ) : null}
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2 overflow-hidden md:gap-4">
        <div className="hidden items-center gap-2 font-mono text-2xs md:flex">
          <span
            className={cn(
              "size-1.5 rounded-full",
              clock?.session === "open"
                ? "led-live bg-up"
                : clock?.session === "pre" || clock?.session === "post"
                  ? "bg-accent"
                  : "bg-subtle",
            )}
          />
          {clock ? (
            <>
              <span className="text-muted">{clock.label}</span>
              <span suppressHydrationWarning className="tabular-nums text-fg">
                {clockTime(now)}
              </span>
              <span suppressHydrationWarning className="text-subtle">
                {clockDate(now)} ET
              </span>
              <span className="text-subtle">{clock.countdown}</span>
            </>
          ) : (
            <span className="text-subtle">NYSE</span>
          )}
        </div>

        <Stat label="EQ" value={money(account.equity, true)} />
        <Stat label="CASH" value={money(account.cash, true)} className="hidden sm:flex" />
        <Stat
          label="DAY"
          value={`${signedMoney(account.dayPl)} ${pct(account.dayPlPct)}`}
          valueClass={signClass(account.dayPl)}
        />

        <Button
          variant="halt"
          size="sm"
          className="hidden md:inline-flex"
          onClick={() => void killSwitch(false)}
        >
          <Power className="size-3" />
          Kill
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 md:size-7"
          onClick={() => setImmersive(!immersive)}
          aria-label={immersive ? "Exit fullscreen" : "Enter fullscreen"}
          title={immersive ? "Exit fullscreen (Esc)" : "Fullscreen (Shift+F)"}
        >
          {immersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 md:size-7"
          onClick={() => openSettings(true)}
          aria-label="Settings"
        >
          <Settings className="size-4" />
        </Button>
        <OperatorChip />
      </div>
    </header>
  );
}

function OperatorChip() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <span className="hidden h-7 w-16 animate-pulse bg-elevated md:inline-block" />;
  }
  if (!user) {
    return (
      <Link
        to="/login"
        className="font-mono text-micro tracking-widest text-muted uppercase hover:text-fg"
      >
        Sign in
      </Link>
    );
  }
  const label = user.displayName ?? user.primaryEmail ?? "Op";
  return (
    <button
      type="button"
      onClick={() => void signOut()}
      title="Sign out"
      className="hidden max-w-28 truncate font-mono text-micro tracking-widest text-muted uppercase hover:text-fg md:inline"
    >
      {label}
    </button>
  );
}

function Stat({
  label,
  value,
  className,
  valueClass,
}: {
  label: string;
  value: string;
  className?: string;
  valueClass?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col leading-none", className)}>
      <span className="font-mono text-micro tracking-widest text-subtle uppercase">{label}</span>
      <span className={cn("truncate font-mono text-2xs tabular-nums text-fg", valueClass)}>
        {value}
      </span>
    </div>
  );
}
