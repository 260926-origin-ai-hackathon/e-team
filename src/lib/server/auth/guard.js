import { areaOf, canAccess } from '../../shared/roles.js';

/**
 * パスとログイン状態から、通す／ログインへ／拒否 を決める（副作用なし。テストしやすくするため）
 * @param {string} pathname
 * @param {import('../../shared/roles.js').SessionUser | null} user
 * @returns {{ type: 'ok' } | { type: 'login' } | { type: 'forbidden', area: import('../../shared/roles.js').Area }}
 */
export function guard(pathname, user) {
	const area = areaOf(pathname) ?? apiAreaOf(pathname);
	if (!area) return { type: 'ok' };
	if (!user) return { type: 'login' };
	if (!canAccess(user.role, area)) return { type: 'forbidden', area };
	return { type: 'ok' };
}

/**
 * /api/buyer|seller|admin も同じロールで守る
 * @param {string} pathname
 * @returns {import('../../shared/roles.js').Area | null}
 */
function apiAreaOf(pathname) {
	const m = pathname.match(/^\/api\/(buyer|seller|admin)(\/|$)/);
	return m ? /** @type {import('../../shared/roles.js').Area} */ (m[1]) : null;
}

/** @param {string} pathname */
export function isApiPath(pathname) {
	return pathname.startsWith('/api/');
}
