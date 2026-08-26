export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Accept, Authorization, MCP-Session-Id, MCP-Protocol-Version",
    "Access-Control-Expose-Headers": "MCP-Session-Id, MCP-Protocol-Version",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleOptions(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export function json(data: unknown, status = 200, extra?: HeadersInit): Response {
  return Response.json(data, {
    status,
    headers: { ...corsHeaders(), ...extra },
  });
}
