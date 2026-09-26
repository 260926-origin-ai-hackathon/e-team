import { error, json, redirect } from '@sveltejs/kit';
import { envFrom } from '$lib/server/env.js';
import { firebaseConfig } from '$lib/server/firebase/config.js';
import { verifyIdToken } from '$lib/server/firebase/auth.js';
import { guard, isApiPath } from '$lib/server/auth/guard.js';
import { SESSION_COOKIE, clearSessionCookie } from '$lib/server/auth/session.js';

/**
 * 1. Cookie の ID トークンを jose で検証して locals.user を作る
 * 2. /buyer→buyer, /seller→seller, /admin→admin|operator（/api/... も同じ）をロールで守る
 * @type {import('@sveltejs/kit').Handle}
 */
export async function handle({ event, resolve }) {
	event.locals.user = null;

	const idToken = event.cookies.get(SESSION_COOKIE);
	if (idToken) {
		try {
			const config = firebaseConfig(envFrom(event.platform));
			const decoded = await verifyIdToken(idToken, config);
			if (decoded.role) {
				event.locals.user = {
					uid: decoded.uid,
					role: /** @type {import('$lib/shared/roles.js').Role} */ (decoded.role),
					companyId: decoded.companyId,
					traineeId: decoded.traineeId
				};
			}
		} catch {
			// 期限切れ・改ざん・設定不足はすべて未ログイン扱い
			clearSessionCookie(event.cookies);
		}
	}

	const { pathname } = event.url;
	const decision = guard(pathname, event.locals.user);
	if (decision.type === 'login') {
		if (isApiPath(pathname)) return json({ error: 'ログインが必要です' }, { status: 401 });
		redirect(303, `/?next=${encodeURIComponent(pathname)}`);
	}
	if (decision.type === 'forbidden') {
		if (isApiPath(pathname)) return json({ error: 'この操作はできません' }, { status: 403 });
		error(403, 'このロールでは開けない画面です');
	}

	return resolve(event);
}
