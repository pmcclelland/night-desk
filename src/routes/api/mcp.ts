import { createFileRoute } from "@tanstack/react-router";
import { actorFromRequest } from "@/lib/server/actor.server";
import { corsHeaders, handleOptions, json } from "@/lib/server/http";
import { handleJsonRpc, MCP_TOOL_NAMES } from "@/lib/server/mcp";

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      OPTIONS: () => handleOptions(),
      GET: async () => {
        return json({
          name: "nightdesk",
          version: "1.0.0",
          transport: "streamable-http",
          protocol: "MCP",
          endpoint: "/api/mcp",
          tools: MCP_TOOL_NAMES,
        });
      },
      POST: async ({ request }) => {
        let userId: string;
        try {
          userId = await actorFromRequest(request);
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : "Unauthorized", code: "UNAUTHORIZED" },
            401,
          );
        }
        let body: unknown = {};
        try {
          body = await request.json();
        } catch {
          return json(
            { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
            400,
          );
        }
        const { payload, notification } = await handleJsonRpc(userId, body);
        if (notification || payload === null) {
          return new Response(null, { status: 202, headers: corsHeaders() });
        }
        return json(payload, 200, { "MCP-Protocol-Version": "2025-03-26" });
      },
      DELETE: () => new Response(null, { status: 204, headers: corsHeaders() }),
    },
  },
});
