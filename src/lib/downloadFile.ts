/**
 * Hands a text made in the browser to the browser as a file (the menu's calendar). The address is freed
 * after a delay: Safari cancels a download whose address is freed at once.
 */
const FREE_AFTER_MS = 30_000;

export function downloadTextFile(fileName: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  // Firefox follows only a link that is in the document.
  document.body.appendChild(link);
  try { link.click(); } finally { link.remove(); }
  window.setTimeout(() => URL.revokeObjectURL(url), FREE_AFTER_MS);
}
