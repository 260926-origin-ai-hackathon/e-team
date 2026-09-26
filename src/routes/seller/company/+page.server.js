import { error, fail } from '@sveltejs/kit';
import { serverContext } from '$lib/server/db.js';
import { getCompany } from '$lib/server/data/companies.js';
import { adoptedProposalsForCompany } from '$lib/server/data/seller.js';
import { organizeKarte, risksAndRoadmap } from '$lib/server/ai/index.js';

/**
 * @param {App.Platform | undefined} platform
 * @param {App.Locals} locals
 */
async function ownCompany(platform, locals) {
	const companyId = locals.user?.companyId;
	if (!companyId) error(403, '会社が紐づいていないアカウントです');
	const ctx = serverContext(platform);
	const company = await getCompany(ctx.db, companyId);
	if (!company) error(404, '会社が見つかりません');
	return { ...ctx, company };
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ platform, locals }) {
	const { company } = await ownCompany(platform, locals);
	return { company };
}

/** @type {import('./$types').Actions} */
export const actions = {
	organize: async ({ request, platform, locals }) => {
		const { db, ai, company } = await ownCompany(platform, locals);
		const form = await request.formData();
		const rawNotes = String(form.get('rawNotes') ?? '').trim();
		if (!rawNotes) return fail(400, { message: '話し言葉が空です' });
		const { output, fallback } = await organizeKarte(ai, { rawNotes, company });
		await db.update(`companies/${company.id}`, { rawNotes, ...output });
		return { ok: true, organized: true, fallback };
	},

	risks: async ({ platform, locals }) => {
		const { db, ai, company } = await ownCompany(platform, locals);
		const adoptedProposals = await adoptedProposalsForCompany(db, company.id);
		const { output, fallback } = await risksAndRoadmap(ai, { company, adoptedProposals });
		await db.update(`companies/${company.id}`, { risks: output.risks, roadmap: output.roadmap });
		return { ok: true, risked: true, fallback, adopted: adoptedProposals.length };
	}
};
