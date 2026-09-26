import { fail } from '@sveltejs/kit';
import { serverContext } from '$lib/server/db.js';
import { listCompanies } from '$lib/server/data/companies.js';
import { adminUpsert } from '$lib/server/data/admin.js';
import { COMPANY_FIELDS, parseForm } from '$lib/admin/forms.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ platform }) {
	const { db } = serverContext(platform);
	return { companies: await listCompanies(db) };
}

/** @type {import('./$types').Actions} */
export const actions = {
	create: async ({ request, platform, locals }) => {
		const { data, errors } = parseForm(await request.formData(), COMPANY_FIELDS);
		if (errors.length) return fail(400, { errors });
		const { db } = serverContext(platform);
		const { id } = await adminUpsert(db, {
			uid: locals.user?.uid ?? '',
			collection: 'companies',
			data: {
				slots: 3,
				values: [],
				fieldIssues: [],
				ownerOnlyWork: [],
				successorRequirements: [],
				stageWork: [],
				fieldSummary3: [],
				risks: [],
				roadmap: [],
				...data
			}
		});
		return { created: id };
	}
};
