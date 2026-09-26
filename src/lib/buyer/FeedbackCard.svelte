<script>
	/** @type {{ feedback: import('$lib/types.js').AiFeedback | null, loading?: boolean, onPropose?: (draft: string) => void, proposed?: boolean }} */
	let { feedback, loading = false, onPropose, proposed = false } = $props();
</script>

<div class="fb" aria-busy={loading}>
	{#if loading}
		<div class="skeleton">
			<span class="line w80"></span>
			<span class="line w95"></span>
			<span class="line w60"></span>
		</div>
		<p class="wait">AIが日報を読んでいます…</p>
	{:else if feedback}
		<h4>気づき</h4>
		<p>{feedback.insight}</p>
		<h4>改善提案の下書き</h4>
		<p class="draft">{feedback.proposalDraft}</p>
		{#if onPropose}
			<button
				type="button"
				class="propose"
				onclick={() => onPropose(feedback.proposalDraft)}
				disabled={proposed}
			>
				{proposed ? '社長に提案しました' : 'この提案を社長に出す'}
			</button>
		{/if}
		{#if feedback.karteCandidates?.length}
			<p class="karte">
				カルテに追記候補: {feedback.karteCandidates.map((k) => k.text).join(' ／ ')}
			</p>
		{/if}
	{/if}
</div>

<style>
	.fb {
		background: var(--accent-bg);
		border-radius: var(--radius);
		padding: 14px 16px;
		font-size: 0.95rem;
	}
	h4 {
		margin: 0 0 4px;
		font-size: 0.8rem;
		color: var(--accent);
	}
	h4 + p {
		margin: 0 0 12px;
	}
	.draft {
		font-weight: 600;
	}
	.propose {
		font: inherit;
		font-size: 0.95rem;
		background: var(--accent);
		color: #fff;
		border: none;
		border-radius: 999px;
		padding: 8px 16px;
		cursor: pointer;
	}
	.propose:disabled {
		background: #d1d5db;
		cursor: default;
	}
	.karte {
		margin: 10px 0 0;
		font-size: 0.8rem;
		color: var(--muted);
	}
	.skeleton {
		display: grid;
		gap: 8px;
	}
	.line {
		display: block;
		height: 14px;
		border-radius: 6px;
		background: linear-gradient(90deg, #f1e7d8 25%, #fbf3e8 50%, #f1e7d8 75%);
		background-size: 200% 100%;
		animation: shimmer 1.2s infinite;
	}
	.w80 {
		width: 80%;
	}
	.w95 {
		width: 95%;
	}
	.w60 {
		width: 60%;
	}
	.wait {
		margin: 10px 0 0;
		color: var(--muted);
		font-size: 0.85rem;
	}
	@keyframes shimmer {
		from {
			background-position: 200% 0;
		}
		to {
			background-position: -200% 0;
		}
	}
</style>
