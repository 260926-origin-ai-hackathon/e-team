import { signInWithCustomToken, signOut } from 'firebase/auth';
import { firebaseAuth } from './firebaseClient.js';

/**
 * デモログイン: サーバーからカスタムトークン → Firebase にログイン → ID トークンを Cookie へ
 * @param {import('./roles.js').Role} role
 * @returns {Promise<{ home: string }>}
 */
export async function demoLogin(role) {
	const res = await fetch('/api/auth/demo', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ role })
	});
	if (!res.ok) throw new Error(await errorMessage(res));
	const { customToken, home } = await res.json();

	const auth = firebaseAuth();
	const cred = await signInWithCustomToken(auth, customToken);
	// custom claims を含む新しい ID トークンを取る
	const idToken = await cred.user.getIdToken(true);

	const session = await fetch('/api/auth/session', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ idToken })
	});
	if (!session.ok) throw new Error(await errorMessage(session));
	return { home };
}

export async function logout() {
	await fetch('/api/auth/session', { method: 'DELETE' });
	try {
		await signOut(firebaseAuth());
	} catch {
		// 画面側の状態は Cookie ほど重要ではないので無視
	}
}

/** @param {Response} res */
async function errorMessage(res) {
	try {
		const j = await res.json();
		return j?.message ?? j?.error ?? `${res.status}`;
	} catch {
		return `${res.status}`;
	}
}
