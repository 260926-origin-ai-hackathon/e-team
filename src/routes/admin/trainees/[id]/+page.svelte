<script>
	import { resolve } from '$app/paths';
	import EntityForm from '$lib/admin/EntityForm.svelte';
	import { TRAINEE_FIELDS } from '$lib/admin/forms.js';

	let { data, form } = $props();
</script>

<p><a href={resolve('/admin/trainees')}>← 修行者一覧</a></p>
<h1><small>A2</small> {data.trainee.name}</h1>
{#if form?.errors}<p class="error">{form.errors.join('。')}</p>{/if}
{#if form?.saved}<p class="ok">保存しました。</p>{/if}
<EntityForm fields={TRAINEE_FIELDS} values={data.trainee} action="?/save" deleteAction="?/remove" />

<style>
	.error {
		color: #b91c1c;
	}
	.ok {
		color: #166534;
	}
</style>
