import { cn } from "@/lib/cn";

export function QuietPair<T extends string | boolean>({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex shrink-0 items-center">
      {options.map((m, i) => (
        <button
          key={String(m.id)}
          type="button"
          onClick={() => onChange(m.id)}
          aria-pressed={value === m.id}
          className={cn(
            "h-6 px-1.5 font-mono text-micro tracking-wide",
            i > 0 && "border-l border-border",
            value === m.id ? "text-accent" : "text-subtle hover:text-fg",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
