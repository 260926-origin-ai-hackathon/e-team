import { KarteSchema } from './schemas.js';
import { karteFallback } from './fallback.js';
import { runFeature } from './run.js';

/**
 * カルテ整理（O3 → S1・S2）: 社長の話し言葉＋数字 → カルテの文脈項目と現場3行
 * @param {import('./run.js').AiContext} ctx
 * @param {{ rawNotes: string, company: Partial<import('../../types.js').Company> }} input
 */
export function organizeKarte(ctx, input) {
	const c = input.company;
	const numbers = [
		c.name && `社名: ${c.name}`,
		c.region && `地域: ${c.region}`,
		c.industry && `業種: ${c.industry}`,
		c.revenue != null && `年商: ${c.revenue}万円`,
		c.operatingProfit != null && `営業利益: ${c.operatingProfit}万円`,
		c.employees != null && `従業員: ${c.employees}名`,
		c.majorClients?.length && `主な取引先: ${c.majorClients.join('、')}`,
		c.hasDebt != null && `借入: ${c.hasDebt ? 'あり' : 'なし'}`
	]
		.filter(Boolean)
		.join('\n');
	return runFeature(ctx, {
		feature: 'karte',
		schema: KarteSchema,
		effort: 'medium',
		system: `社長が話し言葉で書いた会社の説明を、企業カルテの項目に整理します。
- ownerWords は原文の中の一番その社長らしい一文をそのまま。
- fieldSummary3 は、修行者（大学生）が企業カードで最初に読む3行。1行目は会社の成り立ち、2行目は現場の課題、3行目は承継の状況。各行50字以内。
- 原文に無いことは書かない。`,
		user: `# 社長の話し言葉\n${input.rawNotes}\n\n# 数字\n${numbers}`,
		inputSummary: `rawNotes ${input.rawNotes.length}字`,
		fallback: () => karteFallback(input)
	});
}
