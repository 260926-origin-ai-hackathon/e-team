import { anthropicClient, askJson } from './client.js';

/**
 * AI 機能の共通の流れ: Claude を呼ぶ → 失敗したら fallback → aiLogs に記録
 *
 * @typedef {object} AiContext
 * @property {import('../env.js').Env} env
 * @property {import('../firebase/firestore.js').Firestore | null} db  aiLogs の書き込み先（null なら記録しない）
 * @property {{ run: (model: string, input: unknown) => Promise<unknown> } | null} [ai]  Workers AI binding（Jev）
 * @property {import('@anthropic-ai/sdk').default | null} [anthropic]  テスト用の差し替え
 */

/**
 * @template T
 * @param {AiContext} ctx
 * @param {{
 *   feature: string,
 *   schema: import('zod').ZodType<T>,
 *   system: string,
 *   user: string,
 *   effort?: 'low' | 'medium' | 'high',
 *   maxTokens?: number,
 *   inputSummary: string,
 *   fallback: () => T
 * }} spec
 * @returns {Promise<{ output: T, fallback: boolean, latencyMs: number }>}
 */
export async function runFeature(ctx, spec) {
	const started = Date.now();
	const client = ctx.anthropic === undefined ? anthropicClient(ctx.env) : ctx.anthropic;
	/** @type {T} */
	let output;
	let fallback = false;
	let error = '';
	if (!client) {
		fallback = true;
		error = 'ANTHROPIC_API_KEY がありません';
		output = spec.fallback();
	} else {
		try {
			output = await askJson(client, spec);
		} catch (e) {
			fallback = true;
			error = e instanceof Error ? e.message : String(e);
			output = spec.fallback();
		}
	}
	const latencyMs = Date.now() - started;
	await writeAiLog(ctx, {
		feature: spec.feature,
		provider: 'claude',
		inputSummary: spec.inputSummary,
		output,
		latencyMs,
		fallback,
		error,
		at: new Date().toISOString()
	});
	return { output, fallback, latencyMs };
}

/**
 * @param {AiContext} ctx
 * @param {import('../../types.js').AiLog & { error?: string }} entry
 */
export async function writeAiLog(ctx, entry) {
	if (!ctx.db) return;
	try {
		await ctx.db.add('aiLogs', entry);
	} catch (e) {
		console.error('aiLogs の書き込みに失敗', e);
	}
}
