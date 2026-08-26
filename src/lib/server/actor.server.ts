import { getSessionUser } from "@/lib/auth/verify.server";
import { MCP_TOKEN_PREFIX, userIdFromMcpToken } from "@/lib/server/mcp-token.server";
import { claimOwner } from "@/lib/server/desk-store";

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return token;
}

export async function actorFromRequest(request: Request): Promise<string> {
  const token = bearer(request);
  if (token?.startsWith(MCP_TOKEN_PREFIX)) {
    const userId = await userIdFromMcpToken(token);
    if (!userId) throw new Error("Unauthorized");
    const claim = await claimOwner(userId);
    if (!claim.owner) throw new Error("Unauthorized");
    return userId;
  }
  const user = await getSessionUser(token ?? undefined);
  if (!user) throw new Error("Unauthorized");
  const claim = await claimOwner(user.id);
  if (!claim.owner) throw new Error("NightDesk is a single-operator desk.");
  return user.id;
}
