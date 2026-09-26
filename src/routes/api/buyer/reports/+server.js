import { error, json } from '@sveltejs/kit';
import { serverContext } from '$lib/server/db.js';
import { getCompany } from '$lib/server/data/companies.js';
import { createReport, findPlacementForTrainee, listReports } from '$lib/server/data/placements.js';
import { reportFeedback, sortReport } from '$lib/server/ai/index.js';
import { computeFlags } from '$lib/shared/flags.js';

/**
 * POST /api/buyer/reports { body }
 * 日報を保存 → Claude のフィードバックと Jev の仕分けを並行 → 日報と placement を更新して返す
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, locals, platform }) {
	const user = locals.user;
	if (!user?.traineeId) error(403, '修行者のアカウントではありません');
	const input = await request.json().catch(() => ({}));
	const body = typeof input?.body === 'string' ? input.body.trim() : '';
	if (!body) error(400, '日報が空です');
	if (body.length > 2000) error(400, '日報は2000字までです');

	const { db, ai } = serverContext(platform);
	const placement = await findPlacementForTrainee(db, user.traineeId);
	if (!placement || placement.stage === 'ended') error(409, '進行中の修行がありません');
	const company = await getCompany(db, placement.companyId);
	if (!company) error(500, '企業カルテがありません');

	const report = await createReport(db, placement.id, { body });

	const [feedback, sorted] = await Promise.all([
		reportFeedback(ai, { date: report.date, body, company, stage: placement.stage }),
		sortReport(ai, { body })
	]);
	// カルテ更新候補の項目分けは Jev の結果があればそれで上書き
	const karteCandidates = feedback.output.karteCandidates;
	const aiFeedback = { ...feedback.output, karteCandidates };
	await db.update(`placements/${placement.id}/reports/${report.id}`, {
		aiFeedback,
		perspectives: sorted.output.perspectives,
		simpleWorkOnly: sorted.output.simpleWorkOnly
	});

	const recent = await listReports(db, placement.id);
	const flags = computeFlags(placement, recent);
	await db.update(`placements/${placement.id}`, {
		lastReportSummary: aiFeedback.insight.slice(0, 60),
		flags
	});

	return json({
		report: {
			...report,
			aiFeedback,
			perspectives: sorted.output.perspectives,
			simpleWorkOnly: sorted.output.simpleWorkOnly
		},
		fallback: feedback.fallback,
		latencyMs: feedback.latencyMs
	});
}
