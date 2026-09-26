import { PERSPECTIVES } from '../../types.js';
import { KARTE_FIELDS, PERSPECTIVE_IDS, SortSchema } from './schemas.js';
import { sortFallback } from './fallback.js';
import { anthropicClient, askJson } from './client.js';
import { writeAiLog } from './run.js';

/**
 * Jev（TypeSafe の System One モデル）による裏方の仕分け。結果は画面に点数として出さない。
 * - 注意ラベル: 日報が「単純作業だけか」を Noul で判定
 * - 観点の振り分け: 日報が5観点のどれの根拠になるかを Noul ×5 で判定
 * - カルテ更新候補: 候補文がカルテのどの項目かを Choice で分ける
 *
 * 呼び方（Cloudflare Workers AI）: env.AI.run('typesafe/jev', { state, questions })
 *   https://developers.cloudflare.com/ai/models/typesafe/jev/
 *   REST: POST https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/typesafe/jev（Bearer CF_API_TOKEN）
 *   questions は { name: { type: 'noul' | 'choice' | 'score', instructions, criteria } }
 *   answers は { name: { noul } | { choice, probabilities, confidence } }
 * DECIDE_PROVIDER=claude のとき、または Jev が使えないときは Claude で同じ JSON を作る。
 * それも失敗したらキーワードの固定ロジック。
 */

const JEV_MODEL = 'typesafe/jev';
const THRESHOLD = 0.5;

/**
 * @param {import('./run.js').AiContext} ctx
 * @param {{ body: string, karteCandidates?: { text: string }[] }} input
 * @returns {Promise<{ output: import('zod').infer<typeof SortSchema>, provider: 'jev' | 'claude' | 'fallback' }>}
 */
export async function sortReport(ctx, input) {
	const started = Date.now();
	const provider = ctx.env.DECIDE_PROVIDER === 'claude' ? 'claude' : 'jev';
	/** @type {import('zod').infer<typeof SortSchema> | null} */
	let output = null;
	/** @type {'jev' | 'claude' | 'fallback'} */
	let used = 'fallback';
	let error = '';

	if (provider === 'jev') {
		try {
			output = await sortWithJev(ctx, input);
			used = 'jev';
		} catch (e) {
			error = `Jev: ${e instanceof Error ? e.message : String(e)}`;
		}
	}
	if (!output) {
		const client = ctx.anthropic === undefined ? anthropicClient(ctx.env) : ctx.anthropic;
		if (client) {
			try {
				output = await askJson(client, {
					schema: SortSchema,
					effort: 'low',
					maxTokens: 512,
					system: `日報を仕分けます。simpleWorkOnly は掃除・運搬・片付けなどの単純作業だけの日報なら true。perspectives はこの日報が根拠になる観点（${PERSPECTIVES.map((p) => `${p.id}=${p.label}`).join('、')}）。karteFields はカルテ更新候補が該当する項目。`,
					user: `# 日報\n${input.body}\n\n# カルテ更新候補\n${(input.karteCandidates ?? []).map((c) => `- ${c.text}`).join('\n') || '（なし）'}`
				});
				used = 'claude';
			} catch (e) {
				error += ` Claude: ${e instanceof Error ? e.message : String(e)}`;
			}
		} else {
			error += ' Claude: ANTHROPIC_API_KEY がありません';
		}
	}
	if (!output) output = sortFallback(input);

	await writeAiLog(ctx, {
		feature: 'sort',
		provider: used === 'claude' ? 'claude' : 'jev',
		inputSummary: `日報 ${input.body.length}字`,
		output,
		latencyMs: Date.now() - started,
		fallback: used === 'fallback' || (provider === 'jev' && used !== 'jev'),
		error: error.trim(),
		at: new Date().toISOString()
	});
	return { output, provider: used };
}

/**
 * @param {import('./run.js').AiContext} ctx
 * @param {{ body: string, karteCandidates?: { text: string }[] }} input
 */
async function sortWithJev(ctx, input) {
	/** @type {Record<string, unknown>} */
	const questions = {
		simpleWorkOnly: {
			type: 'noul',
			instructions: 'この日報は、掃除・材料運び・片付け・養生などの単純作業についてだけ書かれている'
		}
	};
	for (const p of PERSPECTIVES) {
		questions[`p_${p.id}`] = {
			type: 'noul',
			instructions: `この日報は、修行者について「${p.label}」を判断する根拠になる具体的な出来事や言葉を含んでいる`
		};
	}
	const candidates = input.karteCandidates ?? [];
	candidates.forEach((c, i) => {
		questions[`k_${i}`] = {
			type: 'choice',
			instructions: `次の文は企業カルテのどの項目に当たるか: ${c.text}`,
			criteria: {
				values: '会社が大事にしていること・流儀',
				fieldIssues: '現場の課題・困りごと',
				customers: 'お客さん・取引先について',
				ownerOnlyWork: '社長しかできない仕事',
				successorRequirements: '後継者に求めること'
			}
		};
	});

	const result = /** @type {any} */ (await runJev(ctx, { state: input.body, questions }));
	const answers = result?.answers ?? result?.result?.answers;
	if (!answers) throw new Error('answers がありません');

	const perspectives = PERSPECTIVE_IDS.filter(
		(id) => Number(answers[`p_${id}`]?.noul ?? 0) >= THRESHOLD
	);
	const karteFields = candidates
		.map((_, i) => answers[`k_${i}`]?.choice)
		.filter((f) => KARTE_FIELDS.includes(f));
	return SortSchema.parse({
		simpleWorkOnly: Number(answers.simpleWorkOnly?.noul ?? 0) >= THRESHOLD,
		perspectives,
		karteFields
	});
}

/**
 * Workers AI binding があればそれを、無ければ REST を使う
 * @param {import('./run.js').AiContext} ctx
 * @param {{ state: string, questions: Record<string, unknown> }} body
 */
async function runJev(ctx, body) {
	if (ctx.ai) return ctx.ai.run(JEV_MODEL, body);
	const { CF_ACCOUNT_ID, CF_API_TOKEN } = ctx.env;
	if (!CF_ACCOUNT_ID || !CF_API_TOKEN)
		throw new Error('AI binding も CF_ACCOUNT_ID/CF_API_TOKEN も無い');
	const res = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${JEV_MODEL}`,
		{
			method: 'POST',
			headers: { authorization: `Bearer ${CF_API_TOKEN}`, 'content-type': 'application/json' },
			body: JSON.stringify(body)
		}
	);
	const json = /** @type {any} */ (await res.json());
	if (!res.ok || json?.success === false) {
		throw new Error(
			`Workers AI ${res.status}: ${JSON.stringify(json?.errors ?? json).slice(0, 200)}`
		);
	}
	return json.result ?? json;
}
