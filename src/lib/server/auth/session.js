/** ID トークンを入れる Cookie。ID トークンの期限は1時間なので Cookie も同じにする */
export const SESSION_COOKIE = 'tsugumi_session';
export const SESSION_MAX_AGE = 60 * 60;

/**
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @param {string} idToken
 * @param {boolean} secure
 */
export function setSessionCookie(cookies, idToken, secure) {
	cookies.set(SESSION_COOKIE, idToken, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: SESSION_MAX_AGE
	});
}

/** @param {import('@sveltejs/kit').Cookies} cookies */
export function clearSessionCookie(cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
