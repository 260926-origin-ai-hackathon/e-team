/**
 * デモ用ユーザーを Firebase Auth に作り、custom claims（ロール）を付ける。
 * 使い方: npm run seed:users  （既定はエミュレータ。.dev.vars / 環境変数で本番にも向けられる）
 */
import { loadEnv } from './lib/env.js';
import { firebaseConfig } from '../src/lib/server/firebase/config.js';
import { ensureUserWithClaims } from '../src/lib/server/firebase/identity.js';
import { DEMO_USERS } from '../src/lib/server/auth/demoUsers.js';

const env = loadEnv();
const config = firebaseConfig(env);
console.log(
	`対象: ${config.projectId}（${config.authEmulatorHost ? 'Auth エミュレータ ' + config.authEmulatorHost : '本番 Firebase'}）`
);
for (const spec of Object.values(DEMO_USERS)) {
	await ensureUserWithClaims(config, spec);
	console.log(`  ${spec.uid}: ${JSON.stringify(spec.claims)}`);
}
console.log('デモ用ユーザーを用意しました');
