import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DeskSession } from "@/components/terminal/desk-session";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { signOut } from "@/lib/auth/client";
import { getDeskAccess } from "@/lib/server/desk-api";
import { useDesk } from "@/lib/store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_desk")({ component: DeskLayout });

function DeskLayout() {
  const { user, isPending } = useCurrentUserState();
  const [access, setAccess] = useState<{ owner: boolean } | null>(null);
  const userId = user?.id;
  const guest = !isPending && !user;

  if (!isPending) {
    const next = !user;
    if (useDesk.getState().guestDemo !== next) {
      useDesk.getState().setGuestDemo(next);
    }
  }

  useLayoutEffect(() => {
    if (isPending) return;
    useDesk.getState().setGuestDemo(!user);
  }, [isPending, user]);

  useEffect(() => {
    if (!userId) {
      setAccess(null);
      return;
    }
    let live = true;
    void getDeskAccess()
      .then((a) => {
        if (!live) return;
        setAccess((prev) => (prev?.owner === a.owner ? prev : { owner: a.owner }));
      })
      .catch(() => {
        if (live) setAccess((prev) => (prev?.owner === false ? prev : { owner: false }));
      });
    return () => {
      live = false;
    };
  }, [userId]);

  if (isPending) {
    return <Splash text="NIGHTDESK" />;
  }
  if (guest) {
    return (
      <DeskSession guest>
        <Outlet />
      </DeskSession>
    );
  }
  if (!access) {
    return <Splash text="Claiming desk…" />;
  }
  if (!access.owner) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
        <div className="max-w-sm">
          <p className="font-mono text-xs tracking-[0.18em] text-accent">NIGHTDESK</p>
          <h1 className="mt-4 font-mono text-2xl font-medium">This desk is claimed.</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            NightDesk is a single-operator terminal. Sign out and use the owner account.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </main>
    );
  }

  return (
    <DeskSession>
      <Outlet />
    </DeskSession>
  );
}

function Splash({ text }: { text: ReactNode }) {
  return (
    <div className="grid h-dvh place-items-center bg-bg text-fg">
      <p className="font-mono text-xs tracking-widest text-muted">{text}</p>
    </div>
  );
}
