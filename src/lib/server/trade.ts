import { createServerFn } from "@tanstack/react-start";
import type { Creds, EquityPoint, Venue } from "@/lib/types";
import {
  cancelAllAlpacaInner,
  cancelAlpacaOrderInner,
  closeAllAlpacaInner,
  closeAlpacaPositionInner,
  fetchEquityHistoryInner,
  pingAlpacaAccount,
  snapshotAlpaca,
  submitAlpacaOrderInner,
} from "@/lib/server/alpaca";

export const pingAlpaca = createServerFn({ method: "POST" })
  .validator((input: { venue: Venue; creds: Creds }) => input)
  .handler(async ({ data }) => pingAlpacaAccount(data.venue, data.creds));

export const fetchAccountSnapshot = createServerFn({ method: "POST" })
  .validator((input: { venue: Venue; creds: Creds }) => input)
  .handler(async ({ data }) => snapshotAlpaca(data.venue, data.creds));

export const submitAlpacaOrder = createServerFn({ method: "POST" })
  .validator(
    (input: {
      venue: Venue;
      creds: Creds;
      symbol: string;
      side: "buy" | "sell";
      type: "market" | "limit" | "stop";
      qty: number;
      tif: "day" | "gtc" | "ioc";
      limitPrice?: number;
      stopPrice?: number;
    }) => input,
  )
  .handler(async ({ data }) => submitAlpacaOrderInner(data));

export const cancelAlpacaOrder = createServerFn({ method: "POST" })
  .validator((input: { venue: Venue; creds: Creds; id: string }) => input)
  .handler(async ({ data }) => cancelAlpacaOrderInner(data.venue, data.creds, data.id));

export const cancelAllAlpaca = createServerFn({ method: "POST" })
  .validator((input: { venue: Venue; creds: Creds }) => input)
  .handler(async ({ data }) => cancelAllAlpacaInner(data.venue, data.creds));

export const closeAlpacaPosition = createServerFn({ method: "POST" })
  .validator((input: { venue: Venue; creds: Creds; symbol: string }) => input)
  .handler(async ({ data }) => closeAlpacaPositionInner(data.venue, data.creds, data.symbol));

export const closeAllAlpaca = createServerFn({ method: "POST" })
  .validator((input: { venue: Venue; creds: Creds }) => input)
  .handler(async ({ data }) => closeAllAlpacaInner(data.venue, data.creds));

export const fetchEquityHistory = createServerFn({ method: "POST" })
  .validator((input: { venue: Venue; creds: Creds }) => input)
  .handler(async ({ data }): Promise<EquityPoint[]> => fetchEquityHistoryInner(data.venue, data.creds));
