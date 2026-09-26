import { newId } from '../firebase/firestore.js';
import { todayJst } from '../../shared/format.js';
import { writeAuditLog } from './audit.js';

/**
 * 社長の操作（ゲート判定・提案への反応・ミッション）。ゲート判定は auditLogs に残す。
 */

/**
 * @param {string} ymd
 * @param {number} months
 */
export function addMonths(ymd, months) {
	const d = new Date(`${ymd}T00:00:00Z`);
	d.setUTCMonth(d.getUTCMonth() + months);
	return d.toISOString().slice(0, 10);
}

/**
 * ゲート判定を適用したあとの placement の状態（純粋関数。テスト用に分けている）
 * @param {import('../../types.js').Placement} p
 * @param {'next' | 'extend' | 'stop'} decision
 * @param {string} [today]
 * @returns {Partial<import('../../types.js').Placement>}
 */
export function applyGate(p, decision, today = todayJst()) {
	if (p.stage === 'ended') throw new Error('終了した修行にはゲート判定できません');
	if (decision === 'extend') return { nextGateAt: addMonths(p.nextGateAt, 1) };
	if (decision === 'stop') return { stage: 'ended', endReason: 'rejected', nextGateAt: today };
	if (p.stage === 3) return { stage: 'ended', endReason: 'succeeded', nextGateAt: today };
	return {
		stage: /** @type {2 | 3} */ (p.stage + 1),
		stageStartedAt: today,
		nextGateAt: addMonths(today, 2),
		flags: []
	};
}

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {{ uid: string, placement: import('../../types.js').Placement, decision: 'next' | 'extend' | 'stop', comment: string, agreementSigned?: boolean }} input
 */
export async function decideGate(db, input) {
	const { placement: p } = input;
	if (p.stage === 'ended') throw new Error('終了した修行です');
	if (input.decision === 'next' && p.stage === 1 && !input.agreementSigned && !p.agreementSigned) {
		throw new Error('段階2へ進めるには「承継を前提とした合意書」の確認が必要です');
	}
	const after = applyGate(p, input.decision);
	if (input.agreementSigned) after.agreementSigned = true;
	const gate = {
		stage: /** @type {import('../../types.js').Stage} */ (p.stage),
		decision: input.decision,
		ownerComment: input.comment,
		at: new Date().toISOString()
	};
	await db.commit([
		{ set: `placements/${p.id}/gates/${newId()}`, data: gate },
		{ update: `placements/${p.id}`, data: after }
	]);
	await writeAuditLog(db, {
		uid: input.uid,
		action: `gate:${input.decision}`,
		targetPath: `placements/${p.id}`,
		before: { stage: p.stage, nextGateAt: p.nextGateAt, agreementSigned: p.agreementSigned },
		after,
		at: gate.at
	});
	return after;
}

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {{ placementId: string, proposalId: string, reaction: 'adopted' | 'hold' | null }} input
 */
export async function reactToProposal(db, input) {
	await db.update(`placements/${input.placementId}/proposals/${input.proposalId}`, {
		ownerReaction: input.reaction
	});
}

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {string} placementId
 * @param {{ month: string, text: string }} input
 */
export async function addMission(db, placementId, input) {
	await db.set(`placements/${placementId}/missions/${newId()}`, {
		month: input.month,
		text: input.text,
		done: false
	});
}

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {string} placementId
 * @param {string} missionId
 * @param {boolean} done
 */
export async function setMissionDone(db, placementId, missionId, done) {
	await db.update(`placements/${placementId}/missions/${missionId}`, { done });
}

/**
 * 会社全体で採用された提案（承継リスク・ロードマップの入力）
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {string} companyId
 * @returns {Promise<{ date: string, content: string }[]>}
 */
export async function adoptedProposalsForCompany(db, companyId) {
	const placements = await db.query('', 'placements', {
		where: [{ field: 'companyId', op: 'EQUAL', value: companyId }]
	});
	/** @type {{ date: string, content: string }[]} */
	const out = [];
	for (const p of placements) {
		const rows = await db.query(`placements/${p.id}`, 'proposals', {
			where: [{ field: 'ownerReaction', op: 'EQUAL', value: 'adopted' }]
		});
		for (const r of rows) out.push({ date: String(r.date), content: String(r.content) });
	}
	return out.sort((a, b) => a.date.localeCompare(b.date));
}
