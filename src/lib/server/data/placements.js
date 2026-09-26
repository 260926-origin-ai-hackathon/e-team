import { newId } from '../firebase/firestore.js';
import { todayJst } from '../../shared/format.js';

/**
 * placements とその配下（reports / proposals / gates / missions / assessment）の読み書き
 */

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {string} id
 * @returns {Promise<import('../../types.js').Placement | null>}
 */
export async function getPlacement(db, id) {
	return /** @type {any} */ (await db.get(`placements/${id}`));
}

/**
 * 修行者の placement（進行中を優先、無ければ最新）
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {string} traineeId
 * @returns {Promise<import('../../types.js').Placement | null>}
 */
export async function findPlacementForTrainee(db, traineeId) {
	const rows = /** @type {import('../../types.js').Placement[]} */ (
		/** @type {any} */ (
			await db.query('', 'placements', {
				where: [{ field: 'traineeId', op: 'EQUAL', value: traineeId }]
			})
		)
	);
	if (!rows.length) return null;
	return (
		rows.find((p) => p.stage !== 'ended') ??
		rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
	);
}

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {string} companyId
 * @returns {Promise<import('../../types.js').Placement[]>}
 */
export async function listPlacementsForCompany(db, companyId) {
	return /** @type {any} */ (
		await db.query('', 'placements', {
			where: [{ field: 'companyId', op: 'EQUAL', value: companyId }]
		})
	);
}

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @returns {Promise<import('../../types.js').Placement[]>}
 */
export async function listAllPlacements(db) {
	return /** @type {any} */ (await db.query('', 'placements'));
}

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {string} placementId
 * @returns {Promise<import('../../types.js').Report[]>}  新しい順
 */
export async function listReports(db, placementId) {
	return /** @type {any} */ (
		await db.query(`placements/${placementId}`, 'reports', {
			orderBy: [{ field: 'date', direction: 'DESCENDING' }]
		})
	);
}

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {string} placementId
 * @returns {Promise<import('../../types.js').Proposal[]>}  新しい順
 */
export async function listProposals(db, placementId) {
	return /** @type {any} */ (
		await db.query(`placements/${placementId}`, 'proposals', {
			orderBy: [{ field: 'date', direction: 'DESCENDING' }]
		})
	);
}

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {string} placementId
 * @returns {Promise<import('../../types.js').Gate[]>}  古い順
 */
export async function listGates(db, placementId) {
	return /** @type {any} */ (
		await db.query(`placements/${placementId}`, 'gates', { orderBy: [{ field: 'at' }] })
	);
}

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {string} placementId
 * @param {string} [month]  YYYY-MM。省略時は全部
 * @returns {Promise<import('../../types.js').Mission[]>}
 */
export async function listMissions(db, placementId, month) {
	return /** @type {any} */ (
		await db.query(`placements/${placementId}`, 'missions', {
			where: month ? [{ field: 'month', op: 'EQUAL', value: month }] : undefined
		})
	);
}

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {string} placementId
 * @returns {Promise<import('../../types.js').Assessment | null>}
 */
export async function getAssessment(db, placementId) {
	return /** @type {any} */ (await db.get(`placements/${placementId}/assessment/current`));
}

/**
 * 日報を作る（AI の項目は後から update）
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {string} placementId
 * @param {{ body: string, date?: string }} input
 * @returns {Promise<import('../../types.js').Report>}
 */
export async function createReport(db, placementId, input) {
	const id = newId();
	const report = {
		date: input.date ?? todayJst(),
		body: input.body,
		aiFeedback: null,
		perspectives: [],
		createdAt: new Date().toISOString()
	};
	await db.set(`placements/${placementId}/reports/${id}`, report);
	return { id, ...report };
}

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {string} placementId
 * @param {{ content: string, reportId?: string }} input
 * @returns {Promise<import('../../types.js').Proposal>}
 */
export async function createProposal(db, placementId, input) {
	const id = newId();
	const proposal = {
		date: todayJst(),
		content: input.content,
		ownerReaction: null,
		reportId: input.reportId
	};
	await db.set(`placements/${placementId}/proposals/${id}`, proposal);
	return { id, ...proposal };
}

/**
 * 応募: 進行中の placement が無ければ段階1で作る
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {{ company: import('../../types.js').Company, trainee: import('../../types.js').Trainee }} input
 * @returns {Promise<import('../../types.js').Placement>}
 */
export async function createPlacement(db, { company, trainee }) {
	const id = newId();
	const today = todayJst();
	const next = new Date(today);
	next.setUTCMonth(next.getUTCMonth() + 2);
	const placement = {
		companyId: company.id,
		traineeId: trainee.id,
		companyName: company.name,
		traineeName: trainee.name,
		traineeUniversity: trainee.university,
		stage: 1,
		startedAt: today,
		stageStartedAt: today,
		nextGateAt: next.toISOString().slice(0, 10),
		agreementSigned: false,
		endReason: null,
		flags: [],
		lastReportSummary: ''
	};
	await db.set(`placements/${id}`, placement);
	return /** @type {any} */ ({ id, ...placement });
}
