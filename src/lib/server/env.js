/**
 * 実行環境の設定値を1か所で読む。
 * - Cloudflare Workers / wrangler dev: platform.env（wrangler.jsonc の vars + secrets / .dev.vars）
 * - vite dev: adapter-cloudflare の platformProxy が同じものを platform.env に入れる
 * - Node スクリプト（seed など）: process.env
 *
 * @typedef {Record<string, string | undefined>} Env
 */

/**
 * @param {App.Platform | undefined} platform
 * @returns {Env}
 */
export function envFrom(platform) {
	const fromPlatform = /** @type {Env} */ (platform?.env ?? {});
	const fromProcess = typeof process !== 'undefined' ? /** @type {Env} */ (process.env) : {};
	return { ...fromProcess, ...fromPlatform };
}

/**
 * @param {Env} env
 * @param {string} key
 * @returns {string}
 */
export function required(env, key) {
	const v = env[key];
	if (!v) throw new Error(`環境変数 ${key} がありません`);
	return v;
}

/** @param {Env} env */
export function isDemoMode(env) {
	return env.DEMO_MODE === 'true';
}
