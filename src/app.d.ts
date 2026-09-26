// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Locals {
			/** ログイン中のユーザー。未ログインは null（フェーズ1で hooks.server.js が入れる） */
			user: import('$lib/shared/roles.js').SessionUser | null;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
