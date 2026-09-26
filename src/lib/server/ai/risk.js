import { RiskSchema } from './schemas.js';
import { riskFallback } from './fallback.js';
import { runFeature } from './run.js';

/**
 * 承継リスクとロードマップ（O3）: カルテ＋数字＋採用された提案 → リスク上位3つ、1〜3年目のロードマップ
 * @param {import('./run.js').AiContext} ctx
 * @param {{ company: Partial<import('../../types.js').Company>, adoptedProposals: { date: string, content: string }[] }} input
 */
export function risksAndRoadmap(ctx, input) {
	const c = input.company;
	const karte = [
		c.name && `社名: ${c.name}（${c.region ?? ''} ${c.industry ?? ''}）`,
		c.revenue != null &&
			`年商 ${c.revenue}万円 / 営業利益 ${c.operatingProfit ?? '不明'}万円 / 従業員 ${c.employees ?? '不明'}名`,
		c.majorClients?.length && `主な取引先: ${c.majorClients.join('、')}`,
		c.hasDebt != null && `借入: ${c.hasDebt ? 'あり' : 'なし'}`,
		c.rawNotes && `社長の話し言葉: ${c.rawNotes}`,
		c.values?.length && `大事にしていること: ${c.values.join(' / ')}`,
		c.fieldIssues?.length && `現場の課題: ${c.fieldIssues.join(' / ')}`,
		c.customers && `お客さん: ${c.customers}`,
		c.ownerOnlyWork?.length && `社長しかできない仕事: ${c.ownerOnlyWork.join(' / ')}`
	]
		.filter(Boolean)
		.join('\n');
	const adopted = input.adoptedProposals.map((p) => `- ${p.date}: ${p.content}`).join('\n');
	return runFeature(ctx, {
		feature: 'risk',
		schema: RiskSchema,
		effort: 'medium',
		maxTokens: 4096,
		system: `事業承継のリスクを3つと、承継までの3年のロードマップを作ります。
- risks は「属人化」「取引先の偏り」「借入と保証」の観点から、カルテの言葉を「」で引用して why を書く。action は採用された提案があればそれを踏まえる。
- roadmap は year 1〜3。theme は10字程度、items は各年2〜3個で、修行の段階（1: 従業員、2: 社長の右腕、3: 経営参画）に対応させる。
- 一般論は禁止。この会社の固有名詞（取引先名、人名、数字）を使う。`,
		user: `# 企業カルテ\n${karte}\n\n# 採用された提案\n${adopted || '（まだ無い）'}`,
		inputSummary: `${c.name ?? '会社'} 採用提案${input.adoptedProposals.length}件`,
		fallback: () => riskFallback()
	});
}
