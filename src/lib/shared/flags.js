import { daysSince } from './format.js';

/**
 * 注意ラベルの計算。
 * - over60: 段階1が60日を超えている（日数はコードで計算）
 * - simpleWorkOnly: 直近の日報が単純作業だけ（Jev の判定を使う）
 * @param {Pick<import('../types.js').Placement, 'stage' | 'stageStartedAt'>} placement
 * @param {Pick<import('../types.js').Report, 'simpleWorkOnly'>[]} recentReports  新しい順
 * @param {string} [today]
 * @returns {import('../types.js').Flag[]}
 */
export function computeFlags(placement, recentReports, today) {
	/** @type {import('../types.js').Flag[]} */
	const flags = [];
	if (placement.stage === 1 && daysSince(placement.stageStartedAt, today) > 60)
		flags.push('over60');
	const last = recentReports.slice(0, 3);
	if (last.length >= 3 && last.every((r) => r.simpleWorkOnly === true))
		flags.push('simpleWorkOnly');
	return flags;
}

/** @type {Record<import('../types.js').Flag, string>} */
export const FLAG_LABEL = {
	over60: '段階1が60日超',
	simpleWorkOnly: '単純作業だけ'
};
