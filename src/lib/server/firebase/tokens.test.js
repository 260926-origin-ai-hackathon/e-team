import { describe, expect, it, beforeAll } from 'vitest';
import {
	SignJWT,
	UnsecuredJWT,
	createLocalJWKSet,
	decodeJwt,
	decodeProtectedHeader,
	exportJWK,
	exportPKCS8,
	generateKeyPair,
	jwtVerify
} from 'jose';
import { createCustomToken } from './customToken.js';
import { verifyIdToken } from './auth.js';

/** @type {CryptoKey} */
let privateKey;
/** @type {CryptoKey} */
let publicKey;
/** @type {string} */
let pkcs8;

beforeAll(async () => {
	({ privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true }));
	pkcs8 = await exportPKCS8(privateKey);
});

const AUD =
	'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

describe('createCustomToken', () => {
	it('本番: サービスアカウント鍵で RS256 署名し、iss/sub/aud/uid/claims が入る', async () => {
		const config = {
			projectId: 'p',
			authEmulatorHost: undefined,
			firestoreEmulatorHost: undefined,
			serviceAccount: { clientEmail: 'sa@p.iam.gserviceaccount.com', privateKey: pkcs8 }
		};
		const token = await createCustomToken(config, 'u1', { role: 'buyer' });
		expect(decodeProtectedHeader(token).alg).toBe('RS256');
		const { payload } = await jwtVerify(token, publicKey, {
			issuer: 'sa@p.iam.gserviceaccount.com',
			audience: AUD
		});
		expect(payload.sub).toBe('sa@p.iam.gserviceaccount.com');
		expect(payload.uid).toBe('u1');
		expect(payload.claims).toEqual({ role: 'buyer' });
		expect(Number(payload.exp) - Number(payload.iat)).toBeLessThanOrEqual(3600);
	});
	it('エミュレータ: alg=none の JWT を返す', async () => {
		const config = {
			projectId: 'demo-p',
			authEmulatorHost: '127.0.0.1:9099',
			firestoreEmulatorHost: undefined,
			serviceAccount: null
		};
		const token = await createCustomToken(config, 'u2');
		expect(decodeProtectedHeader(token).alg).toBe('none');
		expect(decodeJwt(token).uid).toBe('u2');
	});
	it('予約語のクレームは拒否する', async () => {
		const config = {
			projectId: 'demo-p',
			authEmulatorHost: '127.0.0.1:9099',
			firestoreEmulatorHost: undefined,
			serviceAccount: null
		};
		await expect(createCustomToken(config, 'u', { sub: 'x' })).rejects.toThrow(/予約語/);
	});
});

describe('verifyIdToken', () => {
	const prod = {
		projectId: 'p',
		authEmulatorHost: undefined,
		firestoreEmulatorHost: undefined,
		serviceAccount: null
	};
	const emu = {
		projectId: 'demo-p',
		authEmulatorHost: '127.0.0.1:9099',
		firestoreEmulatorHost: undefined,
		serviceAccount: null
	};

	/** @param {Record<string, unknown>} claims @param {{ iss?: string, aud?: string, exp?: number }} [o] */
	async function signed(claims, o = {}) {
		const now = Math.floor(Date.now() / 1000);
		const jwk = await exportJWK(publicKey);
		const getKey = createLocalJWKSet({ keys: [{ ...jwk, kid: 'k1', alg: 'RS256', use: 'sig' }] });
		const token = await new SignJWT({ ...claims, auth_time: now - 5 })
			.setProtectedHeader({ alg: 'RS256', kid: 'k1' })
			.setIssuer(o.iss ?? 'https://securetoken.google.com/p')
			.setAudience(o.aud ?? 'p')
			.setSubject('uid-1')
			.setIssuedAt(now - 5)
			.setExpirationTime(o.exp ?? now + 3600)
			.sign(privateKey);
		return { token, getKey };
	}

	it('本番: 署名・iss・aud を検証し、custom claims を取り出す', async () => {
		const { token, getKey } = await signed({ role: 'seller', companyId: 'c1' });
		const d = await verifyIdToken(token, prod, { getKey });
		expect(d).toMatchObject({ uid: 'uid-1', role: 'seller', companyId: 'c1' });
	});
	it('本番: aud が違えば失敗', async () => {
		const { token, getKey } = await signed({ role: 'seller' }, { aud: 'other' });
		await expect(verifyIdToken(token, prod, { getKey })).rejects.toThrow();
	});
	it('本番: 期限切れは失敗', async () => {
		const now = Math.floor(Date.now() / 1000);
		const { token, getKey } = await signed({ role: 'seller' }, { exp: now - 10 });
		await expect(verifyIdToken(token, prod, { getKey })).rejects.toThrow();
	});
	it('エミュレータ: 署名なしトークンでも iss/aud/exp は確認する', async () => {
		const now = Math.floor(Date.now() / 1000);
		const ok = new UnsecuredJWT({ role: 'buyer', traineeId: 't2', auth_time: now - 1 })
			.setIssuer('https://securetoken.google.com/demo-p')
			.setAudience('demo-p')
			.setSubject('demo-buyer')
			.setIssuedAt(now - 1)
			.setExpirationTime(now + 100)
			.encode();
		expect(await verifyIdToken(ok, emu)).toMatchObject({
			uid: 'demo-buyer',
			role: 'buyer',
			traineeId: 't2'
		});

		const wrongAud = new UnsecuredJWT({ role: 'buyer' })
			.setIssuer('https://securetoken.google.com/demo-p')
			.setAudience('other')
			.setSubject('x')
			.setExpirationTime(now + 100)
			.encode();
		await expect(verifyIdToken(wrongAud, emu)).rejects.toThrow(/aud/);
	});
});
