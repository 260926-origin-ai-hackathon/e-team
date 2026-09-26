import { SignJWT, UnsecuredJWT, importPKCS8 } from 'jose';

/**
 * Firebase カスタムトークンを作る。
 * 本番: サービスアカウント鍵で RS256 署名（https://firebase.google.com/docs/auth/admin/create-custom-tokens）
 *   iss / sub = サービスアカウントのメール、aud は固定値、exp は iat + 1時間以内、uid、claims
 * エミュレータ: 署名は検証されないので alg=none の JWT を返す
 */

const AUD =
	'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
const RESERVED = new Set([
	'acr',
	'amr',
	'at_hash',
	'aud',
	'auth_time',
	'azp',
	'cnf',
	'c_hash',
	'exp',
	'iat',
	'iss',
	'jti',
	'nbf',
	'nonce',
	'sub',
	'firebase',
	'user_id'
]);

/**
 * @param {import('./config.js').FirebaseServerConfig} config
 * @param {string} uid
 * @param {Record<string, unknown>} [claims]
 * @returns {Promise<string>}
 */
export async function createCustomToken(config, uid, claims = {}) {
	for (const k of Object.keys(claims)) {
		if (RESERVED.has(k)) throw new Error(`カスタムクレームに予約語 ${k} は使えません`);
	}
	const now = Math.floor(Date.now() / 1000);
	const payload = { uid, claims };

	if (config.authEmulatorHost) {
		return new UnsecuredJWT(payload)
			.setIssuer('firebase-auth-emulator@example.com')
			.setSubject('firebase-auth-emulator@example.com')
			.setAudience(AUD)
			.setIssuedAt(now)
			.setExpirationTime(now + 3600)
			.encode();
	}

	if (!config.serviceAccount) throw new Error('サービスアカウント鍵がありません');
	const key = await importPKCS8(config.serviceAccount.privateKey, 'RS256');
	return new SignJWT(payload)
		.setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
		.setIssuer(config.serviceAccount.clientEmail)
		.setSubject(config.serviceAccount.clientEmail)
		.setAudience(AUD)
		.setIssuedAt(now)
		.setExpirationTime(now + 3600)
		.sign(key);
}
