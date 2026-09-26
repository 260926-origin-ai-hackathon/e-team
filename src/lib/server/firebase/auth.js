import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';

/**
 * Firebase ID トークンの検証。
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 * - alg RS256、kid に対応する Google の公開鍵で署名を検証（jose の createRemoteJWKSet が max-age でキャッシュ）
 * - iss = https://securetoken.google.com/<projectId>、aud = projectId、exp/iat/auth_time、sub 非空
 * エミュレータの ID トークンは署名なし（alg none）なので、署名以外の項目だけ確認する。
 */

const JWKS_URL = new URL(
	'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
);

/** @type {ReturnType<typeof createRemoteJWKSet> | null} */
let jwks = null;

/**
 * @typedef {object} DecodedIdToken
 * @property {string} uid
 * @property {string} [role]
 * @property {string} [companyId]
 * @property {string} [traineeId]
 * @property {Record<string, unknown>} claims
 */

/**
 * @param {string} idToken
 * @param {import('./config.js').FirebaseServerConfig} config
 * @param {{ getKey?: import('jose').JWTVerifyGetKey, now?: number }} [opts]  テスト用
 * @returns {Promise<DecodedIdToken>}
 */
export async function verifyIdToken(idToken, config, opts = {}) {
	const issuer = `https://securetoken.google.com/${config.projectId}`;
	/** @type {import('jose').JWTPayload} */
	let payload;

	if (config.authEmulatorHost && !opts.getKey) {
		payload = decodeJwt(idToken);
		const now = opts.now ?? Math.floor(Date.now() / 1000);
		if (payload.iss !== issuer) throw new Error('iss が違います');
		if (payload.aud !== config.projectId) throw new Error('aud が違います');
		if (typeof payload.exp !== 'number' || payload.exp <= now) throw new Error('期限切れです');
	} else {
		const getKey = opts.getKey ?? (jwks ??= createRemoteJWKSet(JWKS_URL));
		({ payload } = await jwtVerify(idToken, getKey, {
			issuer,
			audience: config.projectId,
			algorithms: ['RS256'],
			currentDate: opts.now ? new Date(opts.now * 1000) : undefined
		}));
	}

	if (typeof payload.sub !== 'string' || payload.sub === '') throw new Error('sub がありません');
	if (typeof payload.auth_time === 'number') {
		const now = opts.now ?? Math.floor(Date.now() / 1000);
		if (payload.auth_time > now + 60) throw new Error('auth_time が未来です');
	}

	const { sub, role, companyId, traineeId, ...rest } = /** @type {any} */ (payload);
	return {
		uid: sub,
		role: typeof role === 'string' ? role : undefined,
		companyId: typeof companyId === 'string' ? companyId : undefined,
		traineeId: typeof traineeId === 'string' ? traineeId : undefined,
		claims: rest
	};
}

/** テスト用 */
export function resetJwksCache() {
	jwks = null;
}
