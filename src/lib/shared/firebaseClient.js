import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, inMemoryPersistence, setPersistence } from 'firebase/auth';

/**
 * 画面側の Firebase。ログイン状態はサーバーの Cookie が正なので、
 * ブラウザ側は永続化しない（inMemoryPersistence）。
 * @returns {import('firebase/auth').Auth}
 */
export function firebaseAuth() {
	if (!browser) throw new Error('firebaseAuth はブラウザでだけ使えます');
	const app =
		getApps()[0] ??
		initializeApp({
			apiKey: env.PUBLIC_FIREBASE_API_KEY || 'demo-key',
			authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
			projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
			appId: env.PUBLIC_FIREBASE_APP_ID
		});
	const auth = getAuth(app);
	if (!(/** @type {any} */ (auth).__tsugumiReady)) {
		/** @type {any} */ (auth).__tsugumiReady = true;
		if (env.PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
			connectAuthEmulator(auth, `http://${env.PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`, {
				disableWarnings: true
			});
		}
		void setPersistence(auth, inMemoryPersistence);
	}
	return auth;
}
