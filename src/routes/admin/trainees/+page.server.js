import { fail } from '@sveltejs/kit';
import { serverContext } from '$lib/server/db.js';
import { adminUpsert } from '$lib/server/data/admin.js';
import { TRAINEE_FIELDS, parseForm } from '$lib/admin/forms.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ platform }) {
	const { db } = serverContext(platform);
	return { trainees: await db.query('', 'trainees', { orderBy: [{ field: 'name' }] }) };
}

/** @type {import('./$types').Actions} */
export const actions = {
	create: async ({ request, platform, locals }) => {
		const { data, errors } = parseForm(await request.formData(), TRAINEE_FIELDS);
		if (errors.length) return fail(400, { errors });
		const { db } = serverContext(platform);
		const { id } = await adminUpsert(db, {
			uid: locals.user?.uid ?? '',
			collection: 'trainees',
			data
		});
		return { created: id };
	}
};
