import { error, json } from '@sveltejs/kit';
import { envFrom } from '$lib/server/env.js';
import { firebaseConfig } from '$lib/server/firebase/config.js';
import { verifyIdToken } from '$lib/server/firebase/auth.js';
import { clearSessionCookie, setSessionCookie } from '$lib/server/auth/session.js';

/**
 * POST /api/auth/session { idToken }  検証して Cookie に入れる
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, cookies, platform, url }) {
	const body = await request.json().catch(() => ({}));
	const idToken = body?.idToken;
	if (typeof idToken !== 'string' || !idToken) error(400, 'idToken がありません');

	const config = firebaseConfig(envFrom(platform));
	let decoded;
	try {
		decoded = await verifyIdToken(idToken, config);
	} catch (e) {
		error(401, `トークンを検証できません: ${e instanceof Error ? e.message : String(e)}`);
	}
	if (!decoded.role) error(403, 'ロールが付いていないユーザーです');

	setSessionCookie(cookies, idToken, url.protocol === 'https:');
	return json({ uid: decoded.uid, role: decoded.role });
}

/**
 * DELETE /api/auth/session  ログアウト
 * @type {import('./$types').RequestHandler}
 */
export async function DELETE({ cookies }) {
	clearSessionCookie(cookies);
	return json({ ok: true });
}
