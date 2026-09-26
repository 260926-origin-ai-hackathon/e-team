import { error, fail } from '@sveltejs/kit';
import { serverContext } from '$lib/server/db.js';
import { firebaseConfig } from '$lib/server/firebase/config.js';
import { adminSetUserRole, canAdminWrite } from '$lib/server/data/admin.js';

/** @param {App.Locals} locals */
function requireAdmin(locals) {
	if (!canAdminWrite(locals.user, 'users'))
		error(403, 'ユーザーとロールの変更は admin だけができます');
	return /** @type {string} */ (locals.user?.uid);
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ platform, locals }) {
	requireAdmin(locals);
	const { db } = serverContext(platform);
	const [users, companies, trainees] = await Promise.all([
		db.query('', 'users', { orderBy: [{ field: 'role' }] }),
		db.query('', 'companies'),
		db.query('', 'trainees')
	]);
	return { users, companies, trainees };
}

/** @type {import('./$types').Actions} */
export const actions = {
	save: async ({ request, platform, locals }) => {
		const actorUid = requireAdmin(locals);
		const form = await request.formData();
		const uid = String(form.get('uid') ?? '').trim();
		const role = String(form.get('role') ?? '');
		const displayName = String(form.get('displayName') ?? '').trim() || uid;
		if (!uid || !['admin', 'operator', 'seller', 'buyer'].includes(role))
			return fail(400, { message: 'uid とロールは必須です' });
		const { db, env } = serverContext(platform);
		await adminSetUserRole(db, firebaseConfig(env), {
			actorUid,
			uid,
			displayName,
			role: /** @type {import('$lib/shared/roles.js').Role} */ (role),
			companyId: role === 'seller' ? String(form.get('companyId') ?? '') || undefined : undefined,
			traineeId: role === 'buyer' ? String(form.get('traineeId') ?? '') || undefined : undefined
		});
		return { saved: uid };
	}
};
