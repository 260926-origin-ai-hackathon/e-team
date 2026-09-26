import { describe, expect, it } from 'vitest';
import { addMonths, applyGate } from './seller.js';

/** @type {import('../../types.js').Placement} */
const base = {
	id: 'p',
	companyId: 'c',
	traineeId: 't',
	companyName: '',
	traineeName: '',
	traineeUniversity: '',
	stage: 1,
	startedAt: '2026-06-01',
	stageStartedAt: '2026-06-01',
	nextGateAt: '2026-08-01',
	agreementSigned: false,
	endReason: null,
	flags: ['over60'],
	lastReportSummary: ''
};

describe('applyGate', () => {
	it('次の段階へ: stage +1、段階開始日は今日、次のゲートは2か月後、注意ラベルは消える', () => {
		expect(applyGate(base, 'next', '2026-09-25')).toEqual({
			stage: 2,
			stageStartedAt: '2026-09-25',
			nextGateAt: '2026-11-25',
			flags: []
		});
	});
	it('もう1ヶ月: 次のゲートだけ1か月延ばす', () => {
		expect(applyGate(base, 'extend', '2026-09-25')).toEqual({ nextGateAt: '2026-09-01' });
	});
	it('ここまで: 終了（rejected）', () => {
		expect(applyGate(base, 'stop', '2026-09-25')).toEqual({
			stage: 'ended',
			endReason: 'rejected',
			nextGateAt: '2026-09-25'
		});
	});
	it('段階3から次へ: 終了（succeeded）', () => {
		expect(applyGate({ ...base, stage: 3 }, 'next', '2026-09-25')).toEqual({
			stage: 'ended',
			endReason: 'succeeded',
			nextGateAt: '2026-09-25'
		});
	});
	it('終了済みには判定できない', () => {
		expect(() => applyGate({ ...base, stage: 'ended' }, 'next')).toThrow();
	});
});

describe('addMonths', () => {
	it('月末をまたいでも壊れない', () => {
		expect(addMonths('2026-01-31', 1)).toBe('2026-03-03');
		expect(addMonths('2026-09-25', 2)).toBe('2026-11-25');
	});
});
