<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
</script>

<main>
	<h1>{page.status}</h1>
	<p class="placeholder">{page.error?.message ?? 'エラーが起きました'}</p>
	<p><a href={resolve('/')}>ロール選択へ戻る</a></p>
</main>
