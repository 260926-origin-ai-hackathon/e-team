<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { PERSPECTIVES, STAGE_LABEL } from '$lib/types.js';
	import { daysSince, formatDate } from '$lib/shared/format.js';
	import { FLAG_LABEL } from '$lib/shared/flags.js';

	let { data, form } = $props();
	const p = $derived(data.placement);

	/** 日報と提案を日付順（新しい順）に並べたタイムライン */
	const timeline = $derived(
		[
			...data.reports.map((r) => ({
				kind: /** @type {const} */ ('report'),
				date: r.date,
				key: `r-${r.id}`,
				report: r,
				proposal: null
			})),
			...data.proposals.map((q) => ({
				kind: /** @type {const} */ ('proposal'),
				date: q.date,
				key: `q-${q.id}`,
				report: null,
				proposal: q
			}))
		].sort((a, b) => b.date.localeCompare(a.date) || (a.kind === 'proposal' ? -1 : 1))
	);

	let assessing = $state(false);
	let gateDecision = $state('');
	let agreement = $state(false);
	const needsAgreement = $derived(p.stage === 1 && !p.agreementSigned);
	const nextLabel = $derived(
		p.stage === 3
			? '修行を終えて承継へ'
			: p.stage === 'ended'
				? ''
				: `段階${Number(p.stage) + 1}（${STAGE_LABEL[/** @type {1|2|3} */ (Number(p.stage) + 1)]}）へ`
	);
	const labelOf = (/** @type {string} */ id) => PERSPECTIVES.find((x) => x.id === id)?.label ?? id;
	const reactionLabel = (/** @type {'adopted'|'hold'|null} */ r) =>
		r === 'adopted' ? '採用' : r === 'hold' ? '保留' : '未回答';
</script>

<p class="back"><a href={resolve('/seller')}>← 候補者ボード</a></p>
<h1><small>O2</small> {p.traineeName} <span class="uni">{p.traineeUniversity}</span></h1>
<p class="meta">
	{#if p.stage === 'ended'}
		修行は終了（{p.endReason === 'succeeded'
			? '承継へ'
			: p.endReason === 'rejected'
				? '社長判断で終了'
				: '本人辞退'}）
	{:else}
		段階{p.stage}（{STAGE_LABEL[p.stage]}）・修行 {daysSince(p.startedAt)}日目・次のゲート
		<strong>{formatDate(p.nextGateAt)}</strong>
		{#if p.agreementSigned}・合意書 済{/if}
	{/if}
	{#if p.flags?.length && p.stage !== 'ended'}
		<span class="flags"
			>{#each p.flags as f (f)}<span>⚠ {FLAG_LABEL[f]}</span>{/each}</span
		>
	{/if}
</p>

{#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}
{#if form?.decided}<p class="ok">
		判定を記録しました（{form.decided === 'next'
			? '次の段階へ'
			: form.decided === 'extend'
				? 'もう1ヶ月'
				: 'ここまで'}）。
	</p>{/if}

<div class="grid">
	<section class="assess">
		<h2>AI 見極めレポート</h2>
		{#if data.assessment}
			<p class="gen">
				{formatDate(data.assessment.generatedAt.slice(0, 10))} 時点の日報から。点数はありません。決めるのは社長です。
			</p>
			<ul class="items">
				{#each data.assessment.items as item (item.id)}
					<li>
						<h3>{labelOf(item.id)}</h3>
						<p>{item.finding}</p>
						<p class="evidence">
							根拠:
							{#each item.evidenceDates as d (d)}
								<a href="#report-{d}">{formatDate(d)}</a>
							{/each}
						</p>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="placeholder">まだレポートがありません。</p>
		{/if}
		<form
			method="POST"
			action="?/assess"
			use:enhance={() => {
				assessing = true;
				return async ({ update }) => {
					assessing = false;
					await update();
				};
			}}
		>
			<button type="submit" class="secondary" disabled={assessing}
				>{assessing ? '日報を読んでいます…' : '最新の日報でレポートを更新する'}</button
			>
		</form>
	</section>

	<section class="gate">
		<h2>ゲート判定</h2>
		{#if p.stage === 'ended'}
			<p class="placeholder">終了しています。</p>
		{:else}
			<form method="POST" action="?/gate" use:enhance>
				<div class="choices">
					<label class:on={gateDecision === 'next'}
						><input type="radio" name="decision" value="next" bind:group={gateDecision} />
						次の段階へ<small>{nextLabel}</small></label
					>
					<label class:on={gateDecision === 'extend'}
						><input type="radio" name="decision" value="extend" bind:group={gateDecision} />
						もう1ヶ月<small>ゲートを1か月延ばす</small></label
					>
					<label class:on={gateDecision === 'stop'}
						><input type="radio" name="decision" value="stop" bind:group={gateDecision} />
						ここまで<small>修行を終了する</small></label
					>
				</div>
				{#if gateDecision === 'next' && needsAgreement}
					<label class="agree"
						><input type="checkbox" name="agreement" bind:checked={agreement} /> 「承継を前提とした合意書」を本人と交わした（段階2へ進めるには必須）</label
					>
				{/if}
				<textarea name="comment" rows="3" placeholder="なぜそう決めたか（本人には見せません）"
				></textarea>
				<button
					type="submit"
					disabled={!gateDecision || (gateDecision === 'next' && needsAgreement && !agreement)}
					>この判定で記録する</button
				>
			</form>
		{/if}

		<h2 class="mt">今月のミッション</h2>
		<ul class="missions">
			{#each data.missions as m (m.id)}
				<li class:done={m.done}>
					<form method="POST" action="?/missionDone" use:enhance>
						<input type="hidden" name="missionId" value={m.id} />
						<input type="hidden" name="done" value={String(!m.done)} />
						<button type="submit" class="check" aria-label={m.done ? '未完了に戻す' : '完了にする'}
							>{m.done ? '✓' : ''}</button
						>
					</form>
					<span>{m.text}</span>
				</li>
			{/each}
		</ul>
		{#if data.missions.length < 3 && p.stage !== 'ended'}
			<form method="POST" action="?/mission" use:enhance class="addm">
				<input name="text" placeholder="今月やってほしいこと（最大3つ）" required />
				<button type="submit" class="secondary">追加</button>
			</form>
		{/if}
	</section>
</div>

<section>
	<h2>日報と提案</h2>
	<ol class="timeline">
		{#each timeline as t (t.key)}
			{#if t.kind === 'report' && t.report}
				<li id="report-{t.report.date}" class="report">
					<div class="date">{formatDate(t.report.date)} 日報</div>
					<p>{t.report.body}</p>
				</li>
			{:else if t.proposal}
				<li class="proposal">
					<div class="date">
						{formatDate(t.proposal.date)} 提案
						<span
							class="badge"
							class:adopted={t.proposal.ownerReaction === 'adopted'}
							class:hold={t.proposal.ownerReaction === 'hold'}
							>{reactionLabel(t.proposal.ownerReaction)}</span
						>
					</div>
					<p>{t.proposal.content}</p>
					<form method="POST" action="?/react" use:enhance class="react">
						<input type="hidden" name="proposalId" value={t.proposal.id} />
						<button
							type="submit"
							name="reaction"
							value="adopted"
							class:active={t.proposal.ownerReaction === 'adopted'}>採用</button
						>
						<button
							type="submit"
							name="reaction"
							value="hold"
							class:active={t.proposal.ownerReaction === 'hold'}>保留</button
						>
					</form>
				</li>
			{/if}
		{/each}
	</ol>
	{#if data.gates.length}
		<h2>これまでのゲート</h2>
		<ul class="gates">
			{#each data.gates as g (g.id)}
				<li>
					<strong
						>{formatDate(g.at.slice(0, 10))} 段階{g.stage} → {g.decision === 'next'
							? '次へ'
							: g.decision === 'extend'
								? 'もう1ヶ月'
								: 'ここまで'}</strong
					>{#if g.ownerComment}<br />{g.ownerComment}{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.back {
		margin: 0 0 4px;
		font-size: 0.85rem;
	}
	h1 .uni {
		font-size: 0.8rem;
		color: var(--muted);
		font-weight: normal;
		margin-left: 8px;
	}
	.meta {
		margin: -6px 0 16px;
		color: var(--muted);
		font-size: 0.95rem;
	}
	.flags span {
		display: inline-block;
		margin-left: 6px;
		background: var(--warn-bg);
		color: #92400e;
		border-radius: 999px;
		padding: 0 10px;
		font-size: 0.85rem;
	}
	.grid {
		display: grid;
		gap: 16px;
		grid-template-columns: 1fr;
	}
	@media (min-width: 900px) {
		.grid {
			grid-template-columns: 3fr 2fr;
		}
	}
	section {
		background: #fff;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 16px 18px;
		margin-bottom: 16px;
	}
	h2 {
		font-size: 1.05rem;
		color: var(--accent);
		margin: 0 0 8px;
	}
	h2.mt {
		margin-top: 24px;
	}
	.gen {
		font-size: 0.85rem;
		color: var(--muted);
		margin: 0 0 8px;
	}
	.items {
		list-style: none;
		margin: 0 0 12px;
		padding: 0;
		display: grid;
		gap: 10px;
	}
	.items li {
		border-left: 4px solid var(--accent-bg);
		padding-left: 12px;
	}
	.items h3 {
		margin: 0;
		font-size: 0.95rem;
	}
	.items p {
		margin: 2px 0;
	}
	.evidence {
		font-size: 0.85rem;
		color: var(--muted);
	}
	.evidence a {
		margin-right: 6px;
	}
	.choices {
		display: grid;
		gap: 8px;
	}
	.choices label {
		display: block;
		border: 2px solid var(--line);
		border-radius: var(--radius);
		padding: 12px 14px;
		cursor: pointer;
		font-weight: 600;
	}
	.choices label.on {
		border-color: var(--accent);
		background: var(--accent-bg);
	}
	.choices small {
		display: block;
		font-weight: normal;
		color: var(--muted);
		font-size: 0.85rem;
		margin-left: 1.6em;
	}
	.agree {
		display: block;
		margin: 10px 0;
		background: var(--warn-bg);
		border-radius: 8px;
		padding: 10px 12px;
		font-size: 0.95rem;
	}
	textarea,
	.addm input {
		width: 100%;
		font: inherit;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 10px;
		margin: 10px 0;
	}
	button {
		font: inherit;
		font-size: 1.05rem;
		font-weight: 600;
		background: var(--accent);
		color: #fff;
		border: none;
		border-radius: var(--radius);
		padding: 14px;
		width: 100%;
		cursor: pointer;
	}
	button:disabled {
		background: #d1d5db;
		cursor: default;
	}
	button.secondary {
		background: #fff;
		color: var(--accent);
		border: 2px solid var(--accent);
	}
	.missions {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 6px;
	}
	.missions li {
		display: flex;
		gap: 10px;
		align-items: center;
	}
	.missions li.done span {
		color: var(--muted);
		text-decoration: line-through;
	}
	.check {
		width: 1.8em;
		height: 1.8em;
		padding: 0;
		border-radius: 50%;
		background: #fff;
		color: var(--accent);
		border: 2px solid var(--line);
	}
	.done .check {
		background: var(--accent-bg);
		border-color: var(--accent);
	}
	.addm {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.addm button {
		width: auto;
		padding: 10px 16px;
	}
	.timeline {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 10px;
	}
	.timeline li {
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 12px 14px;
	}
	.timeline li.proposal {
		background: var(--accent-bg);
	}
	.timeline li:target {
		outline: 3px solid var(--accent);
	}
	.timeline p {
		margin: 4px 0 0;
		white-space: pre-wrap;
	}
	.date {
		font-size: 0.85rem;
		color: var(--muted);
	}
	.badge {
		margin-left: 6px;
		border-radius: 999px;
		padding: 0 10px;
		background: #f3f4f6;
	}
	.badge.adopted {
		background: #dcfce7;
		color: #166534;
	}
	.badge.hold {
		background: var(--warn-bg);
		color: #92400e;
	}
	.react {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}
	.react button {
		width: auto;
		padding: 8px 18px;
		font-size: 0.95rem;
		background: #fff;
		color: var(--fg);
		border: 2px solid var(--line);
	}
	.react button.active {
		border-color: var(--accent);
		background: var(--accent);
		color: #fff;
	}
	.gates {
		padding-left: 1.2em;
		font-size: 0.95rem;
	}
	.error {
		color: #b91c1c;
		background: #fef2f2;
		border-radius: var(--radius);
		padding: 10px 14px;
	}
	.ok {
		background: #dcfce7;
		color: #166534;
		border-radius: var(--radius);
		padding: 10px 14px;
	}
</style>
