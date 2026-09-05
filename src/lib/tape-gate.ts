import type { Venue } from "@/lib/types";

/** SNAP drops recurring tape spend. Forced calls are boot snapshots and user actions. */
export function tapePollAllowed(liveFeed: boolean, force = false) {
  return force || liveFeed === true;
}

/**
 * Logged-out public demo: lock SNAP and never spend tape — not even a boot snapshot.
 * Signed-in callers fall through to {@link tapePollAllowed}.
 */
export function sessionTapeAllowed(liveFeed: boolean, guest: boolean, force = false) {
  if (guest) return false;
  return tapePollAllowed(liveFeed, force);
}

/** Logged-out visitors are always SIM. Signed-in keep their stored venue. */
export function sessionVenue(venue: Venue, guest: boolean): Venue {
  return guest ? "sim" : venue;
}

/** Logged-out visitors are always SNAP. Signed-in keep Settings → Updates. */
export function sessionLiveFeed(liveFeed: boolean, guest: boolean) {
  return guest ? false : liveFeed;
}
