import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { executeDeskOp, type DeskOp } from "@/lib/server/desk-engine";
import { claimOwner, loadDesk, publicDesk, requireOwner, type DeskSnapshot } from "@/lib/server/desk-store";
import { createMcpToken, listMcpTokens, revokeMcpToken } from "@/lib/server/mcp-token.server";

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
