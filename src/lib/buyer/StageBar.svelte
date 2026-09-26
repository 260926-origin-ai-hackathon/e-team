<script>
	import { STAGE_LABEL } from '$lib/types.js';
	import { daysSince, formatDate } from '$lib/shared/format.js';

	/** @type {{ placement: import('$lib/types.js').Placement }} */
	let { placement } = $props();

	const stages = /** @type {const} */ ([1, 2, 3]);
	const current = $derived(placement.stage === 'ended' ? 0 : placement.stage);
	const days = $derived(daysSince(placement.startedAt));
</script>

<section class="stagebar" aria-label="修行の段階">
	<ol>
		{#each stages as s (s)}
			<li class:done={current > s} class:now={current === s}>
				<span class="num">段階{s}</span>
				<span class="label">{STAGE_LABEL[s]}</span>
			</li>
		{/each}
	</ol>
	<p class="meta">
		{#if placement.stage === 'ended'}
			修行は終了しました
		{:else}
			修行 {days}日目 ・ 次のゲート <strong>{formatDate(placement.nextGateAt)}</strong>
			{#if daysSince(placement.nextGateAt) < 0}
				<small>（あと{-daysSince(placement.nextGateAt)}日）</small>
			{/if}
		{/if}
	</p>
</section>

<style>
	.stagebar {
		background: #fff;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 16px;
	}
	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}
	li {
		border-radius: 8px;
		padding: 10px 8px;
		background: #f3f4f6;
		color: var(--muted);
		display: grid;
		gap: 2px;
		text-align: center;
	}
	li.done {
		background: #fde7cc;
		color: var(--accent);
	}
	li.now {
		background: var(--accent);
		color: #fff;
	}
	.num {
		font-size: 0.8rem;
	}
	.label {
		font-weight: 600;
		font-size: 0.95rem;
	}
	.meta {
		margin: 12px 0 0;
		font-size: 0.95rem;
	}
</style>
