<script>
	import AreaTabs from '$lib/shared/AreaTabs.svelte';

	let { data, children } = $props();
</script>

<AreaTabs area="admin" user={data.user} />
<main>
	{@render children()}
</main>
