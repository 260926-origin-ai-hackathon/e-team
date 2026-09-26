<script>
	import { STAGE_LABEL } from '$lib/types.js';
	import { daysSince, formatDate } from '$lib/shared/format.js';
	import { FLAG_LABEL } from '$lib/shared/flags.js';

	let { data } = $props();
	/** @param {import('$lib/types.js').PlacementStage} s */
	const stage = (s) => (s === 'ended' ? '終了' : `段階${s} ${STAGE_LABEL[s]}`);
</script>

<h1><small>A1</small> 全社の修行と注意ラベル</h1>

<section>
	<h2>注意ラベル <span class="count">{data.flagged.length}</span></h2>
	<p class="note">
		社長の画面と同じラベルを運営も見ています。修行者を単純作業だけに使う会社や、段階1に置きっぱなしの会社を早く見つけるためです。
	</p>
	{#if data.flagged.length}
		<ul class="flagged">
			{#each data.flagged as p (p.id)}
				<li>
					<strong>{p.companyName}</strong> ／ {p.traineeName}（{stage(p.stage)}・{daysSince(
						p.stageStartedAt
					)}日）
					{#each p.flags as f (f)}<span class="flag">⚠ {FLAG_LABEL[f]}</span>{/each}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="placeholder">注意ラベルの付いた修行はありません。</p>
	{/if}
</section>

<section>
	<h2>全社の修行一覧 <span class="count">{data.placements.length}</span></h2>
	<table>
		<thead>
			<tr
				><th>企業</th><th>修行者</th><th>段階</th><th>修行日数</th><th>次のゲート</th><th>ラベル</th
				></tr
			>
		</thead>
		<tbody>
			{#each data.placements as p (p.id)}
				<tr
					class:ended={p.stage === 'ended'}
					class:flagged={p.flags?.length && p.stage !== 'ended'}
				>
					<td>{p.companyName}</td>
					<td>{p.traineeName}<br /><small>{p.traineeUniversity}</small></td>
					<td
						>{stage(p.stage)}{#if p.stage === 'ended'}<br /><small>{p.endReason}</small>{/if}</td
					>
					<td>{daysSince(p.startedAt)}日</td>
					<td>{p.stage === 'ended' ? '—' : formatDate(p.nextGateAt)}</td>
					<td
						>{#each p.flags ?? [] as f (f)}<span class="flag">{FLAG_LABEL[f]}</span>{/each}</td
					>
				</tr>
			{/each}
		</tbody>
	</table>
</section>

<section>
	<h2>AI の直近の呼び出し</h2>
	<ul class="ai">
		{#each data.recentAi as l (l.id)}
			<li>
				<code>{l.feature}</code>
				{l.provider}
				{l.latencyMs}ms {#if l.fallback}<span class="flag">fallback</span>{/if}
				<small>{String(l.at).slice(0, 16).replace('T', ' ')}</small>
			</li>
		{:else}
			<li class="placeholder">まだありません。</li>
		{/each}
	</ul>
</section>

<style>
	section {
		margin: 20px 0;
	}
	h2 {
		font-size: 1rem;
		color: var(--accent);
		margin: 0 0 6px;
	}
	.count {
		background: var(--accent-bg);
		border-radius: 999px;
		padding: 0 10px;
		font-size: 0.85rem;
		margin-left: 6px;
	}
	.note {
		font-size: 0.85rem;
		color: var(--muted);
		margin: 0 0 8px;
	}
	.flagged {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 6px;
	}
	.flagged li {
		background: var(--warn-bg);
		border-radius: var(--radius);
		padding: 10px 14px;
		font-size: 0.95rem;
	}
	.flag {
		display: inline-block;
		margin-left: 6px;
		background: #fff;
		border-radius: 999px;
		padding: 0 8px;
		font-size: 0.8rem;
		color: #92400e;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		background: #fff;
		border: 1px solid var(--line);
		font-size: 0.9rem;
	}
	th,
	td {
		text-align: left;
		padding: 8px 10px;
		border-bottom: 1px solid var(--line);
		vertical-align: top;
	}
	th {
		background: #f3efe8;
		font-weight: 600;
		font-size: 0.8rem;
	}
	tr.ended {
		color: var(--muted);
	}
	tr.flagged td:first-child {
		border-left: 4px solid #f59e0b;
	}
	small {
		color: var(--muted);
	}
	.ai {
		list-style: none;
		padding: 0;
		margin: 0;
		font-size: 0.9rem;
	}
</style>
