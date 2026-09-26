import { envFrom, isDemoMode } from '$lib/server/env.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ platform, url }) {
	return {
		demoMode: isDemoMode(envFrom(platform)),
		next: url.searchParams.get('next')
	};
}
