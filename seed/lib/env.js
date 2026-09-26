import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * seed スクリプト用: .dev.vars と .env を process.env に合成して返す（既にある環境変数が優先）。
 * ENV_FILE を指定したときはそのファイルだけを読む（本番: ENV_FILE=.dev.vars.production）。
 * dotenv 形式（KEY=value、"..." で囲めば \n を改行に戻す）だけを扱う。
 * @returns {import('../../src/lib/server/env.js').Env}
 */
export function loadEnv() {
	/** @type {Record<string, string>} */
	const fromFiles = {};
	const files = process.env.ENV_FILE ? [process.env.ENV_FILE] : ['.env', '.dev.vars'];
	for (const file of files) {
		const p = resolve(process.cwd(), file);
		if (!existsSync(p)) {
			if (process.env.ENV_FILE) throw new Error(`${file} がありません`);
			continue;
		}
		for (const raw of readFileSync(p, 'utf8').split('\n')) {
			const line = raw.trim();
			if (!line || line.startsWith('#')) continue;
			const i = line.indexOf('=');
			if (i < 0) continue;
			const key = line.slice(0, i).trim();
			let value = line.slice(i + 1).trim();
			if (value.startsWith('"') && value.endsWith('"')) {
				value = value.slice(1, -1).replace(/\\n/g, '\n');
			} else if (value.startsWith("'") && value.endsWith("'")) {
				value = value.slice(1, -1);
			}
			fromFiles[key] = value;
		}
	}
	return { ...fromFiles, ...process.env };
}
