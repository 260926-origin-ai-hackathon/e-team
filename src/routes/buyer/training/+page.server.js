import { serverContext } from '$lib/server/db.js';
import { getCompany } from '$lib/server/data/companies.js';
import {
	findPlacementForTrainee,
	listMissions,
	listProposals,
	listReports
} from '$lib/server/data/placements.js';
import { todayJst } from '$lib/shared/format.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ platform, locals }) {
	const { db } = serverContext(platform);
	const traineeId = locals.user?.traineeId;
	const placement = traineeId ? await findPlacementForTrainee(db, traineeId) : null;
	if (!placement)
		return { placement: null, company: null, missions: [], reports: [], proposals: [] };
	const month = todayJst().slice(0, 7);
	const [company, missions, reports, proposals] = await Promise.all([
		getCompany(db, placement.companyId),
		listMissions(db, placement.id, month),
		listReports(db, placement.id),
		listProposals(db, placement.id)
	]);
	// 他の候補者の情報は一切返さない（この load は自分の placement だけを読む）
	return { placement, company, missions, reports, proposals, month };
}
