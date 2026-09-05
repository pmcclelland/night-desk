import type { Venue } from "@/lib/types";

/** SNAP drops recurring tape spend. Forced calls are boot snapshots and user actions. */
export function tapePollAllowed(liveFeed: boolean, force = false) {
  return force || liveFeed === true;
}

/**
 * Quote/bar polls. Guests are forced LIVE (real tape). Signed-in use Settings.
 * Hydrate/persist stay guest-blocked at the call site — this gate is tape only.
 */
export function sessionTapeAllowed(liveFeed: boolean, guest: boolean, force = false) {
  return tapePollAllowed(sessionLiveFeed(liveFeed, guest), force);
}

/** Logged-out visitors are always SIM. Signed-in keep their stored venue. */
export function sessionVenue(venue: Venue, guest: boolean): Venue {
  return guest ? "sim" : venue;
}

/** Logged-out visitors are forced LIVE tape. Signed-in keep Settings → Updates. */
export function sessionLiveFeed(liveFeed: boolean, guest: boolean) {
  return guest ? true : liveFeed;
}
