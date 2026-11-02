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

function renderBlock(block: string): string {
  // `## ` and `### ` only: the page itself owns the `<h1>`.
  const heading = /^(#{2,3}) +(.+)$/.exec(block);
  if (heading && !block.includes('\n')) {
    const level = heading[1]!.length;
    return `<h${level}>${renderInline(escapeHtml(heading[2]!.trim()))}</h${level}>`;
  }

  const lines = block.split('\n');
  if (lines.every((line) => /^[-*] +\S/.test(line))) {
    const items = lines.map(
      (line) => `<li>${renderInline(escapeHtml(line.replace(/^[-*] +/, '').trim()))}</li>`,
    );
    return `<ul>${items.join('')}</ul>`;
  }

  return `<p>${renderInline(escapeHtml(block))}</p>`;
}

/**
 * Renders a Markdown string to HTML for `set:html`: paragraphs, `##`/`###`
 * headings, `-` lists, links, bold and italics. Blocks are separated by a
 * blank line.
 */
export function renderMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map(renderBlock)
    .join('\n');
}
