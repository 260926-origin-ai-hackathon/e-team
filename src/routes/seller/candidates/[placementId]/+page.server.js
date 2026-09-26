import { error, fail } from '@sveltejs/kit';
import { serverContext } from '$lib/server/db.js';
import {
	getAssessment,
	getPlacement,
	listGates,
	listMissions,
	listProposals,
	listReports
} from '$lib/server/data/placements.js';
import {
	addMission,
	decideGate,
	reactToProposal,
	setMissionDone
} from '$lib/server/data/seller.js';
import { assessCandidate } from '$lib/server/ai/index.js';
import { todayJst } from '$lib/shared/format.js';

/**
 * @param {App.Platform | undefined} platform
 * @param {App.Locals} locals
 * @param {string} placementId
 */
async function ownPlacement(platform, locals, placementId) {
	const ctx = serverContext(platform);
	const placement = await getPlacement(ctx.db, placementId);
	if (!placement) error(404, '候補者が見つかりません');
	if (placement.companyId !== locals.user?.companyId) error(403, '自社の候補者ではありません');
	return { ...ctx, placement };
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, platform, locals }) {
	const { db, placement } = await ownPlacement(platform, locals, params.placementId);
	const [reports, proposals, gates, assessment, missions] = await Promise.all([
		listReports(db, placement.id),
		listProposals(db, placement.id),
		listGates(db, placement.id),
		getAssessment(db, placement.id),
		listMissions(db, placement.id, todayJst().slice(0, 7))
	]);
	return {
		placement,
		reports,
		proposals,
		gates,
		assessment,
		missions,
		month: todayJst().slice(0, 7)
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	react: async ({ request, params, platform, locals }) => {
		const { db, placement } = await ownPlacement(platform, locals, params.placementId);
		const form = await request.formData();
		const proposalId = String(form.get('proposalId') ?? '');
		const reaction = String(form.get('reaction') ?? '');
		if (!proposalId || !['adopted', 'hold', 'none'].includes(reaction))
			return fail(400, { message: '入力が不正です' });
		await reactToProposal(db, {
			placementId: placement.id,
			proposalId,
			reaction: reaction === 'none' ? null : /** @type {'adopted' | 'hold'} */ (reaction)
		});
		return { ok: true };
	},

	gate: async ({ request, params, platform, locals }) => {
		const { db, placement } = await ownPlacement(platform, locals, params.placementId);
		const form = await request.formData();
		const decision = String(form.get('decision') ?? '');
		if (!['next', 'extend', 'stop'].includes(decision))
			return fail(400, { message: '判定が不正です' });
		try {
			await decideGate(db, {
				uid: locals.user?.uid ?? '',
				placement,
				decision: /** @type {'next' | 'extend' | 'stop'} */ (decision),
				comment: String(form.get('comment') ?? '').trim(),
				agreementSigned: form.get('agreement') === 'on'
			});
		} catch (e) {
			return fail(400, { message: e instanceof Error ? e.message : String(e) });
		}
		return { ok: true, decided: decision };
	},

	assess: async ({ params, platform, locals }) => {
		const { db, ai, placement } = await ownPlacement(platform, locals, params.placementId);
		const [reports, proposals, gates] = await Promise.all([
			listReports(db, placement.id),
			listProposals(db, placement.id),
			listGates(db, placement.id)
		]);
		if (!reports.length) return fail(400, { message: '日報がまだ無いのでレポートを作れません' });
		const { output, fallback } = await assessCandidate(ai, {
			traineeName: placement.traineeName,
			reports,
			proposals,
			gates
		});
		await db.set(`placements/${placement.id}/assessment/current`, {
			items: output.items,
			generatedAt: new Date().toISOString(),
			source: fallback ? 'fallback' : 'claude'
		});
		return { ok: true, assessed: true, fallback };
	},

	mission: async ({ request, params, platform, locals }) => {
		const { db, placement } = await ownPlacement(platform, locals, params.placementId);
		const form = await request.formData();
		const text = String(form.get('text') ?? '').trim();
		if (!text) return fail(400, { message: 'ミッションが空です' });
		await addMission(db, placement.id, { month: todayJst().slice(0, 7), text });
		return { ok: true };
	},

	missionDone: async ({ request, params, platform, locals }) => {
		const { db, placement } = await ownPlacement(platform, locals, params.placementId);
		const form = await request.formData();
		await setMissionDone(
			db,
			placement.id,
			String(form.get('missionId') ?? ''),
			form.get('done') === 'true'
		);
		return { ok: true };
	}
};
