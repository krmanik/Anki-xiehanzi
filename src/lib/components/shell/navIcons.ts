// Lucide icon per nav entry (deep imports — the barrel pulls ~1600 icons).
import type { Component } from 'svelte';
import House from '@lucide/svelte/icons/house';
import Layers from '@lucide/svelte/icons/layers';
import Grid2x2 from '@lucide/svelte/icons/grid-2x2';
import BookOpen from '@lucide/svelte/icons/book-open';
import BookOpenText from '@lucide/svelte/icons/book-open-text';
import SquarePlus from '@lucide/svelte/icons/square-plus';
import Wrench from '@lucide/svelte/icons/wrench';
import Star from '@lucide/svelte/icons/star';
import Bookmark from '@lucide/svelte/icons/bookmark';
import Gauge from '@lucide/svelte/icons/gauge';
import PencilLine from '@lucide/svelte/icons/pencil-line';
import GalleryVerticalEnd from '@lucide/svelte/icons/gallery-vertical-end';
import type { NavIcon, ToolIcon } from '$lib/nav';

export const NAV_ICONS: Record<NavIcon | ToolIcon, Component<{ class?: string }>> = {
	home: House,
	layers: Layers,
	grid: Grid2x2,
	book: BookOpen,
	plus: SquarePlus,
	wrench: Wrench,
	star: Star,
	bookmark: Bookmark,
	reader: BookOpenText,
	gauge: Gauge,
	pencil: PencilLine,
	cards: GalleryVerticalEnd
};
