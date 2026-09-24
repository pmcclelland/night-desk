import { createFileRoute } from "@tanstack/react-router";
import { BookReview } from "@/components/terminal/book-review";

export const Route = createFileRoute("/_desk/review")({ component: ReviewHome });

function ReviewHome() {
  return <BookReview />;
}
