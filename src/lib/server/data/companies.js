/**
 * companies の読み書き
 */

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @returns {Promise<import('../../types.js').Company[]>}
 */
export async function listCompanies(db) {
	const rows = await db.query('', 'companies', { orderBy: [{ field: 'name' }] });
	return /** @type {any} */ (rows);
}

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {string} id
 * @returns {Promise<import('../../types.js').Company | null>}
 */
export async function getCompany(db, id) {
	return /** @type {any} */ (await db.get(`companies/${id}`));
}

/**
 * 企業ごとの「使っている候補者枠」= 終了していない placements の数
 * @param {import('../firebase/firestore.js').Firestore} db
 * @returns {Promise<Map<string, number>>}
 */
export async function activePlacementCounts(db) {
	const rows = await db.query('', 'placements', {
		where: [{ field: 'stage', op: 'IN', value: [1, 2, 3] }]
	});
	/** @type {Map<string, number>} */
	const counts = new Map();
	for (const p of rows) {
		const id = /** @type {string} */ (p.companyId);
		counts.set(id, (counts.get(id) ?? 0) + 1);
	}
	return counts;
}
