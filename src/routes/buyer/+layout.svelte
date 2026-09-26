<script>
	import AreaTabs from '$lib/shared/AreaTabs.svelte';

	let { data, children } = $props();
</script>

<AreaTabs area="buyer" user={data.user} />
<main>
	{@render children()}
</main>
