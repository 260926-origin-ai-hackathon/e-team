import { error, fail, redirect } from '@sveltejs/kit';
import { serverContext } from '$lib/server/db.js';
import { getCompany } from '$lib/server/data/companies.js';
import { adminDelete, adminUpsert } from '$lib/server/data/admin.js';
import { COMPANY_FIELDS, parseForm } from '$lib/admin/forms.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, platform }) {
	const { db } = serverContext(platform);
	const company = await getCompany(db, params.id);
	if (!company) error(404, '企業が見つかりません');
	return { company };
}

/** @type {import('./$types').Actions} */
export const actions = {
	save: async ({ request, params, platform, locals }) => {
		const { data, errors } = parseForm(await request.formData(), COMPANY_FIELDS);
		if (errors.length) return fail(400, { errors });
		const { db } = serverContext(platform);
		await adminUpsert(db, {
			uid: locals.user?.uid ?? '',
			collection: 'companies',
			id: params.id,
			data
		});
		return { saved: true };
	},
	remove: async ({ params, platform, locals }) => {
		const { db } = serverContext(platform);
		await adminDelete(db, { uid: locals.user?.uid ?? '', collection: 'companies', id: params.id });
		redirect(303, '/admin/companies');
	}
};
