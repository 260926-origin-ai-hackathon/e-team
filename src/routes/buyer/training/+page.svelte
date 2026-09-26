<script>
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import StageBar from '$lib/buyer/StageBar.svelte';
	import FeedbackCard from '$lib/buyer/FeedbackCard.svelte';
	import { formatDate } from '$lib/shared/format.js';

	let { data } = $props();

	let body = $state('');
	let sending = $state(false);
	/** @type {import('$lib/types.js').Report | null} */
	let justSent = $state(null);
	/** @type {string | null} */
	let message = $state(null);
	/** @type {Set<string>} */
	let proposedFor = $state(new Set());

	async function submitReport() {
		if (!body.trim() || sending) return;
		sending = true;
		message = null;
		justSent = null;
		try {
			const res = await fetch('/api/buyer/reports', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ body })
			});
			if (!res.ok)
				throw new Error((await res.json().catch(() => ({})))?.message ?? `${res.status}`);
			const json = await res.json();
			justSent = json.report;
			body = '';
			await invalidateAll();
		} catch (e) {
			message = `送信できませんでした: ${e instanceof Error ? e.message : String(e)}`;
		} finally {
			sending = false;
		}
	}

	/** @param {string} draft @param {string} reportId */
	async function propose(draft, reportId) {
		const res = await fetch('/api/buyer/proposals', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ content: draft, reportId })
		});
		if (res.ok) {
			proposedFor = new Set([...proposedFor, reportId]);
			await invalidateAll();
		} else {
			message = '提案を出せませんでした';
		}
	}

	/** @param {'adopted' | 'hold' | null} r */
	const reaction = (r) => (r === 'adopted' ? '採用' : r === 'hold' ? '保留' : '社長の反応待ち');
</script>

<h1><small>S3</small> 修行ダッシュボード</h1>

{#if !data.placement || !data.company}
	<p class="placeholder">
		まだ修行が始まっていません。<a href={resolve('/buyer')}>企業を探す</a>から応募してください。
	</p>
{:else}
	<p class="company">{data.company.name}（{data.company.region}）</p>
	<StageBar placement={data.placement} />

	<section>
		<h2>今月のミッション <small>{data.month?.replace('-', '年')}月</small></h2>
		{#if data.missions.length}
			<ul class="missions">
				{#each data.missions as m (m.id)}
					<li class:done={m.done}><span class="check">{m.done ? '✓' : ''}</span>{m.text}</li>
				{/each}
			</ul>
		{:else}
			<p class="placeholder">社長がまだ今月のミッションを設定していません。</p>
		{/if}
	</section>

	<section class="report">
		<h2>今日の日報</h2>
		{#if data.placement.stage === 'ended'}
			<p class="placeholder">修行は終了しています。</p>
		{:else}
			<textarea
				bind:value={body}
				rows="5"
				placeholder="今日、現場で何があったか。誰が何と言ったか。数字があれば数字も。"
				disabled={sending}></textarea>
			<button type="button" onclick={submitReport} disabled={sending || !body.trim()}>
				{sending ? '送信中…' : '日報を送る'}
			</button>
			{#if sending}
				<FeedbackCard feedback={null} loading />
			{:else if justSent}
				<FeedbackCard
					feedback={justSent.aiFeedback}
					onPropose={(d) => propose(d, justSent?.id ?? '')}
					proposed={proposedFor.has(justSent.id)}
				/>
			{/if}
			{#if message}
				<p class="error" role="alert">{message}</p>
			{/if}
		{/if}
	</section>

	<section>
		<h2>出した提案と社長の反応</h2>
		{#if data.proposals.length}
			<ul class="proposals">
				{#each data.proposals as p (p.id)}
					<li>
						<span
							class="badge"
							class:adopted={p.ownerReaction === 'adopted'}
							class:hold={p.ownerReaction === 'hold'}>{reaction(p.ownerReaction)}</span
						>
						<span class="date">{formatDate(p.date)}</span>
						<p>{p.content}</p>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="placeholder">まだ提案はありません。日報のフィードバックから出せます。</p>
		{/if}
	</section>

	<section>
		<h2>これまでの日報</h2>
		<ul class="reports">
			{#each data.reports as r (r.id)}
				<li>
					<div class="date">{formatDate(r.date)}</div>
					<p>{r.body}</p>
					{#if r.aiFeedback}
						<details>
							<summary>AIの気づきと提案の下書き</summary>
							<FeedbackCard
								feedback={r.aiFeedback}
								onPropose={(d) => propose(d, r.id)}
								proposed={proposedFor.has(r.id) || data.proposals.some((p) => p.reportId === r.id)}
							/>
						</details>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.company {
		color: var(--muted);
		margin: -8px 0 12px;
	}
	section {
		margin: 24px 0;
	}
	h2 {
		font-size: 1rem;
		color: var(--accent);
		margin: 0 0 8px;
	}
	h2 small {
		color: var(--muted);
		font-weight: normal;
	}
	.missions {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 6px;
	}
	.missions li {
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 10px 12px;
		display: flex;
		gap: 10px;
		align-items: center;
	}
	.missions li.done {
		color: var(--muted);
		text-decoration: line-through;
	}
	.check {
		width: 1.4em;
		height: 1.4em;
		border-radius: 50%;
		border: 1px solid var(--line);
		display: inline-grid;
		place-items: center;
		font-size: 0.8rem;
		color: var(--accent);
		flex: none;
	}
	.done .check {
		background: var(--accent-bg);
		border-color: var(--accent);
	}
	textarea {
		width: 100%;
		font: inherit;
		padding: 12px;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		resize: vertical;
	}
	.report button {
		width: 100%;
		margin: 8px 0 12px;
		font: inherit;
		font-size: 1.1rem;
		font-weight: 600;
		background: var(--accent);
		color: #fff;
		border: none;
		border-radius: var(--radius);
		padding: 14px;
		cursor: pointer;
	}
	.report button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.proposals,
	.reports {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 10px;
	}
	.proposals li,
	.reports li {
		background: #fff;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 12px 14px;
	}
	.proposals p,
	.reports p {
		margin: 6px 0 0;
		font-size: 0.95rem;
		white-space: pre-wrap;
	}
	.badge {
		font-size: 0.8rem;
		border-radius: 999px;
		padding: 2px 10px;
		background: #f3f4f6;
		color: var(--muted);
		margin-right: 8px;
	}
	.badge.adopted {
		background: #dcfce7;
		color: #166534;
	}
	.badge.hold {
		background: var(--warn-bg);
		color: #92400e;
	}
	.date {
		font-size: 0.8rem;
		color: var(--muted);
	}
	details {
		margin-top: 8px;
	}
	summary {
		cursor: pointer;
		font-size: 0.85rem;
		color: var(--accent);
	}
	.error {
		color: #b91c1c;
	}
</style>
