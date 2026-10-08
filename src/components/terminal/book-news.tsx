import { ReviewCard, ReviewEmpty } from "@/components/terminal/review-card";
import { newsAgo } from "@/lib/review-copy";
import type { NewsItem } from "@/lib/news";

export function BookNews({
  items,
  loading,
  failed,
}: {
  items: NewsItem[];
  loading: boolean;
  failed: boolean;
}) {
  return (
    <ReviewCard
      title="News"
      dek="Headlines for names you hold or watch, from Yahoo Finance."
    >
      {loading && items.length === 0 ? (
        <ReviewEmpty>Looking up headlines…</ReviewEmpty>
      ) : failed && items.length === 0 ? (
        <ReviewEmpty>Couldn't load headlines right now. Try again in a bit.</ReviewEmpty>
      ) : items.length === 0 ? (
        <ReviewEmpty>No recent headlines for these names.</ReviewEmpty>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="min-w-0">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block min-w-0 text-sm leading-snug text-fg text-pretty hover:text-accent"
              >
                {item.title}
              </a>
              <p className="mt-1 text-xs text-muted">
                {item.tickers.slice(0, 3).join(" · ")}
                {item.publisher ? ` · ${item.publisher}` : ""}
                {item.publishedAt ? ` · ${newsAgo(item.publishedAt)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </ReviewCard>
  );
}
