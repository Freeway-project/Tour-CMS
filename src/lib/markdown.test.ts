import { describe, expect, it } from 'vitest';

import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders paragraphs with inline marks and escapes HTML', () => {
    expect(renderMarkdown('Hello **there** <b>x</b>\n\nSecond *line*')).toBe(
      '<p>Hello <strong>there</strong> &lt;b&gt;x&lt;/b&gt;</p>\n<p>Second <em>line</em></p>',
    );
  });

  it('renders ## and ### headings but never an h1', () => {
    expect(renderMarkdown('## Refunds\n\n### Weather')).toBe('<h2>Refunds</h2>\n<h3>Weather</h3>');
    expect(renderMarkdown('# Title')).toBe('<p># Title</p>');
  });

  it('renders a block of dash lines as a list', () => {
    expect(renderMarkdown('- One\n- **Two**')).toBe('<ul><li>One</li><li><strong>Two</strong></li></ul>');
  });

  it('keeps a mixed block as a paragraph', () => {
    expect(renderMarkdown('Intro\n- not a list')).toBe('<p>Intro<br />- not a list</p>');
  });

  it('only links http(s) URLs', () => {
    expect(renderMarkdown('[a](https://x.ca) [b](javascript:alert(1))')).toBe(
      '<p><a href="https://x.ca" rel="noopener noreferrer">a</a> [b](javascript:alert(1))</p>',
    );
  });

  it('handles Windows line endings', () => {
    expect(renderMarkdown('One\r\n\r\nTwo')).toBe('<p>One</p>\n<p>Two</p>');
  });
});
