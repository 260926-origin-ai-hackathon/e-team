import { describe, expect, it } from 'vitest';
import { computeFlags } from './flags.js';
import { daysSince, formatMan, todayJst } from './format.js';

describe('daysSince / todayJst', () => {
	it('日数を数える', () => {
		expect(daysSince('2026-07-13', '2026-09-25')).toBe(74);
		expect(daysSince('2026-09-25', '2026-09-25')).toBe(0);
	});
	it('JST の今日', () => {
		expect(todayJst(new Date('2026-09-24T16:00:00Z'))).toBe('2026-09-25');
		expect(todayJst(new Date('2026-09-24T14:59:00Z'))).toBe('2026-09-24');
	});
});

describe('computeFlags', () => {
	const today = '2026-09-25';
	it('段階1が60日超なら over60', () => {
		expect(computeFlags({ stage: 1, stageStartedAt: '2026-07-13' }, [], today)).toEqual(['over60']);
		expect(computeFlags({ stage: 1, stageStartedAt: '2026-08-01' }, [], today)).toEqual([]);
		expect(computeFlags({ stage: 2, stageStartedAt: '2026-06-01' }, [], today)).toEqual([]);
	});
	it('直近3件が単純作業だけなら simpleWorkOnly', () => {
		const simple = [{ simpleWorkOnly: true }, { simpleWorkOnly: true }, { simpleWorkOnly: true }];
		expect(computeFlags({ stage: 2, stageStartedAt: '2026-09-01' }, simple, today)).toEqual([
			'simpleWorkOnly'
		]);
		expect(
			computeFlags(
				{ stage: 2, stageStartedAt: '2026-09-01' },
				[{ simpleWorkOnly: true }, { simpleWorkOnly: false }, { simpleWorkOnly: true }],
				today
			)
		).toEqual([]);
		expect(
			computeFlags({ stage: 2, stageStartedAt: '2026-09-01' }, simple.slice(0, 2), today)
		).toEqual([]);
	});
	it('両方つく', () => {
		const simple = [{ simpleWorkOnly: true }, { simpleWorkOnly: true }, { simpleWorkOnly: true }];
		expect(computeFlags({ stage: 1, stageStartedAt: '2026-07-13' }, simple, today)).toEqual([
			'over60',
			'simpleWorkOnly'
		]);
	});
});

describe('formatMan', () => {
	it('万円を読みやすく', () => {
		expect(formatMan(8000)).toBe('8,000万円');
		expect(formatMan(12000)).toBe('1億2,000万円');
		expect(formatMan(20000)).toBe('2億円');
	});
});
