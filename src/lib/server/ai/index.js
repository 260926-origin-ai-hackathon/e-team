export { organizeKarte } from './karte.js';
export { reportFeedback } from './feedback.js';
export { assessCandidate } from './assessment.js';
export { risksAndRoadmap } from './risk.js';
export { sortReport } from './sort.js';

/**
 * リクエストごとの AI コンテキストを作る
 * @param {import('../env.js').Env} env
 * @param {import('../firebase/firestore.js').Firestore | null} db
 * @param {App.Platform | undefined} platform
 * @returns {import('./run.js').AiContext}
 */
export function aiContext(env, db, platform) {
	const ai = /** @type {any} */ (platform?.env)?.AI ?? null;
	return { env, db, ai };
}
