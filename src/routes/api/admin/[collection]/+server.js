import { error, json } from '@sveltejs/kit';
import { serverContext } from '$lib/server/db.js';
import {
	ADMIN_COLLECTIONS,
	adminDelete,
	adminUpsert,
	canAdminWrite
} from '$lib/server/data/admin.js';

/**
 * 運営の JSON API。書き込みはすべて auditLogs に残る（adminUpsert / adminDelete）。
 * POST   /api/admin/{companies|trainees|users}  { id?, data }
 * DELETE /api/admin/{collection}?id=...
 */

/** @param {App.Locals} locals @param {string} collection */
function check(locals, collection) {
	if (!ADMIN_COLLECTIONS.includes(/** @type {any} */ (collection))) error(404, 'Not found');
	if (!canAdminWrite(locals.user, collection)) error(403, 'この操作はできません');
	return /** @type {string} */ (locals.user?.uid);
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, locals, platform }) {
	check(locals, params.collection);
	const { db } = serverContext(platform);
	return json({ items: await db.query('', params.collection) });
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ params, request, locals, platform }) {
	const uid = check(locals, params.collection);
	const body = await request.json().catch(() => ({}));
	if (!body?.data || typeof body.data !== 'object') error(400, 'data がありません');
	const { db } = serverContext(platform);
	const { id } = await adminUpsert(db, {
		uid,
		collection: params.collection,
		id: body.id,
		data: body.data
	});
	return json({ id });
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ params, url, locals, platform }) {
	const uid = check(locals, params.collection);
	const id = url.searchParams.get('id');
	if (!id) error(400, 'id がありません');
	const { db } = serverContext(platform);
	await adminDelete(db, { uid, collection: params.collection, id });
	return json({ ok: true });
}
