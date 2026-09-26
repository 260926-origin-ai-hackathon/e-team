import { error, json } from '@sveltejs/kit';
import { serverContext } from '$lib/server/db.js';
import { createProposal, findPlacementForTrainee } from '$lib/server/data/placements.js';

/**
 * POST /api/buyer/proposals { content, reportId? }
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, locals, platform }) {
	const user = locals.user;
	if (!user?.traineeId) error(403, '修行者のアカウントではありません');
	const input = await request.json().catch(() => ({}));
	const content = typeof input?.content === 'string' ? input.content.trim() : '';
	if (!content) error(400, '提案が空です');

	const { db } = serverContext(platform);
	const placement = await findPlacementForTrainee(db, user.traineeId);
	if (!placement || placement.stage === 'ended') error(409, '進行中の修行がありません');
	const proposal = await createProposal(db, placement.id, {
		content,
		reportId: typeof input?.reportId === 'string' ? input.reportId : undefined
	});
	return json({ proposal });
}
