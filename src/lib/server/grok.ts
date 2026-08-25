import { createServerFn } from "@tanstack/react-start";

const SYSTEM = `You are the NIGHTDESK desk agent — a terse, institutional trading copilot.
The trader talks like a floor broker. Convert their message into JSON:
{
  "say": "one or two short sentences, no hype, no emoji",
  "commands": [
    { "op": "buy"|"sell", "symbol": "AAPL", "qty": 10, "type": "market"|"limit"|"stop", "limitPrice": 0, "stopPrice": 0 },
    { "op": "flatten", "symbol": "AAPL" },
    { "op": "cancel_all" },
    { "op": "thesis", "symbol": "AAPL" },
    { "op": "halt" },
    { "op": "resume" }
  ]
}
Only include commands they clearly asked to execute. If they asked for analysis, put thesis in commands and keep say as the analysis. USD notional: convert using last price if provided. JSON only.`;

export type GrokCommand =
  | {
      op: "buy" | "sell";
      symbol: string;
      qty?: number;
      type?: "market" | "limit" | "stop";
      limitPrice?: number;
      stopPrice?: number;
    }
  | { op: "flatten"; symbol?: string }
  | { op: "cancel_all" }
  | { op: "thesis"; symbol: string }
  | { op: "halt" }
  | { op: "resume" };

export const askDesk = createServerFn({ method: "POST" })
  .validator(
    (input: {
      text: string;
      selected: string;
      last?: number;
      equity?: number;
      positions?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "Grok is not available in this environment" };
    }
    const context = [
      `Selected: ${data.selected}`,
      data.last ? `Last: ${data.last}` : "",
      data.equity ? `Equity: ${data.equity}` : "",
      data.positions ? `Positions: ${data.positions}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: 0.2,
          max_tokens: 400,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: `${context}\n\n${data.text}` },
          ],
        }),
      });
      if (!res.ok) {
        return { ok: false as const, error: `xAI ${res.status}` };
      }
      const body = (await res.json()) as {
        choices: { message: { content: string } }[];
      };
      const raw = body.choices[0]?.message.content ?? "";
      const jsonStart = raw.indexOf("{");
      const jsonEnd = raw.lastIndexOf("}");
      if (jsonStart < 0 || jsonEnd <= jsonStart) {
        return { ok: true as const, say: raw.slice(0, 500), commands: [] as GrokCommand[] };
      }
      const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as {
        say?: string;
        commands?: GrokCommand[];
      };
      return {
        ok: true as const,
        say: parsed.say ?? "",
        commands: Array.isArray(parsed.commands) ? parsed.commands : [],
      };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Grok failed" };
    }
  });
