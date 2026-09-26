/**
 * シードデータで AI の4機能と仕分けを動かして結果を表示する。
 * 使い方: npm run ai:check
 * ANTHROPIC_API_KEY が無ければ fallback で動く（それも確認したいことの1つ）。
 * Jev はローカルでは CF_ACCOUNT_ID + CF_API_TOKEN があるときだけ REST で呼ぶ。
 */
import { readFileSync } from 'node:fs';
import { loadEnv } from './lib/env.js';
import {
	organizeKarte,
	reportFeedback,
	assessCandidate,
	risksAndRoadmap,
	sortReport
} from '../src/lib/server/ai/index.js';

/** @param {string} name */
const load = (name) =>
	JSON.parse(readFileSync(new URL(`./data/${name}.json`, import.meta.url), 'utf8'));

const env = loadEnv();
/** @type {import('../src/lib/server/ai/run.js').AiContext} */
const ctx = { env, db: null, ai: null };
const only = process.argv[2]; // karte | feedback | assessment | risk | sort

const company = load('companies')[0];
const placement = load('placements').find((/** @type {any} */ p) => p.id === 'placement-2');
console.log(
	`ANTHROPIC_API_KEY: ${env.ANTHROPIC_API_KEY ? 'あり' : '無し（fallback）'}  DECIDE_PROVIDER: ${env.DECIDE_PROVIDER ?? '(未設定)'}\n`
);

/** @param {string} name @param {() => Promise<any>} fn */
async function show(name, fn) {
	if (only && only !== name) return;
	const t = Date.now();
	const r = await fn();
	console.log(
		`## ${name}  ${Date.now() - t}ms  ${'fallback' in r ? (r.fallback ? 'fallback' : 'claude') : r.provider}`
	);
	console.log(JSON.stringify(r.output, null, 2), '\n');
}

await show('sort', () =>
	sortReport(ctx, {
		body: placement.reports[8].body,
		karteCandidates: placement.reports[8].aiFeedback?.karteCandidates ?? []
	})
);
await show('feedback', () =>
	reportFeedback(ctx, {
		date: placement.reports[9].date,
		body: placement.reports[9].body,
		company,
		stage: 2
	})
);
await show('karte', () => organizeKarte(ctx, { rawNotes: company.rawNotes, company }));
await show('assessment', () =>
	assessCandidate(ctx, {
		traineeName: placement.traineeName,
		reports: placement.reports,
		proposals: placement.proposals,
		gates: placement.gates
	})
);
await show('risk', () =>
	risksAndRoadmap(ctx, {
		company,
		adoptedProposals: placement.proposals.filter(
			(/** @type {any} */ p) => p.ownerReaction === 'adopted'
		)
	})
);
