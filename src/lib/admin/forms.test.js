import { describe, expect, it } from 'vitest';
import { COMPANY_FIELDS, parseForm } from './forms.js';

describe('parseForm', () => {
	it('必須・数字・リスト・チェックを変換する', () => {
		const fd = new FormData();
		fd.set('name', ' 中村工務店 ');
		fd.set('region', '堺');
		fd.set('industry', '建築');
		fd.set('revenue', '8000');
		fd.set('employees', '9');
		fd.set('majorClients', 'A社、B社, C社');
		fd.set('hasDebt', 'on');
		fd.set('ownerUid', 'u');
		fd.set('slots', '');
		const { data, errors } = parseForm(fd, COMPANY_FIELDS);
		expect(errors).toEqual([]);
		expect(data).toMatchObject({
			name: '中村工務店',
			revenue: 8000,
			employees: 9,
			majorClients: ['A社', 'B社', 'C社'],
			hasDebt: true
		});
		expect('slots' in data).toBe(false);
	});
	it('必須が空ならエラー', () => {
		const fd = new FormData();
		fd.set('revenue', 'abc');
		const { errors } = parseForm(fd, COMPANY_FIELDS);
		expect(errors).toContain('社名は必須です');
		expect(errors).toContain('年商（万円）は数字で入力してください');
	});
});
