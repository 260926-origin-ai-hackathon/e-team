import { SignJWT, importPKCS8 } from 'jose';

/**
 * サービスアカウントで Google OAuth2 のアクセストークンを取る（JWT bearer フロー）。
 * firebase-admin は Workers で動かないので自前で行う。期限までメモリにキャッシュ。
 * https://developers.google.com/identity/protocols/oauth2/service-account
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** @type {Map<string, { token: string, expiresAt: number }>} */
const cache = new Map();

/**
 * @param {{ clientEmail: string, privateKey: string }} sa
 * @param {string[]} scopes
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<string>}
 */
export async function getAccessToken(sa, scopes, fetchImpl = fetch) {
	const key = `${sa.clientEmail}|${scopes.join(' ')}`;
	const hit = cache.get(key);
	const now = Math.floor(Date.now() / 1000);
	if (hit && hit.expiresAt - 60 > now) return hit.token;

	const privateKey = await importPKCS8(sa.privateKey, 'RS256');
	const assertion = await new SignJWT({ scope: scopes.join(' ') })
		.setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
		.setIssuer(sa.clientEmail)
		.setAudience(TOKEN_URL)
		.setIssuedAt(now)
		.setExpirationTime(now + 3600)
		.sign(privateKey);

	const res = await fetchImpl(TOKEN_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion
		})
	});
	if (!res.ok)
		throw new Error(`Google OAuth2 トークン取得に失敗: ${res.status} ${await res.text()}`);
	const json = /** @type {{ access_token: string, expires_in: number }} */ (await res.json());
	cache.set(key, { token: json.access_token, expiresAt: now + json.expires_in });
	return json.access_token;
}

/** テスト用 */
export function clearTokenCache() {
	cache.clear();
}
