import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { HeaderBar } from "@/components/terminal/header-bar";
import { SettingsDialog } from "@/components/terminal/settings-dialog";
import { isTypingTarget } from "@/lib/keys";
import { selectLiveFeed, selectVenue, useDesk } from "@/lib/store";
import { startLiveLoop, stopLiveLoop } from "@/lib/live-loop";
import { refreshAlpaca, refreshQuotes, tickStrategies } from "@/lib/sync";
import { hydrateDesk } from "@/lib/desk-sync";
import {
  exitNativeFullscreen,
  isNativeFullscreen,
  requestNativeFullscreen,
  subscribeFullscreen,
} from "@/lib/fullscreen";
import { cn } from "@/lib/cn";

export function DeskSession({ guest = false, children }: { guest?: boolean; children: ReactNode }) {
  const liveFeed = useDesk(selectLiveFeed);
  const immersive = useDesk((s) => s.immersive);
  const rootRef = useRef<HTMLDivElement>(null);
  const live = useRef(false);
  const [booted, setBooted] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useLayoutEffect(() => {
    useDesk.getState().setGuestDemo(guest);
  }, [guest]);

  useEffect(() => {
    let cancelled = false;
    const s = useDesk.getState();
    if (s.botLog.length === 0) {
      s.log(
        "sys",
        guest
          ? "NIGHTDESK online. Venue SIM (public demo). Yahoo tape LIVE. Sign in for paper/live."
          : "NIGHTDESK online. Venue SIM. Type HELP. Freeform goes to the Grok Bot.",
      );
    }
    if (guest) {
      live.current = true;
      setBooted(true);
      void refreshQuotes({ force: true });
      return;
    }
    void hydrateDesk({ force: true }).then(() => {
      if (cancelled) return;
      live.current = true;
      setBooted(true);
      void refreshQuotes({ force: true });
      if (selectVenue(useDesk.getState()) !== "sim") void refreshAlpaca({ force: true });
    });
    return () => {
      cancelled = true;
    };
  }, [guest]);

  useEffect(() => {
    if (!booted || !live.current) return;
    if (!liveFeed) {
      stopLiveLoop();
      return;
    }
    const refreshBook = () => {
      if (selectVenue(useDesk.getState()) !== "sim") void refreshAlpaca();
    };
    void refreshQuotes();
    refreshBook();
    return startLiveLoop({
      refreshQuotes: () => void refreshQuotes(),
      refreshAlpaca: refreshBook,
      tickStrategies: () => void tickStrategies(),
      hydrateDesk: () => void hydrateDesk(),
      isLive: () => selectLiveFeed(useDesk.getState()),
    });
  }, [liveFeed, booted]);

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
      if ((e.key === "p" || e.key === "P") && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        useDesk.getState().setChartFocus(false);
        const review = pathname === "/review";
        void navigate({ to: review ? "/" : "/review" });
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [navigate, pathname]);

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
      {children}
    </div>
  );
}
