import { describe, expect, it } from 'vitest';
import { areaOf, canAccess } from './roles.js';

describe('areaOf', () => {
	it('パスの先頭から機能を返す', () => {
		expect(areaOf('/buyer')).toBe('buyer');
		expect(areaOf('/buyer/training')).toBe('buyer');
		expect(areaOf('/seller/candidates/abc')).toBe('seller');
		expect(areaOf('/admin/users')).toBe('admin');
	});
	it('該当しないパスは null', () => {
		expect(areaOf('/')).toBeNull();
		expect(areaOf('/api/auth/demo')).toBeNull();
		expect(areaOf('/buyers')).toBeNull();
	});
});

describe('canAccess', () => {
	it('buyer は /buyer だけ', () => {
		expect(canAccess('buyer', 'buyer')).toBe(true);
		expect(canAccess('buyer', 'seller')).toBe(false);
		expect(canAccess('buyer', 'admin')).toBe(false);
	});
	it('admin と operator は /admin に入れる', () => {
		expect(canAccess('admin', 'admin')).toBe(true);
		expect(canAccess('operator', 'admin')).toBe(true);
		expect(canAccess('seller', 'admin')).toBe(false);
	});
	it('未ログインはどこにも入れない', () => {
		expect(canAccess(null, 'buyer')).toBe(false);
		expect(canAccess(undefined, 'admin')).toBe(false);
	});
});
