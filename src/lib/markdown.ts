/**
 * Minimal, safe Markdown renderer for tour descriptions.
 *
 * Tour descriptions are plain prose with blank-line paragraphs, strong/emphasis
 * and the occasional link. Rather than ship a full Markdown parser to the
 * browser, this small server-side helper escapes the HTML first and then adds
 * the handful of inline marks the copy actually uses.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(text: string): string {
  return text
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" rel="noopener noreferrer">$1</a>',
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\n/g, '<br />');
}

/** Renders a Markdown string to HTML for `set:html`. */
export function renderMarkdown(markdown: string): string {
  return markdown
    .trim()
    .split(/\n{2,}/)
    .map((block) => `<p>${renderInline(escapeHtml(block.trim()))}</p>`)
    .join('\n');
}
