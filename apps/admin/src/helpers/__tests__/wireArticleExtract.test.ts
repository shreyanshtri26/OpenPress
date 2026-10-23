// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { extractBlocksFromDoc } from '../wireArticleExtract';

const doc = (html: string) => new DOMParser().parseFromString(html, 'text/html');
const long = 'This is a full sentence about the story that runs for a while. '.repeat(4);

describe('extractBlocksFromDoc', () => {
  it('reads a known body container and skips boilerplate lines', () => {
    const blocks = extractBlocksFromDoc(doc(`<article><div class="articlebody"><p>AI Narration</p><p>${long}</p><p>${long}</p></div></article>`));
    expect(blocks).toHaveLength(2);
    expect(blocks[0].data.text).toContain('full sentence');
  });

  it('falls back to schema.org JSON-LD when the markup is unfamiliar', () => {
    const body = `${long}\n${long}\n${long}`;
    const blocks = extractBlocksFromDoc(doc(`<script type="application/ld+json">${JSON.stringify({ '@type': 'NewsArticle', articleBody: body })}</script><div class="x">menu</div>`));
    expect(blocks).toHaveLength(3);
  });

  it('finds the paragraph-heavy element when nothing else matches', () => {
    const blocks = extractBlocksFromDoc(doc(`<div><nav><p>Home</p></nav><div class="weird">${`<p>${long}</p>`.repeat(3)}</div></div>`));
    expect(blocks.length).toBe(3);
  });

  it('splits double line breaks inside one paragraph and uses the meta description as a last resort', () => {
    expect(extractBlocksFromDoc(doc(`<article><p>${long}<br><br>${long}</p></article>`))).toHaveLength(2);
    expect(extractBlocksFromDoc(doc('<meta property="og:description" content="Only a summary"><div></div>'))[0].data.text).toBe('Only a summary');
    expect(extractBlocksFromDoc(doc('<div></div>'))).toEqual([]);
  });
});
