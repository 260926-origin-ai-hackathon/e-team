/**
 * wrangler types が生成する worker-configuration.d.ts は main（.svelte-kit/cloudflare/_worker.js）を
 * import するため、svelte-check がビルド成果物まで型検査してしまう。その1行だけ unknown に置き換える。
 */
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'worker-configuration.d.ts';
const src = readFileSync(path, 'utf8');
const fixed = src.replace(
	/mainModule: typeof import\("\.\/\.svelte-kit\/cloudflare\/_worker"\);/,
	'mainModule: unknown; // ビルド成果物を型検査に含めないため scripts/fix-worker-types.js が書き換え'
);
if (fixed !== src) {
	writeFileSync(path, fixed);
	console.log('worker-configuration.d.ts: mainModule の import を外しました');
}
