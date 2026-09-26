<script>
	import AreaTabs from '$lib/shared/AreaTabs.svelte';

	let { data, children } = $props();
</script>

<AreaTabs area="seller" user={data.user} />
<main class="seller">
	{@render children()}
</main>

<style>
	/* 70代の社長を想定: 文字を大きく、行間を広く */
	.seller {
		font-size: 20px;
		line-height: 1.7;
	}
</style>
