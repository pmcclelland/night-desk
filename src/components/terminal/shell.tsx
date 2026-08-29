import { useEffect, useRef } from "react";
import { Group, Panel as RPanel, Separator, useDefaultLayout } from "react-resizable-panels";
import { Toaster } from "sonner";
import { HeaderBar } from "@/components/terminal/header-bar";
import { TickerTape } from "@/components/terminal/ticker-tape";
import { Watchlist } from "@/components/terminal/watchlist";
import { CandleChart } from "@/components/terminal/candle-chart";
import { OrderTicket } from "@/components/terminal/order-ticket";
import { Blotter } from "@/components/terminal/blotter";
import { BotConsole } from "@/components/terminal/bot-console";
import { StrategyLab } from "@/components/terminal/strategy-lab";
import { SettingsDialog } from "@/components/terminal/settings-dialog";
import { useIsDesktop } from "@/lib/hooks";
import { useDesk, type MobileTab } from "@/lib/store";
import { attachLiveFeed, browserClock } from "@/lib/live-feed";
import { refreshAlpaca, refreshBars, refreshQuotes, tickStrategies } from "@/lib/sync";
import { hydrateDesk } from "@/lib/desk-sync";
import {
  exitNativeFullscreen,
  isNativeFullscreen,
  requestNativeFullscreen,
  subscribeFullscreen,
} from "@/lib/fullscreen";
import { cn } from "@/lib/cn";

const TABS: { id: MobileTab; label: string }[] = [
  { id: "watch", label: "Tape" },
  { id: "chart", label: "Chart" },
  { id: "trade", label: "Trade" },
  { id: "book", label: "Book" },
  { id: "bot", label: "Bot" },
];

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function TerminalShell() {
  const desktop = useIsDesktop();
  const selected = useDesk((s) => s.selected);
  const barRange = useDesk((s) => s.barRange);
  const mobileTab = useDesk((s) => s.mobileTab);
  const setMobileTab = useDesk((s) => s.setMobileTab);
  const immersive = useDesk((s) => s.immersive);
  const chartFocus = useDesk((s) => s.chartFocus);
  const liveData = useDesk((s) => s.liveData);
  const rootRef = useRef<HTMLDivElement>(null);

  const live = useRef(false);

  useEffect(() => {
    const s = useDesk.getState();
    if (s.botLog.length === 0) {
      s.log("sys", "NIGHTDESK online. Venue SIM. Type HELP. Freeform goes to the Grok Bot.");
    }
    void hydrateDesk().then(() => {
      live.current = true;
      void refreshQuotes();
      void refreshBars();
      if (useDesk.getState().venue !== "sim") void refreshAlpaca();
    });
  }, []);

  useEffect(() => {
    if (!live.current) return;
    void refreshBars();
  }, [selected, barRange]);

  useEffect(() => {
    if (!liveData) return;
    return attachLiveFeed(
      {
        refreshQuotes: () => void refreshQuotes(),
        refreshAlpaca: () => void refreshAlpaca(),
        tickStrategies: () => void tickStrategies(),
        hydrateDesk: () => void hydrateDesk(),
        isSim: () => useDesk.getState().venue === "sim",
      },
      browserClock(),
    );
  }, [liveData]);

  useEffect(() => {
    return subscribeFullscreen(() => {
      useDesk.getState().setImmersive(isNativeFullscreen());
    });
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (!immersive) {
      if (isNativeFullscreen()) void exitNativeFullscreen();
      return;
    }
    if (isNativeFullscreen()) return;
    void requestNativeFullscreen(el);
  }, [immersive]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        const st = useDesk.getState();
        if (st.chartFocus) {
          st.setChartFocus(false);
          e.preventDefault();
          return;
        }
        if (st.immersive) {
          st.setImmersive(false);
          e.preventDefault();
        }
        return;
      }
      if (isTypingTarget(e.target)) return;
      if (e.key === "F" && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        useDesk.getState().setImmersive(!useDesk.getState().immersive);
        return;
      }
      if ((e.key === "f" || e.key === "F") && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        useDesk.getState().toggleChartFocus();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const hideChrome = immersive || chartFocus;

  return (
    <div
      ref={rootRef}
      className={cn("flex h-dvh flex-col overflow-hidden bg-bg text-fg", immersive && "desk-fs")}
    >
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          className: "bg-elevated text-fg border-border font-mono text-xs rounded-none",
        }}
      />
      <SettingsDialog />
      <HeaderBar />
      {chartFocus ? null : <TickerTape />}
      {desktop ? (
        <DesktopLayout chartFocus={chartFocus} />
      ) : (
        <MobileLayout
          tab={mobileTab}
          setTab={setMobileTab}
          chartFocus={chartFocus}
          hideNav={hideChrome}
        />
      )}
    </div>
  );
}

function DesktopLayout({ chartFocus }: { chartFocus: boolean }) {
  const main = useDefaultLayout({
    id: "nightdesk-desk",
    panelIds: ["top", "bottom"],
  });
  const top = useDefaultLayout({ id: "nightdesk-top", panelIds: ["watch", "chart", "ticket"] });
  const bot = useDefaultLayout({ id: "nightdesk-bot", panelIds: ["book", "algos", "console"] });

  if (chartFocus) {
    return (
      <div className="min-h-0 flex-1">
        <CandleChart />
      </div>
    );
  }

  return (
    <Group
      orientation="vertical"
      className="min-h-0 flex-1"
      defaultLayout={main.defaultLayout}
      onLayoutChanged={main.onLayoutChanged}
    >
      <RPanel id="top" defaultSize="64%" minSize="30%">
        <Group
          orientation="horizontal"
          className="h-full"
          defaultLayout={top.defaultLayout}
          onLayoutChanged={top.onLayoutChanged}
        >
          <RPanel id="watch" defaultSize="20%" minSize="14%">
            <Watchlist />
          </RPanel>
          <Separator className="w-px bg-border" />
          <RPanel id="chart" defaultSize="56%" minSize="30%">
            <div className="h-full min-h-0 border-x border-border">
              <CandleChart />
            </div>
          </RPanel>
          <Separator className="w-px bg-border" />
          <RPanel id="ticket" defaultSize="24%" minSize="18%">
            <OrderTicket />
          </RPanel>
        </Group>
      </RPanel>
      <Separator className="h-px bg-border" />
      <RPanel id="bottom" defaultSize="36%" minSize="18%">
        <Group
          orientation="horizontal"
          className="h-full"
          defaultLayout={bot.defaultLayout}
          onLayoutChanged={bot.onLayoutChanged}
        >
          <RPanel id="book" defaultSize="34%" minSize="18%">
            <Blotter />
          </RPanel>
          <Separator className="w-px bg-border" />
          <RPanel id="algos" defaultSize="24%" minSize="16%">
            <StrategyLab />
          </RPanel>
          <Separator className="w-px bg-border" />
          <RPanel id="console" defaultSize="42%" minSize="22%">
            <BotConsole />
          </RPanel>
        </Group>
      </RPanel>
    </Group>
  );
}

function MobileLayout({
  tab,
  setTab,
  chartFocus,
  hideNav,
}: {
  tab: MobileTab;
  setTab: (t: MobileTab) => void;
  chartFocus: boolean;
  hideNav: boolean;
}) {
  const active = chartFocus ? "chart" : tab;
  return (
    <>
      <div className="min-h-0 flex-1 overflow-hidden">
        {active === "watch" ? <Watchlist /> : null}
        {active === "chart" ? <CandleChart /> : null}
        {active === "trade" ? <OrderTicket /> : null}
        {active === "book" ? <Blotter /> : null}
        {active === "bot" ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-[2]">
              <BotConsole />
            </div>
            <div className="min-h-0 flex-1 border-t border-border">
              <StrategyLab />
            </div>
          </div>
        ) : null}
      </div>
      {hideNav ? null : (
        <nav className="grid h-14 shrink-0 grid-cols-5 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "font-mono text-micro tracking-widest uppercase",
                tab === t.id ? "text-accent" : "text-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </>
  );
}
