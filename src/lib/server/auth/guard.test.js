import { describe, expect, it } from 'vitest';
import { guard } from './guard.js';

const buyer = { uid: 'b', role: /** @type {const} */ ('buyer'), traineeId: 't1' };
const seller = { uid: 's', role: /** @type {const} */ ('seller'), companyId: 'c1' };
const operator = { uid: 'o', role: /** @type {const} */ ('operator') };
const admin = { uid: 'a', role: /** @type {const} */ ('admin') };

describe('guard', () => {
	it('守らないパスは誰でも通す', () => {
		expect(guard('/', null)).toEqual({ type: 'ok' });
		expect(guard('/api/auth/demo', null)).toEqual({ type: 'ok' });
	});
	it('未ログインで /buyer /seller /admin はログインへ', () => {
		expect(guard('/buyer', null)).toEqual({ type: 'login' });
		expect(guard('/seller/company', null)).toEqual({ type: 'login' });
		expect(guard('/admin', null)).toEqual({ type: 'login' });
		expect(guard('/api/seller/x', null)).toEqual({ type: 'login' });
	});
	it('buyer で /seller を開くと弾かれる', () => {
		expect(guard('/seller', buyer)).toEqual({ type: 'forbidden', area: 'seller' });
		expect(guard('/admin/users', buyer)).toEqual({ type: 'forbidden', area: 'admin' });
		expect(guard('/api/seller/gate', buyer)).toEqual({ type: 'forbidden', area: 'seller' });
		expect(guard('/buyer/training', buyer)).toEqual({ type: 'ok' });
	});
	it('seller は /seller だけ', () => {
		expect(guard('/seller/candidates/p1', seller)).toEqual({ type: 'ok' });
		expect(guard('/buyer', seller)).toEqual({ type: 'forbidden', area: 'buyer' });
	});
	it('operator と admin は /admin に入れる', () => {
		expect(guard('/admin', operator)).toEqual({ type: 'ok' });
		expect(guard('/admin', admin)).toEqual({ type: 'ok' });
		expect(guard('/seller', admin)).toEqual({ type: 'forbidden', area: 'seller' });
	});
});
