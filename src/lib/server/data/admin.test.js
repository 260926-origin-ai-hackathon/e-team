import { describe, expect, it } from 'vitest';
import { canAdminWrite } from './admin.js';

describe('canAdminWrite', () => {
	const admin = { uid: 'a', role: /** @type {const} */ ('admin') };
	const operator = { uid: 'o', role: /** @type {const} */ ('operator') };
	const seller = { uid: 's', role: /** @type {const} */ ('seller') };
	it('companies・trainees は admin と operator', () => {
		expect(canAdminWrite(admin, 'companies')).toBe(true);
		expect(canAdminWrite(operator, 'trainees')).toBe(true);
		expect(canAdminWrite(seller, 'companies')).toBe(false);
		expect(canAdminWrite(null, 'companies')).toBe(false);
	});
	it('users は admin だけ（operator では入れない）', () => {
		expect(canAdminWrite(admin, 'users')).toBe(true);
		expect(canAdminWrite(operator, 'users')).toBe(false);
	});
});
