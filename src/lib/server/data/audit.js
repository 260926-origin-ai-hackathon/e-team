/**
 * auditLogs（サーバーだけが書く）
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {import('../../types.js').AuditLog} entry
 */
export async function writeAuditLog(db, entry) {
	await db.add('auditLogs', entry);
}
