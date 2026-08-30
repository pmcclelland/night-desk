/** SNAP drops recurring tape spend. Forced calls are boot snapshots and user actions. */
export function tapePollAllowed(liveFeed: boolean, force = false) {
  return force || liveFeed === true;
}
