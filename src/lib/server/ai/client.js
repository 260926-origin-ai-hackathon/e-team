import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

/**
 * Claude の呼び出し。Cloudflare AI Gateway が設定されていればそこを経由する。
 * https://developers.cloudflare.com/ai-gateway/usage/providers/anthropic/
 *   baseURL: https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/anthropic
 *   認証付きゲートウェイは cf-aig-authorization: Bearer {CF_AIG_TOKEN}
 * 設定が無ければ Anthropic API を直接呼ぶ。ANTHROPIC_API_KEY が無ければ null（→ fallback）。
 */

export const MODEL = 'claude-opus-5';

/**
 * @param {import('../env.js').Env} env
 * @returns {Anthropic | null}
 */
export function anthropicClient(env) {
	const apiKey = env.ANTHROPIC_API_KEY;
	if (!apiKey) return null;
	/** @type {ConstructorParameters<typeof Anthropic>[0]} */
	const opts = { apiKey, maxRetries: 1, timeout: 60_000 };
	if (env.CF_ACCOUNT_ID && env.AI_GATEWAY_ID) {
		opts.baseURL = `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/${env.AI_GATEWAY_ID}/anthropic`;
		if (env.CF_AIG_TOKEN)
			opts.defaultHeaders = { 'cf-aig-authorization': `Bearer ${env.CF_AIG_TOKEN}` };
	}
	return new Anthropic(opts);
}

const STYLE = `あなたは事業承継サービス「つぐみ」の裏方です。出力は日本語の JSON だけ。
守ること:
- 入力データにある具体的な言葉（人名、数字、発言）を必ず「」で引用する。一般論・抽象論は書かない。
- 短く。所見や気づきは1項目2文まで。提案は1つだけ。
- 合否・点数・確信度・ランク付けは書かない。決めるのは社長。
- 入力に無いことを推測で足さない。`;

/**
 * JSON で返す1回の呼び出し。スキーマに合わなければ例外。
 * @template {import('zod').ZodType} S
 * @param {Anthropic} client
 * @param {{ schema: S, system: string, user: string, effort?: 'low' | 'medium' | 'high', maxTokens?: number }} req
 * @returns {Promise<import('zod').infer<S>>}
 */
export async function askJson(client, req) {
	const response = await client.messages.parse({
		model: MODEL,
		max_tokens: req.maxTokens ?? 4096,
		output_config: { effort: req.effort ?? 'low', format: outputFormat(req.schema) },
		system: [
			{ type: 'text', text: `${STYLE}\n\n${req.system}`, cache_control: { type: 'ephemeral' } }
		],
		messages: [{ role: 'user', content: req.user }]
	});
	if (response.stop_reason === 'refusal') throw new Error('Claude が応答を拒否しました');
	if (response.stop_reason === 'max_tokens') throw new Error('出力が長すぎて途中で切れました');
	if (!response.parsed_output) throw new Error('出力が JSON スキーマに合いません');
	return response.parsed_output;
}

/**
 * 構造化出力の format。
 * API の JSON Schema は maxItems / minItems(2以上) / minimum / maximum を受け付けないので、
 * SDK（zodOutputFormat）がそれらを description に移して送る。つまり個数や範囲は API では強制されない。
 * 受け取った JSON は、長すぎる配列を maxItems まで切り詰めてから zod で検証する
 * （4件返ってきただけで fallback にしないため）。足りない・範囲外は zod のエラー → fallback。
 * @template {import('zod').ZodType} S
 * @param {S} schema
 */
export function outputFormat(schema) {
	const format = zodOutputFormat(schema);
	const limits = z.toJSONSchema(schema);
	return {
		...format,
		/** @param {string} content */
		parse: (content) => format.parse(JSON.stringify(trimArrays(JSON.parse(content), limits)))
	};
}

/**
 * JSON Schema の maxItems に合わせて配列を切り詰める（入れ子も）。
 * @param {unknown} value
 * @param {any} schema
 * @returns {unknown}
 */
export function trimArrays(value, schema) {
	if (!schema || typeof schema !== 'object') return value;
	if (Array.isArray(value)) {
		const items = typeof schema.maxItems === 'number' ? value.slice(0, schema.maxItems) : value;
		return items.map((v) => trimArrays(v, schema.items));
	}
	if (value && typeof value === 'object' && schema.properties) {
		/** @type {Record<string, unknown>} */
		const out = {};
		for (const [k, v] of Object.entries(value)) out[k] = trimArrays(v, schema.properties[k]);
		return out;
	}
	return value;
}
