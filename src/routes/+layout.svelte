<script>
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/shared/app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>つぐみ</title>
</svelte:head>

{@render children()}
