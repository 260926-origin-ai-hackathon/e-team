<script>
	import { enhance } from '$app/forms';
	import { formatMan } from '$lib/shared/format.js';

	let { data, form } = $props();
	const c = $derived(data.company);
	let organizing = $state(false);
	let risking = $state(false);
</script>

<h1><small>O3</small> 自社カルテ</h1>
<p class="lead">
	話し言葉で書けば、AIがカルテの項目に整理します。整理した内容が修行者の「企業を探す」に出ます。
</p>

{#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}
{#if form?.organized}<p class="ok">
		カルテを整理しました{form.fallback ? '（AIに接続できなかったため簡易整理）' : ''}。
	</p>{/if}
{#if form?.risked}<p class="ok">
		承継リスクとロードマップを更新しました（採用された提案 {form.adopted} 件を反映）{form.fallback
			? '（AIに接続できなかったため固定文）'
			: ''}。
	</p>{/if}

<section>
	<h2>会社のことを、話すように書く</h2>
	<form
		method="POST"
		action="?/organize"
		use:enhance={() => {
			organizing = true;
			return async ({ update }) => {
				organizing = false;
				await update({ reset: false });
			};
		}}
	>
		<textarea
			name="rawNotes"
			rows="8"
			placeholder="うちは…から始めて、お客さん、職人、社長しかやっていない仕事、借入、いつまでに渡したいか"
			>{c.rawNotes ?? ''}</textarea
		>
		<button type="submit" disabled={organizing}
			>{organizing ? '整理しています…' : 'AIにカルテを整理してもらう'}</button
		>
	</form>
</section>

<section class="karte">
	<h2>整理されたカルテ（修行者に見える内容）</h2>
	<dl>
		<dt>社長の一言</dt>
		<dd>「{c.ownerWords}」</dd>
		<dt>大事にしていること</dt>
		<dd>
			<ul>
				{#each c.values ?? [] as v, i (i)}<li>{v}</li>{/each}
			</ul>
		</dd>
		<dt>現場の課題</dt>
		<dd>
			<ul>
				{#each c.fieldIssues ?? [] as v, i (i)}<li>{v}</li>{/each}
			</ul>
		</dd>
		<dt>お客さん</dt>
		<dd>{c.customers}</dd>
		<dt>社長しかできない仕事</dt>
		<dd>
			<ul>
				{#each c.ownerOnlyWork ?? [] as v, i (i)}<li>{v}</li>{/each}
			</ul>
		</dd>
		<dt>後継者に求めること</dt>
		<dd>
			<ul>
				{#each c.successorRequirements ?? [] as v, i (i)}<li>{v}</li>{/each}
			</ul>
		</dd>
		<dt>企業カードの3行</dt>
		<dd>
			<ul>
				{#each c.fieldSummary3 ?? [] as v, i (i)}<li>{v}</li>{/each}
			</ul>
		</dd>
		<dt>数字</dt>
		<dd>
			年商{formatMan(c.revenue)} ／ 営業利益{formatMan(c.operatingProfit)} ／ 従業員{c.employees}名
			／ 借入{c.hasDebt ? 'あり' : 'なし'}
		</dd>
	</dl>
</section>

<section>
	<h2>承継リスク 上位3つ</h2>
	{#if c.risks?.length}
		<ol class="risks">
			{#each c.risks as r, i (i)}
				<li>
					<strong>{r.title}</strong>
					<p class="why">{r.why}</p>
					<p class="action">→ {r.action}</p>
				</li>
			{/each}
		</ol>
	{:else}
		<p class="placeholder">まだありません。</p>
	{/if}

	<h2>3年ロードマップ</h2>
	{#if c.roadmap?.length}
		<div class="roadmap">
			{#each c.roadmap as y (y.year)}
				<div class="year">
					<h3>{y.year}年目 <small>{y.theme}</small></h3>
					<ul>
						{#each y.items as it, i (i)}<li>{it}</li>{/each}
					</ul>
				</div>
			{/each}
		</div>
	{:else}
		<p class="placeholder">まだありません。</p>
	{/if}
	<form
		method="POST"
		action="?/risks"
		use:enhance={() => {
			risking = true;
			return async ({ update }) => {
				risking = false;
				await update({ reset: false });
			};
		}}
	>
		<button type="submit" class="secondary" disabled={risking}
			>{risking ? '日報と提案を読んでいます…' : '修行者の提案を反映して更新する'}</button
		>
	</form>
</section>

<style>
	.lead {
		color: var(--muted);
		margin-top: 0;
		font-size: 0.95rem;
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
	h2 + .placeholder,
	.risks + h2 {
		margin-top: 16px;
	}
	textarea {
		width: 100%;
		font: inherit;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 12px;
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
		margin-top: 10px;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.6;
	}
	button.secondary {
		background: #fff;
		color: var(--accent);
		border: 2px solid var(--accent);
	}
	dl {
		margin: 0;
		display: grid;
		gap: 6px;
	}
	dt {
		font-size: 0.8rem;
		color: var(--muted);
		margin-top: 6px;
	}
	dd {
		margin: 0;
	}
	dd ul {
		margin: 0;
		padding-left: 1.2em;
	}
	.risks {
		padding-left: 1.4em;
		display: grid;
		gap: 10px;
	}
	.risks p {
		margin: 2px 0;
		font-size: 0.95rem;
	}
	.why {
		color: var(--muted);
	}
	.action {
		color: var(--accent);
	}
	.roadmap {
		display: grid;
		gap: 10px;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	}
	.year {
		background: var(--accent-bg);
		border-radius: var(--radius);
		padding: 12px 14px;
	}
	.year h3 {
		margin: 0 0 4px;
		font-size: 1rem;
	}
	.year small {
		font-weight: normal;
		color: var(--muted);
	}
	.year ul {
		margin: 0;
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
