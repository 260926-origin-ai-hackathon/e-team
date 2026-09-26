<script>
	import { resolve } from '$app/paths';
	import { formatMan } from '$lib/shared/format.js';

	/** @type {{ company: import('$lib/types.js').Company, remainingSlots: number }} */
	let { company, remainingSlots } = $props();
</script>

<a class="card" href={resolve('/buyer/companies/[id]', { id: company.id })}>
	<p class="words">「{company.ownerWords}」</p>
	<ul class="summary">
		{#each company.fieldSummary3 as line, i (i)}
			<li>{line}</li>
		{/each}
	</ul>
	<div class="foot">
		<small
			>{company.region} ／ {company.industry} ／ 年商{formatMan(company.revenue)} ／ 従業員{company.employees}名</small
		>
		<span class="slots" class:full={remainingSlots <= 0}>
			候補者枠 残り{Math.max(remainingSlots, 0)}/{company.slots}
		</span>
	</div>
</a>

<style>
	.card {
		display: block;
		background: #fff;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 20px;
		text-decoration: none;
		color: var(--fg);
	}
	.card:hover {
		border-color: var(--accent);
	}
	.words {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 12px;
		line-height: 1.5;
	}
	.summary {
		margin: 0 0 12px;
		padding-left: 1.2em;
		font-size: 0.95rem;
	}
	.summary li + li {
		margin-top: 2px;
	}
	.foot {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: space-between;
		align-items: center;
	}
	.foot small {
		color: var(--muted);
		font-size: 0.8rem;
	}
	.slots {
		font-size: 0.85rem;
		background: var(--accent-bg);
		color: var(--accent);
		border-radius: 999px;
		padding: 2px 10px;
		white-space: nowrap;
	}
	.slots.full {
		background: #f3f4f6;
		color: var(--muted);
	}
</style>
