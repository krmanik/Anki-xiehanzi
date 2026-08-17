// genanki-js imports `saveAs` from file-saver (a CommonJS browser download
// helper). The offline builder never calls Package#writeToFile — it zips the
// package itself — so this only has to exist as a named ESM export.
export function saveAs() {
	throw new Error('saveAs() is browser-only; the offline builder writes the .apkg itself');
}
export default { saveAs };
