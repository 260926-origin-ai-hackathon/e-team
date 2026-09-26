<script>
	import CandidateCard from '$lib/seller/CandidateCard.svelte';
	import { STAGE_LABEL } from '$lib/types.js';
	import { formatDate } from '$lib/shared/format.js';

	let { data } = $props();
</script>

<h1><small>O1</small> 候補者ボード</h1>
{#if data.flaggedCount}
	<p class="warn">⚠ 注意ラベルの付いた候補者が {data.flaggedCount} 名います（黄色のカード）。</p>
{/if}

<div class="board">
	{#each data.columns as col (col.stage)}
		<section class="col" class:ended={col.stage === 'ended'}>
			<header>
				<h2>
					{col.stage === 'ended' ? '終了' : `段階${col.stage}`}<small
						>{col.stage === 'ended' ? '' : STAGE_LABEL[col.stage]}</small
					>
				</h2>
				{#if col.nextGate}
					<p class="gate">次のゲート {formatDate(col.nextGate)}</p>
				{/if}
			</header>
			<div class="cards">
				{#each col.items as p (p.id)}
					<CandidateCard placement={p} />
				{:else}
					<p class="empty">—</p>
				{/each}
			</div>
		</section>
	{/each}
</div>

<style>
	.warn {
		background: var(--warn-bg);
		border-radius: var(--radius);
		padding: 12px 16px;
	}
	.board {
		display: grid;
		gap: 12px;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	}
	.col {
		background: #f3efe8;
		border-radius: var(--radius);
		padding: 12px;
	}
	.col.ended {
		opacity: 0.75;
	}
	header {
		margin-bottom: 8px;
	}
	h2 {
		font-size: 1.05rem;
		margin: 0;
	}
	h2 small {
		margin-left: 8px;
		font-weight: normal;
		color: var(--muted);
		font-size: 0.85rem;
	}
	.gate {
		margin: 2px 0 0;
		font-size: 0.9rem;
		color: var(--accent);
	}
	.cards {
		display: grid;
		gap: 10px;
	}
	.empty {
		color: var(--muted);
		text-align: center;
		margin: 12px 0;
	}
</style>
