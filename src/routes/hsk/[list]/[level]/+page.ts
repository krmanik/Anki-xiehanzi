/**
 * The static adapter cannot crawl these links (the app is client-rendered), so
 * the prerenderable routes are listed explicitly. Keep in sync with the level
 * lists in `scripts/build-hsk-data.mjs`.
 */
const LISTS: Record<string, string[]> = {
	old: ['1', '2', '3', '4', '5', '6'],
	new: ['1', '2', '3', '4', '5', '6', '7-9']
};

export function entries() {
	return Object.entries(LISTS).flatMap(([list, levels]) =>
		levels.map((level) => ({ list, level }))
	);
}
