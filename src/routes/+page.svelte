<script>
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { demoLogin } from '$lib/shared/login.js';
	import { ROLE_LABEL } from '$lib/shared/roles.js';

	let { data } = $props();

	/** @type {{ role: import('$lib/shared/roles.js').Role, label: string, note: string }[]} */
	const roles = [
		{ role: 'buyer', label: '修行者として入る', note: '企業を探し、修行の日報を出す' },
		{ role: 'seller', label: '社長として入る', note: '候補者を見極め、自社カルテを整える' },
		{ role: 'admin', label: '運営として入る', note: '全社の修行と注意ラベルを見る' }
	];

	/** @type {string | null} */
	let busy = $state(null);
	/** @type {string | null} */
	let message = $state(null);

	/** @param {import('$lib/shared/roles.js').Role} role */
	async function enter(role) {
		busy = role;
		message = null;
		try {
			const { home } = await demoLogin(role);
			const next = data.next && data.next.startsWith('/') ? data.next : home;
			await goto(resolve(/** @type {any} */ (next)), { invalidateAll: true });
		} catch (e) {
			message = `ログインできませんでした: ${e instanceof Error ? e.message : String(e)}`;
		} finally {
			busy = null;
		}
	}
</script>

<main class="top">
	<h1>つぐみ</h1>
	<p class="lead">
		修行を通して会社を継ぐ。<br />
		6か月・3段階の修行で、社長が「この人に任せられるか」を見極めます。
	</p>

	{#if data.user}
		<p class="note">
			いま {ROLE_LABEL[data.user.role]} としてログイン中です。別のロールで入ると切り替わります。
		</p>
	{/if}

	{#if data.demoMode}
		<ul class="roles">
			{#each roles as r (r.role)}
				<li>
					<button type="button" onclick={() => enter(r.role)} disabled={busy !== null}>
						<strong>{busy === r.role ? '入っています…' : r.label}</strong>
						<span>{r.note}</span>
					</button>
				</li>
			{/each}
		</ul>
		<p class="sub">
			<button type="button" class="link" onclick={() => enter('operator')} disabled={busy !== null}>
				運営（一般スタッフ）として入る
			</button>
		</p>
	{:else}
		<p class="placeholder">デモログインは無効です（DEMO_MODE が true ではありません）。</p>
	{/if}

	{#if message}
		<p class="error" role="alert">{message}</p>
	{/if}
</main>

<style>
	.top {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	h1 {
		font-size: 2.4rem;
		margin: 0 0 8px;
	}
	.lead {
		color: var(--muted);
		margin: 0 0 32px;
	}
	.note {
		background: var(--accent-bg);
		border-radius: var(--radius);
		padding: 12px 16px;
		font-size: 0.95rem;
	}
	.roles {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 16px;
	}
	.roles button {
		width: 100%;
		display: grid;
		gap: 4px;
		padding: 24px;
		border-radius: var(--radius);
		background: #fff;
		border: 1px solid var(--line);
		text-align: left;
		font: inherit;
		color: var(--fg);
		cursor: pointer;
	}
	.roles button:hover:not(:disabled) {
		border-color: var(--accent);
		background: var(--accent-bg);
	}
	.roles button:disabled {
		opacity: 0.6;
		cursor: wait;
	}
	.roles strong {
		font-size: 1.3rem;
	}
	.roles span {
		color: var(--muted);
		font-size: 0.95rem;
	}
	.sub {
		text-align: right;
		margin-top: 12px;
	}
	.link {
		background: none;
		border: none;
		color: var(--muted);
		font: inherit;
		font-size: 0.9rem;
		text-decoration: underline;
		cursor: pointer;
	}
	.error {
		color: #b91c1c;
		background: #fef2f2;
		border-radius: var(--radius);
		padding: 12px 16px;
	}
</style>
