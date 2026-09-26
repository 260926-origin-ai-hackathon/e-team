<script>
	import { enhance } from '$app/forms';

	/** @type {{ fields: import('./forms.js').Field[], values?: Record<string, any>, action: string, submitLabel?: string, deleteAction?: string }} */
	let { fields, values = {}, action, submitLabel = '保存', deleteAction } = $props();
	let busy = $state(false);
</script>

<form
	method="POST"
	{action}
	use:enhance={() => {
		busy = true;
		return async ({ update }) => {
			busy = false;
			await update({ reset: false });
		};
	}}
>
	{#each fields as f (f.name)}
		<label class="field" class:check={f.type === 'checkbox'}>
			<span
				>{f.label}{#if f.required}<b>*</b>{/if}{#if f.hint}<small>{f.hint}</small>{/if}</span
			>
			{#if f.type === 'textarea'}
				<textarea name={f.name} rows="3">{values[f.name] ?? ''}</textarea>
			{:else if f.type === 'checkbox'}
				<input type="checkbox" name={f.name} checked={Boolean(values[f.name])} />
			{:else if f.type === 'list'}
				<input
					name={f.name}
					value={Array.isArray(values[f.name]) ? values[f.name].join('、') : ''}
				/>
			{:else if f.type === 'number'}
				<input name={f.name} type="number" value={values[f.name] ?? ''} />
			{:else}
				<input name={f.name} value={values[f.name] ?? ''} required={f.required} />
			{/if}
		</label>
	{/each}
	<div class="actions">
		<button type="submit" disabled={busy}>{busy ? '保存中…' : submitLabel}</button>
		{#if deleteAction}
			<button
				type="submit"
				formaction={deleteAction}
				class="danger"
				disabled={busy}
				onclick={(e) => {
					if (!confirm('削除しますか？')) e.preventDefault();
				}}>削除</button
			>
		{/if}
	</div>
</form>

<style>
	form {
		display: grid;
		gap: 10px;
		background: #fff;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 16px;
	}
	.field {
		display: grid;
		gap: 4px;
		font-size: 0.9rem;
	}
	.field span {
		color: var(--muted);
	}
	.field b {
		color: #b91c1c;
		margin-left: 2px;
	}
	.field small {
		margin-left: 8px;
	}
	.field.check {
		grid-template-columns: auto 1fr;
		align-items: center;
	}
	input,
	textarea {
		font: inherit;
		font-size: 0.95rem;
		padding: 8px 10px;
		border: 1px solid var(--line);
		border-radius: 8px;
		width: 100%;
	}
	input[type='checkbox'] {
		width: auto;
	}
	.actions {
		display: flex;
		gap: 8px;
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
	}
	button:disabled {
		opacity: 0.6;
	}
	.danger {
		background: #fff;
		color: #b91c1c;
		border: 1px solid #b91c1c;
	}
</style>
