import { required } from '../env.js';

/**
 * @typedef {object} FirebaseServerConfig
 * @property {string} projectId
 * @property {string | undefined} authEmulatorHost  例 127.0.0.1:9099（空なら本番）
 * @property {string | undefined} firestoreEmulatorHost  例 127.0.0.1:8080（空なら本番）
 * @property {{ clientEmail: string, privateKey: string } | null} serviceAccount  本番のみ必須
 */

/**
 * @param {import('../env.js').Env} env
 * @returns {FirebaseServerConfig}
 */
export function firebaseConfig(env) {
	const projectId = env.FIREBASE_PROJECT_ID || env.PUBLIC_FIREBASE_PROJECT_ID;
	if (!projectId)
		throw new Error(
			'環境変数 FIREBASE_PROJECT_ID（または PUBLIC_FIREBASE_PROJECT_ID）がありません'
		);
	const authEmulatorHost = env.FIREBASE_AUTH_EMULATOR_HOST || undefined;
	const firestoreEmulatorHost = env.FIRESTORE_EMULATOR_HOST || undefined;
	const usingEmulator = Boolean(authEmulatorHost || firestoreEmulatorHost);
	const serviceAccount =
		env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY
			? {
					clientEmail: env.FIREBASE_CLIENT_EMAIL,
					// wrangler secret / .dev.vars では改行が \n で入るので戻す
					privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
				}
			: null;
	if (!usingEmulator && !serviceAccount) {
		required(env, 'FIREBASE_CLIENT_EMAIL');
		required(env, 'FIREBASE_PRIVATE_KEY');
	}
	return { projectId, authEmulatorHost, firestoreEmulatorHost, serviceAccount };
}
