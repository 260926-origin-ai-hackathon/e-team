import { PERSPECTIVES } from '../../types.js';
import { AssessmentSchema } from './schemas.js';
import { assessmentFallback } from './fallback.js';
import { runFeature } from './run.js';

/**
 * 見極めレポート（O2）: その修行者の日報・提案・社長の反応 → 5観点ごとの所見（根拠の日報日付つき）。合否・点数なし
 * @param {import('./run.js').AiContext} ctx
 * @param {{
 *   traineeName: string,
 *   reports: Pick<import('../../types.js').Report, 'date' | 'body' | 'perspectives'>[],
 *   proposals: Pick<import('../../types.js').Proposal, 'date' | 'content' | 'ownerReaction'>[],
 *   gates: Pick<import('../../types.js').Gate, 'stage' | 'decision' | 'ownerComment' | 'at'>[]
 * }} input
 */
export function assessCandidate(ctx, input) {
	const reports = [...input.reports].sort((a, b) => a.date.localeCompare(b.date));
	const reportText = reports.map((r) => `- ${r.date}: ${r.body}`).join('\n');
	const proposalText = input.proposals
		.map((p) => `- ${p.date}: ${p.content}（社長の反応: ${reactionLabel(p.ownerReaction)}）`)
		.join('\n');
	const gateText = input.gates
		.map((g) => `- ${g.at.slice(0, 10)} 段階${g.stage} → ${g.decision}: ${g.ownerComment}`)
		.join('\n');
	// Jev が振り分けた「根拠候補の日付」を観点ごとに渡す
	const candidates = PERSPECTIVES.map((p) => {
		const dates = reports.filter((r) => r.perspectives?.includes(p.id)).map((r) => r.date);
		return `- ${p.id}（${p.label}）: ${dates.length ? dates.join(', ') : '候補なし'}`;
	}).join('\n');

	return runFeature(ctx, {
		feature: 'assessment',
		schema: AssessmentSchema,
		effort: 'medium',
		maxTokens: 4096,
		system: `社長が「この人に任せられるか」を判断する材料として、修行者の記録を5観点で整理します。
観点（id と意味）:
${PERSPECTIVES.map((p) => `- ${p.id}: ${p.label}`).join('\n')}
- 各観点の finding は2文まで。日報や社長のコメントの具体的な言葉を「」で引用する。
- evidenceDates は根拠にした日報の日付（入力にある日付だけ）。根拠候補の日付を優先して読む。
- 合否、点数、ランク、「優秀」「不十分」のような評価語は使わない。事実と引用だけを並べる。
- 5観点すべて、id の順に出す。`,
		user: `# 修行者\n${input.traineeName}\n\n# 日報\n${reportText}\n\n# 提案と社長の反応\n${proposalText || '（なし）'}\n\n# ゲートの記録\n${gateText || '（なし）'}\n\n# 観点ごとの根拠候補の日付（裏方の仕分け）\n${candidates}`,
		inputSummary: `${input.traineeName} 日報${reports.length}件 提案${input.proposals.length}件`,
		fallback: () => assessmentFallback({ dates: reports.map((r) => r.date) })
	});
}

/** @param {'adopted' | 'hold' | null} r */
function reactionLabel(r) {
	return r === 'adopted' ? '採用' : r === 'hold' ? '保留' : '未反応';
}
