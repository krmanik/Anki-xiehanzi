<script lang="ts">
	// A CSS-length input: a number box plus a unit selector (px by default). Emits
	// the combined string (e.g. "16px", "1.5em") or undefined when the number is
	// cleared. Used for spacing and custom font sizes in the Card Designer.
	let {
		value = '',
		onchange,
		units = ['px', 'em', 'rem', '%'],
		placeholder = ''
	}: {
		value?: string;
		onchange?: (v: string | undefined) => void;
		units?: string[];
		placeholder?: string;
	} = $props();

	function parse(v: string): { num: string; unit: string } {
		const m = (v ?? '').trim().match(/^(-?\d*\.?\d+)\s*([a-z%]+)?$/i);
		if (!m) return { num: '', unit: units[0] ?? 'px' };
		return { num: m[1], unit: m[2] || units[0] || 'px' };
	}

	const parsed = $derived(parse(value));

	function emit(num: string, unit: string) {
		const n = num.trim();
		onchange?.(n === '' ? undefined : `${n}${unit}`);
	}
</script>

<div class="flex gap-1">
	<input
		type="number"
		value={parsed.num}
		{placeholder}
		oninput={(e) => emit((e.target as HTMLInputElement).value, parsed.unit)}
		class="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs"
	/>
	<select
		value={parsed.unit}
		onchange={(e) => emit(parsed.num, (e.target as HTMLSelectElement).value)}
		class="shrink-0 rounded-lg border border-neutral-200 py-1.5 pl-2 pr-6 text-xs"
		aria-label="unit"
	>
		{#each units as u (u)}<option value={u}>{u}</option>{/each}
	</select>
</div>
