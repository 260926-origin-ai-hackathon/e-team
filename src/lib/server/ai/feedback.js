import { FeedbackSchema } from './schemas.js';
import { feedbackFallback } from './fallback.js';
import { runFeature } from './run.js';

/**
 * 日報フィードバック（S3、ライブ）: 日報＋企業カルテ → 気づき1つ、改善提案の下書き1つ、カルテ更新候補
 * 3秒以内を目指すので effort は low、出力は短い
 * @param {import('./run.js').AiContext} ctx
 * @param {{ date: string, body: string, company: Partial<import('../../types.js').Company>, stage: import('../../types.js').PlacementStage }} input
 */
export function reportFeedback(ctx, input) {
	const c = input.company;
	const karte = [
		c.ownerWords && `社長の一言: ${c.ownerWords}`,
		c.values?.length && `大事にしていること: ${c.values.join(' / ')}`,
		c.fieldIssues?.length && `現場の課題: ${c.fieldIssues.join(' / ')}`,
		c.ownerOnlyWork?.length && `社長しかできない仕事: ${c.ownerOnlyWork.join(' / ')}`,
		c.successorRequirements?.length && `後継者に求めること: ${c.successorRequirements.join(' / ')}`
	]
		.filter(Boolean)
		.join('\n');
	return runFeature(ctx, {
		feature: 'feedback',
		schema: FeedbackSchema,
		effort: 'low',
		maxTokens: 1024,
		system: `修行者の日報を読んで返します。
- insight: 日報の具体的な場面や言葉を「」で引用し、それがカルテのどの項目とつながるかを1〜2文で。
- proposalDraft: 明日から現場でできる小さな改善を1つ。誰が・何を・いつまでが分かる1〜2文。
- karteCandidates: 日報から分かった、カルテに追記すべき事実（最大3つ、無ければ空）。field は values / fieldIssues / customers / ownerOnlyWork / successorRequirements。
褒め言葉や励ましは書かない。`,
		user: `# 企業カルテ\n${karte}\n\n# 修行の段階\n段階${input.stage}\n\n# 日報（${input.date}）\n${input.body}`,
		inputSummary: `${input.date} 日報 ${input.body.length}字`,
		fallback: () => feedbackFallback(input)
	});
}
