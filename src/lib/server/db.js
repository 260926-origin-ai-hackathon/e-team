import { envFrom } from './env.js';
import { firebaseConfig } from './firebase/config.js';
import { Firestore } from './firebase/firestore.js';
import { aiContext } from './ai/index.js';

/**
 * リクエストから Firestore と AI コンテキストを作る（各 load / API の最初で呼ぶ）
 * @param {App.Platform | undefined} platform
 */
export function serverContext(platform) {
	const env = envFrom(platform);
	const db = new Firestore(firebaseConfig(env));
	return { env, db, ai: aiContext(env, db, platform) };
}
