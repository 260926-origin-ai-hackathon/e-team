<script>
	import { resolve } from '$app/paths';
	import EntityForm from '$lib/admin/EntityForm.svelte';
	import { COMPANY_FIELDS } from '$lib/admin/forms.js';

	let { data, form } = $props();
</script>

<p><a href={resolve('/admin/companies')}>← 企業一覧</a></p>
<h1><small>A2</small> {data.company.name}</h1>
{#if form?.errors}<p class="error">{form.errors.join('。')}</p>{/if}
{#if form?.saved}<p class="ok">保存しました。</p>{/if}
<EntityForm fields={COMPANY_FIELDS} values={data.company} action="?/save" deleteAction="?/remove" />

<style>
	.error {
		color: #b91c1c;
	}
	.ok {
		color: #166534;
	}
</style>
