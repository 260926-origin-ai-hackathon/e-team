<script>
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { AREA_TABS, ROLE_LABEL } from '$lib/shared/roles.js';
	import { logout } from '$lib/shared/login.js';

	/** @type {{ area: import('$lib/shared/roles.js').Area, user: import('$lib/shared/roles.js').SessionUser | null }} */
	let { area, user } = $props();

	const tabs = $derived(AREA_TABS[area]);

	/** @param {string} href */
	function isCurrent(href) {
		const p = page.url.pathname;
		if (href === `/${area}`) return p === href;
		return p === href || p.startsWith(href + '/');
	}

	async function onLogout() {
		await logout();
		await invalidateAll();
		await goto(resolve('/'));
	}
</script>

<nav class="tabs" aria-label="画面の切り替え">
	{#each tabs as tab (tab.href)}
		<a
			href={resolve(/** @type {any} */ (tab.href))}
			aria-current={isCurrent(tab.href) ? 'page' : undefined}
		>
			<small>{tab.id}</small>
			{tab.label}
		</a>
	{/each}
	<span class="role">
		{#if user}
			{ROLE_LABEL[user.role]}
			<button type="button" onclick={onLogout}>ログアウト</button>
		{:else}
			<a href={resolve('/')}>ロール選択へ</a>
		{/if}
	</span>
</nav>

<style>
	.role button {
		margin-left: 8px;
		font: inherit;
		font-size: 0.85rem;
		background: none;
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 4px 10px;
		cursor: pointer;
		color: var(--muted);
	}
</style>
