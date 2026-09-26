<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { REWARD, STAGE_LABEL } from '$lib/types.js';
	import { formatMan } from '$lib/shared/format.js';

	let { data, form } = $props();
	const c = $derived(data.company);
	let submitting = $state(false);
</script>

<p class="back"><a href={resolve('/buyer')}>← 企業を探す</a></p>
<h1><small>S2</small> {c.name}</h1>
<p class="meta">{c.region} ／ {c.industry}</p>

<section>
	<h2>社長の言葉</h2>
	<blockquote>「{c.ownerWords}」</blockquote>
</section>

<section>
	<h2>大事にしていること</h2>
	<ul>
		{#each c.values as v, i (i)}<li>{v}</li>{/each}
	</ul>
</section>

<section>
	<h2>現場の課題</h2>
	<ul>
		{#each c.fieldIssues as v, i (i)}<li>{v}</li>{/each}
	</ul>
</section>

<section>
	<h2>数字</h2>
	<dl class="numbers">
		<div>
			<dt>年商</dt>
			<dd>{formatMan(c.revenue)}</dd>
		</div>
		<div>
			<dt>営業利益</dt>
			<dd>{formatMan(c.operatingProfit)}</dd>
		</div>
		<div>
			<dt>従業員</dt>
			<dd>{c.employees}名</dd>
		</div>
		<div>
			<dt>借入</dt>
			<dd>{c.hasDebt ? 'あり' : 'なし'}</dd>
		</div>
	</dl>
	<p class="small">主な取引先: {c.majorClients.join('、')}</p>
	<p class="small">お客さん: {c.customers}</p>
</section>

<section>
	<h2>修行で任されること</h2>
	<table class="stages">
		<tbody>
			{#each c.stageWork as w (w.stage)}
				<tr>
					<th>段階{w.stage}<br /><small>{STAGE_LABEL[w.stage]}</small></th>
					<td>{w.text}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</section>

<section>
	<h2>報酬</h2>
	<ul class="reward">
		<li>段階1・2: {REWARD[1]}</li>
		<li>段階3: {REWARD[3]}</li>
	</ul>
</section>

<section class="apply">
	{#if data.applied || form?.applied}
		<p class="done">
			この会社で修行中です。<a href={resolve('/buyer/training')}>修行ダッシュボードへ</a>
		</p>
	{:else if data.busyElsewhere}
		<p class="note">別の会社で修行中のため応募できません。</p>
	{:else if data.remainingSlots <= 0}
		<p class="note">候補者枠が埋まっています（最大{c.slots}名）。</p>
	{:else}
		<form
			method="POST"
			action="?/apply"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					submitting = false;
					await update();
				};
			}}
		>
			<button type="submit" disabled={submitting}
				>{submitting ? '応募しています…' : '修行に応募する'}</button
			>
			<p class="small">
				候補者枠 残り{data.remainingSlots}/{c.slots}。応募後、社長との面談を経て段階1（従業員）から始まります。
			</p>
		</form>
	{/if}
	{#if form?.message}
		<p class="error" role="alert">{form.message}</p>
	{/if}
</section>

<style>
	.back {
		margin: 0 0 8px;
		font-size: 0.9rem;
	}
	.meta {
		color: var(--muted);
		margin-top: 0;
	}
	section {
		margin: 24px 0;
	}
	h2 {
		font-size: 1rem;
		color: var(--accent);
		margin: 0 0 8px;
	}
	blockquote {
		margin: 0;
		font-size: 1.3rem;
		font-weight: 600;
		line-height: 1.5;
	}
	ul {
		margin: 0;
		padding-left: 1.2em;
	}
	.numbers {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 8px;
		margin: 0 0 8px;
	}
	.numbers div {
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 8px 12px;
	}
	dt {
		font-size: 0.8rem;
		color: var(--muted);
	}
	dd {
		margin: 0;
		font-weight: 600;
	}
	.small {
		font-size: 0.85rem;
		color: var(--muted);
		margin: 4px 0;
	}
	.stages {
		width: 100%;
		border-collapse: collapse;
		background: #fff;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		overflow: hidden;
	}
	.stages th {
		width: 5.5em;
		text-align: left;
		padding: 10px;
		background: var(--accent-bg);
		color: var(--accent);
		font-size: 0.9rem;
		vertical-align: top;
	}
	.stages th small {
		font-weight: normal;
		color: var(--muted);
	}
	.stages td {
		padding: 10px;
		border-bottom: 1px solid var(--line);
		font-size: 0.95rem;
	}
	.reward {
		list-style: none;
		padding: 0;
	}
	.apply button {
		width: 100%;
		font: inherit;
		font-size: 1.15rem;
		font-weight: 600;
		background: var(--accent);
		color: #fff;
		border: none;
		border-radius: var(--radius);
		padding: 16px;
		cursor: pointer;
	}
	.apply button:disabled {
		opacity: 0.6;
	}
	.done {
		background: var(--accent-bg);
		border-radius: var(--radius);
		padding: 12px 16px;
	}
	.note {
		background: #f3f4f6;
		border-radius: var(--radius);
		padding: 12px 16px;
		color: var(--muted);
	}
	.error {
		color: #b91c1c;
	}
</style>
