<script>
	import { resolve } from '$app/paths';
	import EntityForm from '$lib/admin/EntityForm.svelte';
	import { COMPANY_FIELDS } from '$lib/admin/forms.js';
	import { formatMan } from '$lib/shared/format.js';

	let { data, form } = $props();
</script>

<h1><small>A2</small> 企業</h1>
{#if form?.errors}<p class="error">{form.errors.join('。')}</p>{/if}
{#if form?.created}<p class="ok">登録しました。</p>{/if}

<table>
	<thead><tr><th>社名</th><th>地域・業種</th><th>年商／従業員</th><th>枠</th><th></th></tr></thead>
	<tbody>
		{#each data.companies as c (c.id)}
			<tr>
				<td>{c.name}</td>
				<td>{c.region}<br /><small>{c.industry}</small></td>
				<td>{formatMan(c.revenue)}／{c.employees}名</td>
				<td>{c.slots}</td>
				<td><a href={resolve('/admin/companies/[id]', { id: c.id })}>編集</a></td>
			</tr>
		{/each}
	</tbody>
</table>

<h2>企業を登録する</h2>
<EntityForm fields={COMPANY_FIELDS} action="?/create" submitLabel="登録" />

<style>
	table {
		width: 100%;
		border-collapse: collapse;
		background: #fff;
		border: 1px solid var(--line);
		font-size: 0.9rem;
		margin-bottom: 20px;
	}
	th,
	td {
		text-align: left;
		padding: 8px 10px;
		border-bottom: 1px solid var(--line);
	}
	th {
		background: #f3efe8;
		font-size: 0.8rem;
	}
	h2 {
		font-size: 1rem;
		color: var(--accent);
	}
	.error {
		color: #b91c1c;
	}
	.ok {
		color: #166534;
	}
</style>
