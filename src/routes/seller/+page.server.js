import { error } from '@sveltejs/kit';
import { serverContext } from '$lib/server/db.js';
import { listPlacementsForCompany } from '$lib/server/data/placements.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ platform, locals }) {
	const companyId = locals.user?.companyId;
	if (!companyId) error(403, '会社が紐づいていないアカウントです');
	const { db } = serverContext(platform);
	const placements = await listPlacementsForCompany(db, companyId);
	/** @param {import('$lib/types.js').PlacementStage} s */
	const column = (s) =>
		placements.filter((p) => p.stage === s).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
	const columns = /** @type {const} */ ([1, 2, 3, 'ended']).map((s) => {
		const items = column(s);
		const nextGate = s === 'ended' ? null : (items.map((p) => p.nextGateAt).sort()[0] ?? null);
		return { stage: s, items, nextGate };
	});
	return {
		columns,
		flaggedCount: placements.filter((p) => p.stage !== 'ended' && p.flags?.length).length
	};
}
