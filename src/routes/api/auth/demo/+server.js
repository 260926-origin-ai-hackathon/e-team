import { error, json } from '@sveltejs/kit';
import { envFrom, isDemoMode } from '$lib/server/env.js';
import { firebaseConfig } from '$lib/server/firebase/config.js';
import { createCustomToken } from '$lib/server/firebase/customToken.js';
import { ensureUserWithClaims } from '$lib/server/firebase/identity.js';
import { DEMO_USERS, isDemoRole } from '$lib/server/auth/demoUsers.js';

/**
 * POST /api/auth/demo { role }
 * DEMO_MODE=true のときだけ。ロールに対応するデモ用ユーザーの Firebase カスタムトークンを返す。
 * ロールは custom claims としてユーザーに付けてある（本番と同じ仕組み）ので、
 * トークン自体にはロールを載せない。
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, platform }) {
	const env = envFrom(platform);
	if (!isDemoMode(env)) error(404, 'Not found');

	const body = await request.json().catch(() => ({}));
	const role = body?.role;
	if (!isDemoRole(role)) error(400, 'role が不正です');

	const spec = DEMO_USERS[/** @type {keyof typeof DEMO_USERS} */ (role)];
	const config = firebaseConfig(env);
	await ensureUserWithClaims(config, spec);
	const customToken = await createCustomToken(config, spec.uid);
	return json({ customToken, home: spec.home });
}
