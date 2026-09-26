import { z } from 'zod';

/** AI の出力スキーマ。スキーマに合わなければ fallback に切り替える */

export const KARTE_FIELDS = /** @type {const} */ ([
	'values',
	'fieldIssues',
	'customers',
	'ownerOnlyWork',
	'successorRequirements'
]);

export const PERSPECTIVE_IDS = /** @type {const} */ ([
	'fit',
	'persistence',
	'proposalFit',
	'reputation',
	'commitment'
]);

export const KarteSchema = z.object({
	ownerWords: z.string().describe('社長の一言。原文の言葉をそのまま1文'),
	values: z.array(z.string()).min(1).max(3).describe('大事にしていること'),
	fieldIssues: z.array(z.string()).min(1).max(3).describe('現場の課題'),
	customers: z.string().describe('お客さんは誰か'),
	ownerOnlyWork: z.array(z.string()).min(1).max(4).describe('社長しかできない仕事'),
	successorRequirements: z.array(z.string()).min(1).max(3).describe('後継者に求めること'),
	fieldSummary3: z.array(z.string()).length(3).describe('企業カード用の現場3行')
});

export const FeedbackSchema = z.object({
	insight: z.string().describe('気づき1つ。日報の言葉を引用して2文まで'),
	proposalDraft: z.string().describe('改善提案の下書き1つ。1〜2文'),
	karteCandidates: z
		.array(z.object({ field: z.enum(KARTE_FIELDS), text: z.string() }))
		.max(3)
		.describe('カルテ更新候補')
});

export const AssessmentSchema = z.object({
	items: z
		.array(
			z.object({
				id: z.enum(PERSPECTIVE_IDS),
				finding: z.string().describe('所見。2文まで。日報の言葉を引用。合否・点数は書かない'),
				evidenceDates: z.array(z.string()).min(1).max(4).describe('根拠の日報日付 YYYY-MM-DD')
			})
		)
		.length(5)
});

export const RiskSchema = z.object({
	risks: z
		.array(z.object({ title: z.string(), why: z.string(), action: z.string() }))
		.length(3)
		.describe('承継リスク上位3つ（属人化・取引先の偏り・借入と保証の観点）'),
	roadmap: z
		.array(
			z.object({
				year: z.number().int().min(1).max(3),
				theme: z.string(),
				items: z.array(z.string()).min(1).max(3)
			})
		)
		.length(3)
});

export const SortSchema = z.object({
	simpleWorkOnly: z.boolean().describe('掃除・運搬・片付けなどの単純作業だけの日報か'),
	perspectives: z.array(z.enum(PERSPECTIVE_IDS)).describe('この日報が根拠になる観点'),
	karteFields: z.array(z.enum(KARTE_FIELDS)).describe('カルテ更新候補が該当する項目')
});
