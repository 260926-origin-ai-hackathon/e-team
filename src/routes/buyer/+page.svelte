<script>
	import CompanyCard from '$lib/buyer/CompanyCard.svelte';

	let { data } = $props();
</script>

<h1><small>S1</small> 企業を探す</h1>
<p class="lead">数字より先に、社長の言葉と現場から会社を知る。</p>

<div class="cards">
	{#each data.companies as company (company.id)}
		<CompanyCard {company} remainingSlots={company.remainingSlots} />
	{:else}
		<p class="placeholder">まだ企業が登録されていません。</p>
	{/each}
</div>

<style>
	.lead {
		color: var(--muted);
		margin-top: 0;
	}
	.cards {
		display: grid;
		gap: 16px;
	}
</style>
