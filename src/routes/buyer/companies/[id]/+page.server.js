import { error, fail } from '@sveltejs/kit';
import { serverContext } from '$lib/server/db.js';
import { activePlacementCounts, getCompany } from '$lib/server/data/companies.js';
import { createPlacement, findPlacementForTrainee } from '$lib/server/data/placements.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, platform, locals }) {
	const { db } = serverContext(platform);
	const [company, counts, mine] = await Promise.all([
		getCompany(db, params.id),
		activePlacementCounts(db),
		locals.user?.traineeId ? findPlacementForTrainee(db, locals.user.traineeId) : null
	]);
	if (!company) error(404, '企業が見つかりません');
	const active = mine && mine.stage !== 'ended' ? mine : null;
	return {
		company,
		remainingSlots: (company.slots ?? 3) - (counts.get(company.id) ?? 0),
		applied: active?.companyId === company.id,
		busyElsewhere: Boolean(active && active.companyId !== company.id)
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	apply: async ({ params, platform, locals }) => {
		const traineeId = locals.user?.traineeId;
		if (!traineeId) return fail(403, { message: '修行者のアカウントではありません' });
		const { db } = serverContext(platform);
		const [company, trainee, mine, counts] = await Promise.all([
			getCompany(db, params.id),
			db.get(`trainees/${traineeId}`),
			findPlacementForTrainee(db, traineeId),
			activePlacementCounts(db)
		]);
		if (!company || !trainee) return fail(404, { message: '企業または修行者が見つかりません' });
		if (mine && mine.stage !== 'ended')
			return fail(409, { message: 'すでに進行中の修行があります' });
		if ((company.slots ?? 3) - (counts.get(company.id) ?? 0) <= 0)
			return fail(409, { message: '候補者枠が埋まっています' });
		await createPlacement(db, { company, trainee: /** @type {any} */ (trainee) });
		return { applied: true };
	}
};
