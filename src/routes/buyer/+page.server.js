import { serverContext } from '$lib/server/db.js';
import { activePlacementCounts, listCompanies } from '$lib/server/data/companies.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ platform }) {
	const { db } = serverContext(platform);
	const [companies, counts] = await Promise.all([listCompanies(db), activePlacementCounts(db)]);
	return {
		companies: companies.map((c) => ({
			...c,
			remainingSlots: (c.slots ?? 3) - (counts.get(c.id) ?? 0)
		}))
	};
}
