import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function ReviewCard({
  title,
  dek,
  hint,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  dek?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("flex min-h-0 flex-col rounded-lg border border-border bg-surface p-4", className)}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-sans text-sm font-medium tracking-tight text-fg text-balance">{title}</h2>
          {dek ? <p className="mt-1 text-xs leading-relaxed text-muted text-pretty">{dek}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
      {hint ? <p className="mt-3 text-xs leading-relaxed text-subtle text-pretty">{hint}</p> : null}
    </section>
  );
}

export function ReviewEmpty({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted text-pretty">{children}</p>;
}
