<script>
	import { resolve } from '$app/paths';
	import { daysSince } from '$lib/shared/format.js';
	import { FLAG_LABEL } from '$lib/shared/flags.js';

	/** @type {{ placement: import('$lib/types.js').Placement }} */
	let { placement: p } = $props();
	const flagged = $derived(p.flags?.length > 0 && p.stage !== 'ended');
</script>

<a
	class="card"
	class:flagged
	href={resolve('/seller/candidates/[placementId]', { placementId: p.id })}
>
	<div class="head">
		<strong>{p.traineeName}</strong>
		<small>{p.traineeUniversity}</small>
	</div>
	<div class="days">修行 {daysSince(p.startedAt)}日目</div>
	{#if p.lastReportSummary}
		<p class="summary">{p.lastReportSummary}</p>
	{/if}
	{#if flagged}
		<div class="flags">
			{#each p.flags as f (f)}<span>⚠ {FLAG_LABEL[f]}</span>{/each}
		</div>
	{/if}
</a>

<style>
	.card {
		display: block;
		background: #fff;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 14px 16px;
		text-decoration: none;
		color: var(--fg);
	}
	.card:hover {
		border-color: var(--accent);
	}
	.card.flagged {
		background: var(--warn-bg);
		border-color: #f59e0b;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 10px;
		align-items: baseline;
	}
	.head strong {
		font-size: 1.2rem;
	}
	.head small {
		color: var(--muted);
	}
	.days {
		font-size: 0.9rem;
		color: var(--muted);
		margin-top: 2px;
	}
	.summary {
		margin: 8px 0 0;
		font-size: 0.95rem;
	}
	.flags {
		margin-top: 8px;
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.flags span {
		font-size: 0.85rem;
		background: #fff;
		border-radius: 999px;
		padding: 2px 10px;
		color: #92400e;
	}
</style>
