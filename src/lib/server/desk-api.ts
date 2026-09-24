import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { BookThesis } from "@/lib/book-view";
import { barsToPoints } from "@/lib/book-curve";
import { executeDeskOp, type DeskOp } from "@/lib/server/desk-engine";
import { captureAlpacaBook } from "@/lib/server/desk-ledger";
import { deleteDeskKv, getDeskKv, listDeskKv, putDeskKv } from "@/lib/server/desk-kv";
import { claimOwner, loadDesk, publicDesk, requireOwner, type DeskSnapshot } from "@/lib/server/desk-store";
import { fetchAccountFillsInner, fetchEquityHistoryInner } from "@/lib/server/alpaca";
import type { JournalFill } from "@/lib/book-journal";
import { loadCurveBars } from "@/lib/server/market";
import type { CurveRange, EquityPoint } from "@/lib/types";
import { createMcpToken, listMcpTokens, revokeMcpToken } from "@/lib/server/mcp-token.server";
import {
  mergeThesisWrite,
  normalizeThesis,
  thesesFromRows,
  thesisIsBlank,
  thesisKey,
  type ThesisDraft,
} from "@/lib/thesis";

export const getDeskAccess = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const claim = await claimOwner(context.userId);
    return { owner: claim.owner, ownerId: claim.ownerId };
  });

export const pullDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireOwner(context.userId);
    const desk = await loadDesk(context.userId);
    return publicDesk(desk);
  });

export const persistDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Omit<DeskSnapshot, "updatedAt" | "creds">) => input)
  .handler(async ({ context, data }) => {
    const result = await executeDeskOp(context.userId, { op: "save_client", snapshot: data });
    return publicDesk(result.desk);
  });

export const runDeskOp = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: DeskOp) => input)
  .handler(async ({ context, data }) => {
    const result = await executeDeskOp(context.userId, data);
    return {
      ok: result.ok,
      error: result.error ?? null,
      message: result.message ?? null,
      extra: result.extra ?? null,
      desk: publicDesk(result.desk),
    };
  });

export const refreshAlpacaBook = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireOwner(context.userId);
    const desk = await loadDesk(context.userId);
    const book = await captureAlpacaBook(context.userId, desk);
    if (!book) return { ok: false as const, error: "No Alpaca book" };
    return {
      ok: true as const,
      account: book.account,
      positions: book.positions,
      orders: book.orders,
      pulledAt: book.pulledAt,
    };
  });

export const listDeskTokens = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireOwner(context.userId);
    return listMcpTokens(context.userId);
  });

export const mintDeskToken = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string }) => input)
  .handler(async ({ context, data }) => {
    await requireOwner(context.userId);
    return createMcpToken(context.userId, data.name);
  });

export const revokeDeskToken = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await requireOwner(context.userId);
    await revokeMcpToken(context.userId, data.id);
    return { ok: true as const };
  });

export const listTheses = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const rows = await listDeskKv<unknown>(context.userId, "thesis");
    return thesesFromRows(rows);
  });

export const putThesis = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: ThesisDraft) => input)
  .handler(async ({ context, data }) => {
    const key = thesisKey(data.symbol);
    if (thesisIsBlank(data)) {
      await deleteDeskKv(context.userId, "thesis", key);
      return { thesis: null as BookThesis | null };
    }
    const existing = normalizeThesis(await getDeskKv<unknown>(context.userId, "thesis", key), {
      symbol: data.symbol,
    });
    const thesis = mergeThesisWrite(existing, data);
    await putDeskKv(context.userId, "thesis", key, thesis);
    return { thesis };
  });

export const fetchOwnerBookCurve = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { range: CurveRange }) => input)
  .handler(async ({ context, data }) => {
    await requireOwner(context.userId);
    const desk = await loadDesk(context.userId);
    const creds = desk.creds;
    if (desk.venue === "sim" || !creds?.keyId || !creds.secret) {
      return { book: [] as EquityPoint[], spy: [] as EquityPoint[], usedAlpaca: false };
    }
    const book = await fetchEquityHistoryInner(desk.venue, creds, data.range);
    const spyBars = await loadCurveBars({
      symbol: "SPY",
      range: data.range,
      venue: desk.venue,
      creds,
    });
    return { book, spy: barsToPoints(spyBars.bars), usedAlpaca: true };
  });

const FILL_LOOKBACK_MS = 400 * 86_400_000;

export const fetchOwnerJournalFills = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { range: CurveRange }) => input)
  .handler(async ({ context }) => {
    await requireOwner(context.userId);
    const desk = await loadDesk(context.userId);
    const creds = desk.creds;
    if (desk.venue === "sim" || !creds?.keyId || !creds.secret) {
      return { fills: [] as JournalFill[], usedAlpaca: false };
    }
    const fills = await fetchAccountFillsInner(desk.venue, creds, Date.now() - FILL_LOOKBACK_MS);
    return { fills, usedAlpaca: true };
  });
