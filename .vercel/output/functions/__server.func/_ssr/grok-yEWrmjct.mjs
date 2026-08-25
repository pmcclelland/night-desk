import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/grok-yEWrmjct.js
var SYSTEM = `You are the NIGHTDESK desk agent — a terse, institutional trading copilot.
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
var askDesk_createServerFn_handler = createServerRpc({
	id: "c0bf3fc535bf25e04517a2179ac179f2f19a8ac8fa704dc2c7f681a27ab933b1",
	name: "askDesk",
	filename: "src/lib/server/grok.ts"
}, (opts) => askDesk.__executeServer(opts));
var askDesk = createServerFn({ method: "POST" }).validator((input) => input).handler(askDesk_createServerFn_handler, async ({ data }) => {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "Grok is not available in this environment"
	};
	const context = [
		`Selected: ${data.selected}`,
		data.last ? `Last: ${data.last}` : "",
		data.equity ? `Equity: ${data.equity}` : "",
		data.positions ? `Positions: ${data.positions}` : ""
	].filter(Boolean).join(" | ");
	try {
		const res = await fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: "grok-4.5",
				temperature: .2,
				max_tokens: 400,
				messages: [{
					role: "system",
					content: SYSTEM
				}, {
					role: "user",
					content: `${context}\n\n${data.text}`
				}]
			})
		});
		if (!res.ok) return {
			ok: false,
			error: `xAI ${res.status}`
		};
		const raw = (await res.json()).choices[0]?.message.content ?? "";
		const jsonStart = raw.indexOf("{");
		const jsonEnd = raw.lastIndexOf("}");
		if (jsonStart < 0 || jsonEnd <= jsonStart) return {
			ok: true,
			say: raw.slice(0, 500),
			commands: []
		};
		const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
		return {
			ok: true,
			say: parsed.say ?? "",
			commands: Array.isArray(parsed.commands) ? parsed.commands : []
		};
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "Grok failed"
		};
	}
});
//#endregion
export { askDesk_createServerFn_handler };
