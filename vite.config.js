import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				platformProxy: {
					// Workers AI（Jev）はリモート専用のバインディングなので、既定ではローカル開発で繋ぎに行かない
					// （wrangler login 済みで実物を試すときは CF_REMOTE_BINDINGS=true npm run dev）
					remoteBindings: process.env.CF_REMOTE_BINDINGS === 'true'
				}
			})
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.js',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			},
			{
				// Security Rules のテスト。Firestore エミュレータが必要なので npm run test:rules で別に動かす
				extends: './vite.config.js',
				test: {
					name: 'rules',
					environment: 'node',
					include: ['firebase/**/*.test.js'],
					// assertSucceeds / assertFails は vitest の expect ではないので要求しない
					expect: { requireAssertions: false },
					testTimeout: 20000,
					hookTimeout: 30000
				}
			}
		]
	}
});
