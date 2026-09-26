<script>
	import { resolve } from '$app/paths';
	import EntityForm from '$lib/admin/EntityForm.svelte';
	import { TRAINEE_FIELDS } from '$lib/admin/forms.js';

	let { data, form } = $props();
</script>

<h1><small>A2</small> 修行者</h1>
{#if form?.errors}<p class="error">{form.errors.join('。')}</p>{/if}
{#if form?.created}<p class="ok">登録しました。</p>{/if}

<table>
	<thead><tr><th>氏名</th><th>大学</th><th>出身</th><th>uid</th><th></th></tr></thead>
	<tbody>
		{#each data.trainees as t (t.id)}
			<tr>
				<td>{t.name}</td>
				<td>{t.university}<br /><small>{t.grade}</small></td>
				<td>{t.hometown}</td>
				<td><code>{t.uid}</code></td>
				<td><a href={resolve('/admin/trainees/[id]', { id: t.id })}>編集</a></td>
			</tr>
		{/each}
	</tbody>
</table>

<h2>修行者を登録する</h2>
<EntityForm fields={TRAINEE_FIELDS} action="?/create" submitLabel="登録" />

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
