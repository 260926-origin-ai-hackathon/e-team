/**
 * シードJSON（seed/data）を Firestore に投入する。何度実行しても同じ状態になる（同じIDに上書き）。
 * 使い方: npm run seed        （デモ用ユーザーの作成 + データ投入）
 *        node seed/seed.js    （データ投入だけ）
 * 既定はエミュレータ。.dev.vars の FIRESTORE_EMULATOR_HOST を外し、サービスアカウントを入れると本番へ。
 */
import { readFileSync } from 'node:fs';
import { loadEnv } from './lib/env.js';
import { firebaseConfig } from '../src/lib/server/firebase/config.js';
import { Firestore } from '../src/lib/server/firebase/firestore.js';

/** @param {string} name */
const load = (name) =>
	JSON.parse(readFileSync(new URL(`./data/${name}.json`, import.meta.url), 'utf8'));

const env = loadEnv();
const config = firebaseConfig(env);
const db = new Firestore(config);
console.log(
	`対象: ${config.projectId}（${config.firestoreEmulatorHost ? 'Firestore エミュレータ ' + config.firestoreEmulatorHost : '本番 Firestore'}）`
);

/** @type {({ set: string, data: Record<string, unknown> } | { delete: string })[]} */
const writes = [];

/** @param {string} path @param {Record<string, unknown>} doc */
function put(path, doc) {
	const data = { ...doc };
	delete data.id;
	writes.push({ set: path, data });
}

for (const c of load('companies')) put(`companies/${c.id}`, c);
for (const t of load('trainees')) put(`trainees/${t.id}`, t);
for (const u of load('users')) put(`users/${u.id}`, u);
for (const p of load('placements')) {
	const { reports, proposals, gates, missions, assessment, ...placement } = p;
	put(`placements/${p.id}`, placement);
	for (const r of reports ?? []) put(`placements/${p.id}/reports/${r.id}`, r);
	for (const q of proposals ?? []) put(`placements/${p.id}/proposals/${q.id}`, q);
	for (const g of gates ?? []) put(`placements/${p.id}/gates/${g.id}`, g);
	for (const m of missions ?? []) put(`placements/${p.id}/missions/${m.id}`, m);
	if (assessment) put(`placements/${p.id}/assessment/current`, assessment);
	else writes.push({ delete: `placements/${p.id}/assessment/current` });
}

// 以前のシードで作った日報・提案が残らないよう、シードに無い配下ドキュメントは消す
const seededPaths = new Set(writes.map((w) => ('set' in w ? w.set : w.delete)));
for (const p of load('placements')) {
	for (const sub of ['reports', 'proposals', 'gates', 'missions']) {
		const existing = await db.query(`placements/${p.id}`, sub);
		for (const d of existing) if (!seededPaths.has(d.path)) writes.push({ delete: d.path });
	}
}
for (const col of ['auditLogs', 'aiLogs']) {
	for (const d of await db.query('', col)) writes.push({ delete: d.path });
}

await db.commit(writes);
console.log(`${writes.length} 件を書き込みました`);
