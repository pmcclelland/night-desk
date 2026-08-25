import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("flex h-full min-h-0 min-w-0 flex-col border-border bg-surface", className)}>
      <header className="flex h-7 shrink-0 items-center justify-between gap-2 border-b border-border px-2">
        <h2 className="truncate font-mono text-micro font-medium tracking-widest text-accent uppercase">
          {title}
        </h2>
        {action ? <div className="flex items-center gap-1">{action}</div> : null}
      </header>
      <div className={cn("min-h-0 flex-1 overflow-auto", bodyClassName)}>{children}</div>
    </section>
  );
}
