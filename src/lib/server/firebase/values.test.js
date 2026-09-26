import { describe, expect, it } from 'vitest';
import { decodeDocument, decodeFields, encodeFields } from './values.js';

describe('encodeFields / decodeFields', () => {
	it('主な型を往復できる', () => {
		const input = {
			s: 'あ',
			n: 3,
			d: 1.5,
			b: false,
			z: null,
			arr: ['x', 2],
			map: { k: { deep: true } },
			skip: undefined
		};
		const encoded = encodeFields(input);
		expect(encoded.n).toEqual({ integerValue: '3' });
		expect(encoded.d).toEqual({ doubleValue: 1.5 });
		expect(encoded.skip).toBeUndefined();
		const expected = { ...input };
		delete expected.skip;
		expect(decodeFields(encoded)).toEqual(expected);
	});
	it('Date は timestampValue になり、読むと ISO 文字列', () => {
		const at = new Date('2026-09-25T00:00:00.000Z');
		expect(encodeFields({ at }).at).toEqual({ timestampValue: '2026-09-25T00:00:00.000Z' });
		expect(decodeFields(encodeFields({ at })).at).toBe('2026-09-25T00:00:00.000Z');
	});
	it('decodeDocument は id と path を付ける', () => {
		const doc = {
			name: 'projects/p/databases/(default)/documents/placements/p1/reports/r1',
			fields: { body: { stringValue: 'x' } }
		};
		expect(decodeDocument(doc)).toEqual({ id: 'r1', path: 'placements/p1/reports/r1', body: 'x' });
	});
});
