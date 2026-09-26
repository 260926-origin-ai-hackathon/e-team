import { getAccessToken } from './googleToken.js';

/**
 * Identity Toolkit REST（Firebase Auth の管理API）の薄いクライアント。
 * https://cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/update
 * 本番: サービスアカウントの OAuth2 トークン（scope: identitytoolkit）
 * エミュレータ: http://<host>/identitytoolkit.googleapis.com/v1/...、Authorization: Bearer owner
 */

const SCOPES = [
	'https://www.googleapis.com/auth/identitytoolkit',
	'https://www.googleapis.com/auth/cloud-platform'
];

/**
 * @param {import('./config.js').FirebaseServerConfig} config
 */
async function base(config) {
	if (config.authEmulatorHost) {
		return {
			url: `http://${config.authEmulatorHost}/identitytoolkit.googleapis.com/v1`,
			token: 'owner'
		};
	}
	if (!config.serviceAccount) throw new Error('サービスアカウント鍵がありません');
	return {
		url: 'https://identitytoolkit.googleapis.com/v1',
		token: await getAccessToken(config.serviceAccount, SCOPES)
	};
}

/**
 * @param {import('./config.js').FirebaseServerConfig} config
 * @param {string} method  例 'accounts:lookup'
 * @param {Record<string, unknown>} body
 * @returns {Promise<any>}
 */
async function call(config, method, body) {
	const { url, token } = await base(config);
	const res = await fetch(`${url}/${method}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
		body: JSON.stringify(body)
	});
	const json = await res.json();
	if (!res.ok) {
		const msg = json?.error?.message ?? res.statusText;
		const err = new Error(`Identity Toolkit ${method} に失敗: ${msg}`);
		/** @type {any} */ (err).code = msg;
		throw err;
	}
	return json;
}

/**
 * @typedef {object} DemoUserSpec
 * @property {string} uid
 * @property {string} displayName
 * @property {string} email
 * @property {Record<string, unknown>} claims  role / companyId / traineeId
 */

/**
 * ユーザーを（無ければ作って）custom claims を設定する。何度呼んでも同じ結果になる。
 * @param {import('./config.js').FirebaseServerConfig} config
 * @param {DemoUserSpec} spec
 */
export async function ensureUserWithClaims(config, spec) {
	const found = await call(config, 'accounts:lookup', { localId: [spec.uid] });
	if (!found.users?.length) {
		await call(config, 'accounts:signUp', {
			localId: spec.uid,
			email: spec.email,
			displayName: spec.displayName,
			emailVerified: true
		});
	}
	await call(config, 'accounts:update', {
		localId: spec.uid,
		displayName: spec.displayName,
		customAttributes: JSON.stringify(spec.claims)
	});
	return spec.uid;
}
