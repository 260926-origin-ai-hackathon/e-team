import { writeAuditLog } from './audit.js';
import { newId } from '../firebase/firestore.js';
import { ensureUserWithClaims } from '../firebase/identity.js';

/**
 * 運営の書き込み。すべて auditLogs に before / after を残す。
 */

/** 運営が触れるコレクション */
export const ADMIN_COLLECTIONS = /** @type {const} */ (['companies', 'trainees', 'users']);

/**
 * @param {import('../../shared/roles.js').SessionUser | null} user
 * @param {string} collection
 */
export function canAdminWrite(user, collection) {
	if (!user) return false;
	if (collection === 'users') return user.role === 'admin';
	return user.role === 'admin' || user.role === 'operator';
}

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {{ uid: string, collection: string, id?: string, data: Record<string, unknown> }} input
 * @returns {Promise<{ id: string }>}
 */
export async function adminUpsert(db, input) {
	const id = input.id || newId();
	const path = `${input.collection}/${id}`;
	const before = await db.get(path);
	await db.update(path, input.data);
	await writeAuditLog(db, {
		uid: input.uid,
		action: before ? 'update' : 'create',
		targetPath: path,
		before: before ? stripMeta(before) : null,
		after: input.data,
		at: new Date().toISOString()
	});
	return { id };
}

/**
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {{ uid: string, collection: string, id: string }} input
 */
export async function adminDelete(db, input) {
	const path = `${input.collection}/${input.id}`;
	const before = await db.get(path);
	if (!before) return;
	await db.delete(path);
	await writeAuditLog(db, {
		uid: input.uid,
		action: 'delete',
		targetPath: path,
		before: stripMeta(before),
		after: null,
		at: new Date().toISOString()
	});
}

/**
 * users/{uid} を更新し、Firebase Auth の custom claims も同じにする（ロールは本番と同じ仕組み）
 * @param {import('../firebase/firestore.js').Firestore} db
 * @param {import('../firebase/config.js').FirebaseServerConfig} config
 * @param {{ actorUid: string, uid: string, displayName: string, role: import('../../shared/roles.js').Role, companyId?: string, traineeId?: string }} input
 */
export async function adminSetUserRole(db, config, input) {
	/** @type {Record<string, unknown>} */
	const claims = { role: input.role };
	if (input.companyId) claims.companyId = input.companyId;
	if (input.traineeId) claims.traineeId = input.traineeId;
	await ensureUserWithClaims(config, {
		uid: input.uid,
		email: `${input.uid}@tsugumi.local`,
		displayName: input.displayName,
		claims
	});
	return adminUpsert(db, {
		uid: input.actorUid,
		collection: 'users',
		id: input.uid,
		data: {
			displayName: input.displayName,
			role: input.role,
			companyId: input.companyId ?? null,
			traineeId: input.traineeId ?? null
		}
	});
}

/** @param {Record<string, unknown>} doc */
function stripMeta(doc) {
	const { id: _id, path: _path, ...rest } = doc;
	void _id;
	void _path;
	return rest;
}
