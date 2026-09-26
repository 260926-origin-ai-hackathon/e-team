import { error, fail, redirect } from '@sveltejs/kit';
import { serverContext } from '$lib/server/db.js';
import { adminDelete, adminUpsert } from '$lib/server/data/admin.js';
import { TRAINEE_FIELDS, parseForm } from '$lib/admin/forms.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, platform }) {
	const { db } = serverContext(platform);
	const trainee = await db.get(`trainees/${params.id}`);
	if (!trainee) error(404, '修行者が見つかりません');
	return { trainee };
}

/** @type {import('./$types').Actions} */
export const actions = {
	save: async ({ request, params, platform, locals }) => {
		const { data, errors } = parseForm(await request.formData(), TRAINEE_FIELDS);
		if (errors.length) return fail(400, { errors });
		const { db } = serverContext(platform);
		await adminUpsert(db, {
			uid: locals.user?.uid ?? '',
			collection: 'trainees',
			id: params.id,
			data
		});
		return { saved: true };
	},
	remove: async ({ params, platform, locals }) => {
		const { db } = serverContext(platform);
		await adminDelete(db, { uid: locals.user?.uid ?? '', collection: 'trainees', id: params.id });
		redirect(303, '/admin/trainees');
	}
};
