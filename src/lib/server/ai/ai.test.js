import { describe, expect, it } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { askJson, MODEL } from './client.js';
import { reportFeedback } from './feedback.js';
import { assessCandidate } from './assessment.js';
import { organizeKarte } from './karte.js';
import { risksAndRoadmap } from './risk.js';
import { sortReport } from './sort.js';
import {
	AssessmentSchema,
	FeedbackSchema,
	KarteSchema,
	RiskSchema,
	SortSchema
} from './schemas.js';

/** aiLogs の書き込み先の代わり */
function fakeDb() {
	/** @type {any[]} */
	const logs = [];
	return {
		logs,
		add: async (/** @type {string} */ col, /** @type {any} */ data) => void logs.push({ col, data })
	};
}

/** @param {Partial<import('./run.js').AiContext>} over */
function ctx(over = {}) {
	const db = fakeDb();
	return {
		env: {},
		db: /** @type {any} */ (db),
		anthropic: null,
		ai: null,
		logs: db.logs,
		...over
	};
}

const company = {
	name: '中村工務店',
	ownerWords: '暮らしを聞け',
	values: ['紹介で続いてきた'],
	fieldIssues: ['見積もりが社長一人']
};

describe('APIキーが無いとき（fallback）', () => {
	it('日報フィードバックは日報の言葉を引用した固定文を返し、aiLogs に fallback=true で残す', async () => {
		const c = ctx();
		const { output, fallback } = await reportFeedback(c, {
			date: '2026-09-25',
			body: '泉北ハウジングの打ち合わせに同席した。高橋さんが異動するらしい。',
			company,
			stage: 2
		});
		expect(fallback).toBe(true);
		expect(FeedbackSchema.safeParse(output).success).toBe(true);
		expect(output.insight).toContain('泉北ハウジングの打ち合わせに同席した');
		expect(c.logs).toHaveLength(1);
		expect(c.logs[0].data).toMatchObject({
			feature: 'feedback',
			provider: 'claude',
			fallback: true
		});
	});
	it('4機能ともスキーマに合う固定レスポンスを返す', async () => {
		const c = ctx();
		const karte = await organizeKarte(c, { rawNotes: '堺で50年やってる工務店や。', company });
		expect(KarteSchema.safeParse(karte.output).success).toBe(true);
		expect(karte.output.ownerWords).toContain('堺で50年');
		const a = await assessCandidate(c, {
			traineeName: '山本',
			reports: [{ date: '2026-09-01', body: 'x', perspectives: [] }],
			proposals: [],
			gates: []
		});
		expect(AssessmentSchema.safeParse(a.output).success).toBe(true);
		expect(a.output.items.map((i) => i.id)).toEqual([
			'fit',
			'persistence',
			'proposalFit',
			'reputation',
			'commitment'
		]);
		const r = await risksAndRoadmap(c, { company, adoptedProposals: [] });
		expect(RiskSchema.safeParse(r.output).success).toBe(true);
		expect(c.logs.every((l) => l.data.fallback === true)).toBe(true);
	});
});

describe('Claude が失敗したとき', () => {
	it('例外なら fallback に切り替え、エラーを記録する', async () => {
		const broken = /** @type {any} */ ({
			messages: {
				parse: async () => {
					throw new Error('boom');
				}
			}
		});
		const c = ctx({ anthropic: broken });
		const { fallback } = await reportFeedback(c, { date: 'd', body: '今日は', company, stage: 1 });
		expect(fallback).toBe(true);
		expect(c.logs[0].data.error).toContain('boom');
	});
	it('スキーマに合わない（parsed_output が null）なら fallback', async () => {
		const bad = /** @type {any} */ ({
			messages: { parse: async () => ({ stop_reason: 'end_turn', parsed_output: null }) }
		});
		const c = ctx({ anthropic: bad });
		const { fallback } = await reportFeedback(c, { date: 'd', body: '今日は', company, stage: 1 });
		expect(fallback).toBe(true);
	});
	it('成功したら parsed_output をそのまま返す', async () => {
		const good = /** @type {any} */ ({
			messages: {
				parse: async () => ({
					stop_reason: 'end_turn',
					parsed_output: { insight: 'i', proposalDraft: 'p', karteCandidates: [] }
				})
			}
		});
		const c = ctx({ anthropic: good });
		const { output, fallback } = await reportFeedback(c, {
			date: 'd',
			body: '今日は',
			company,
			stage: 1
		});
		expect(fallback).toBe(false);
		expect(output.insight).toBe('i');
	});
});

describe('仕分け（sort）', () => {
	it('Jev の answers を観点と項目に変換する', async () => {
		const ai = {
			run: async (/** @type {string} */ model, /** @type {any} */ input) => {
				expect(model).toBe('typesafe/jev');
				expect(Object.keys(input.questions)).toContain('p_fit');
				return {
					answers: {
						simpleWorkOnly: { noul: 0.1 },
						p_fit: { noul: 0.9 },
						p_persistence: { noul: 0.2 },
						p_proposalFit: { noul: 0.7 },
						p_reputation: { noul: 0.4 },
						p_commitment: { noul: 0.55 },
						k_0: { choice: 'fieldIssues', probabilities: {}, confidence: 0.8 }
					}
				};
			}
		};
		const c = ctx({ env: { DECIDE_PROVIDER: 'jev' }, ai });
		const { output, provider } = await sortReport(c, {
			body: '川口さんが…',
			karteCandidates: [{ text: '足場代の抜け' }]
		});
		expect(provider).toBe('jev');
		expect(output).toEqual({
			simpleWorkOnly: false,
			perspectives: ['fit', 'proposalFit', 'commitment'],
			karteFields: ['fieldIssues']
		});
		expect(c.logs[0].data).toMatchObject({ feature: 'sort', provider: 'jev', fallback: false });
	});
	it('Jev も Claude も無ければキーワードの固定ロジック', async () => {
		const c = ctx({ env: { DECIDE_PROVIDER: 'jev' } });
		const simple = await sortReport(c, { body: '掃除と材料運びをした。' });
		expect(simple.provider).toBe('fallback');
		expect(simple.output.simpleWorkOnly).toBe(true);
		const rich = await sortReport(c, {
			body: '見積もりテンプレを3件で試した。社長が採用してくれた。下請けの粗利は8%。来年もいます。'
		});
		expect(rich.output.simpleWorkOnly).toBe(false);
		expect(rich.output.perspectives).toEqual(expect.arrayContaining(['proposalFit', 'commitment']));
		expect(SortSchema.safeParse(rich.output).success).toBe(true);
	});
	it('DECIDE_PROVIDER=claude なら Jev を呼ばず Claude で仕分ける', async () => {
		const ai = {
			run: async () => {
				throw new Error('呼ばれてはいけない');
			}
		};
		const claude = /** @type {any} */ ({
			messages: {
				parse: async () => ({
					stop_reason: 'end_turn',
					parsed_output: { simpleWorkOnly: false, perspectives: ['fit'], karteFields: [] }
				})
			}
		});
		const c = ctx({ env: { DECIDE_PROVIDER: 'claude' }, ai, anthropic: claude });
		const { output, provider } = await sortReport(c, { body: 'x' });
		expect(provider).toBe('claude');
		expect(output.perspectives).toEqual(['fit']);
	});
});

describe('Claude への実際のリクエスト（SDK を通し、fetch だけ差し替え）', () => {
	/**
	 * @param {unknown} output  モデルが返す JSON
	 * @returns {{ client: import('@anthropic-ai/sdk').default, bodies: any[] }}
	 */
	function sdkWith(output) {
		/** @type {any[]} */
		const bodies = [];
		/** @type {typeof globalThis.fetch} */
		const fakeFetch = async (_url, init) => {
			bodies.push(JSON.parse(String(init?.body)));
			return new Response(
				JSON.stringify({
					id: 'msg_test',
					type: 'message',
					role: 'assistant',
					model: MODEL,
					content: [{ type: 'text', text: JSON.stringify(output) }],
					stop_reason: 'end_turn',
					stop_sequence: null,
					usage: { input_tokens: 1, output_tokens: 1 }
				}),
				{ status: 200, headers: { 'content-type': 'application/json' } }
			);
		};
		return { client: new Anthropic({ apiKey: 'test', fetch: fakeFetch, maxRetries: 0 }), bodies };
	}

	const schemas = { KarteSchema, FeedbackSchema, AssessmentSchema, RiskSchema, SortSchema };

	it.each(Object.entries(schemas))(
		'%s: API が受け付けない制約を送らない',
		async (_name, schema) => {
			const { client, bodies } = sdkWith({});
			await askJson(client, { schema, system: 's', user: 'u' }).catch(() => {});
			const body = bodies[0];
			expect(body.model).toBe(MODEL);
			expect(body.output_config.effort).toBe('low');
			expect(body.output_config.format.type).toBe('json_schema');
			const sent = JSON.stringify(body.output_config.format.schema);
			for (const key of ['maxItems', 'minimum', 'maximum', 'minLength', 'maxLength'])
				expect(sent).not.toContain(`"${key}"`);
			for (const m of sent.matchAll(/"minItems":(\d+)/g))
				expect(Number(m[1])).toBeLessThanOrEqual(1);
		}
	);

	it('長すぎる配列は切り詰めて通す', async () => {
		const risk = { title: 't', why: 'w', action: 'a' };
		const year = (/** @type {number} */ y) => ({
			year: y,
			theme: 't',
			items: ['1', '2', '3', '4']
		});
		const { client } = sdkWith({
			risks: [risk, risk, risk, risk],
			roadmap: [year(1), year(2), year(3), year(3)]
		});
		const out = await askJson(client, { schema: RiskSchema, system: 's', user: 'u' });
		expect(out.risks).toHaveLength(3);
		expect(out.roadmap).toHaveLength(3);
		expect(out.roadmap[0].items).toHaveLength(3);
	});

	it('足りない配列や範囲外の数字はエラー（→ fallback）', async () => {
		const risk = { title: 't', why: 'w', action: 'a' };
		const { client } = sdkWith({ risks: [risk, risk], roadmap: [] });
		await expect(askJson(client, { schema: RiskSchema, system: 's', user: 'u' })).rejects.toThrow();
		const year = { year: 4, theme: 't', items: ['1'] };
		const bad = sdkWith({ risks: [risk, risk, risk], roadmap: [year, year, year] });
		await expect(
			askJson(bad.client, { schema: RiskSchema, system: 's', user: 'u' })
		).rejects.toThrow();
	});
});
