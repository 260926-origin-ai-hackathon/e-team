import { serverContext } from '$lib/server/db.js';
import { listAllPlacements } from '$lib/server/data/placements.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ platform }) {
	const { db } = serverContext(platform);
	const placements = (await listAllPlacements(db)).sort((a, b) => {
		const order = (/** @type {import('$lib/types.js').Placement} */ p) =>
			p.stage === 'ended' ? 9 : p.stage;
		return order(a) - order(b) || a.nextGateAt.localeCompare(b.nextGateAt);
	});
	const flagged = placements.filter((p) => p.stage !== 'ended' && p.flags?.length);
	const recentAi = await db.query('', 'aiLogs', {
		orderBy: [{ field: 'at', direction: 'DESCENDING' }],
		limit: 5
	});
	return { placements, flagged, recentAi };
}
