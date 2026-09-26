<script>
	import { enhance } from '$app/forms';
	import { ROLE_LABEL } from '$lib/shared/roles.js';

	let { data, form } = $props();
	let role = $state('buyer');
</script>

<h1><small>A3</small> ユーザーとロール</h1>
<p class="note">
	ロールは Firebase の custom claims として付きます（本番と同じ仕組み）。変更は auditLogs
	に残ります。admin だけが変更できます。
</p>
{#if form?.message}<p class="error">{form.message}</p>{/if}
{#if form?.saved}<p class="ok">{form.saved} を保存しました。次回ログインから反映されます。</p>{/if}

<table>
	<thead
		><tr><th>uid</th><th>表示名</th><th>ロール</th><th>会社／修行者</th><th>デモ</th></tr></thead
	>
	<tbody>
		{#each data.users as u (u.id)}
			<tr>
				<td><code>{u.id}</code></td>
				<td>{u.displayName}</td>
				<td>{ROLE_LABEL[/** @type {import('$lib/shared/roles.js').Role} */ (u.role)] ?? u.role}</td>
				<td>{u.companyId ?? u.traineeId ?? '—'}</td>
				<td>{u.isDemo ? '✓' : ''}</td>
			</tr>
		{/each}
	</tbody>
</table>

<h2>ロールを設定する</h2>
<form method="POST" action="?/save" use:enhance>
	<label>uid <input name="uid" required placeholder="例: demo-buyer" /></label>
	<label>表示名 <input name="displayName" /></label>
	<label
		>ロール
		<select name="role" bind:value={role}>
			<option value="buyer">buyer（修行者）</option>
			<option value="seller">seller（社長）</option>
			<option value="operator">operator（運営）</option>
			<option value="admin">admin（管理者）</option>
		</select>
	</label>
	{#if role === 'seller'}
		<label
			>会社
			<select name="companyId"
				>{#each data.companies as c (c.id)}<option value={c.id}>{c.name}</option>{/each}</select
			>
		</label>
	{:else if role === 'buyer'}
		<label
			>修行者
			<select name="traineeId"
				>{#each data.trainees as t (t.id)}<option value={t.id}>{t.name}</option>{/each}</select
			>
		</label>
	{/if}
	<button type="submit">保存</button>
</form>

<style>
	.note {
		font-size: 0.85rem;
		color: var(--muted);
	}
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
	form {
		display: grid;
		gap: 10px;
		background: #fff;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 16px;
		max-width: 520px;
	}
	label {
		display: grid;
		gap: 4px;
		font-size: 0.9rem;
		color: var(--muted);
	}
	input,
	select {
		font: inherit;
		font-size: 0.95rem;
		padding: 8px 10px;
		border: 1px solid var(--line);
		border-radius: 8px;
		color: var(--fg);
	}
	button {
		font: inherit;
		font-weight: 600;
		background: var(--accent);
		color: #fff;
		border: none;
		border-radius: 999px;
		padding: 10px 20px;
		cursor: pointer;
		justify-self: start;
	}
	.error {
		color: #b91c1c;
	}
	.ok {
		color: #166534;
	}
</style>
