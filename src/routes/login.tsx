import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { authEnabled, signInWithGoogle } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg">
        <p className="font-mono text-xs tracking-widest text-muted">NIGHTDESK</p>
      </main>
    );
  }
  if (user) return <Navigate to="/" />;

  async function onGoogle() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle({ callbackURL: "/", errorCallbackURL: "/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center overflow-auto bg-bg px-6 py-16 text-fg">
      <div className="w-full max-w-sm">
        <p className="font-mono text-xs font-medium tracking-[0.18em] text-accent">NIGHTDESK</p>
        <h1 className="mt-4 font-mono text-3xl font-medium tracking-tight text-fg">
          Sign in to the desk.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Single operator. Continue with Google. The first account to sign in claims the desk.
        </p>

        <div className="mt-8 space-y-2">
          {authEnabled ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                disabled={busy}
                onClick={() => void onGoogle()}
              >
                Continue with Google
              </Button>
              {error ? <p className="font-mono text-2xs text-down">{error}</p> : null}
            </>
          ) : (
            <p className="font-mono text-2xs text-muted">Sign-in is disabled.</p>
          )}
        </div>
      </div>
    </main>
  );
}
