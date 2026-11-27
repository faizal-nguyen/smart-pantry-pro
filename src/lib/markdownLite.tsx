import type { ReactNode } from 'react';

/**
 * V11-06 E7: renders the subset of Markdown the privacy policy is written in, as React elements.
 *
 * Headings (# to ###), paragraphs, lists (-), tables (|), **bold**, *italic*, `code` and links.
 * Every piece of text goes through React, which escapes it: HTML in the source stays text. A link
 * becomes a link only to https:, mailto: or an internal path; anything else shows as its text.
 */
type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] };

const HEADING = /^(#{1,3})\s+(.+)$/;
const LIST_ITEM = /^[-*]\s+(.+)$/;
const TABLE_SEPARATOR = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/;
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g;
// An internal path may not start with // or /\ : browsers read both as another site.
const SAFE_HREF = /^(https:\/\/|mailto:|\/(?![/\\])|#)/i;

function cells(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
}

function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) { index += 1; continue; }
    const heading = HEADING.exec(trimmed);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() });
      index += 1;
      continue;
    }
    if (trimmed.startsWith('|')) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        if (!TABLE_SEPARATOR.test(lines[index].trim())) rows.push(cells(lines[index]));
        index += 1;
      }
      blocks.push({ kind: 'table', header: rows[0] ?? [], rows: rows.slice(1) });
      continue;
    }
    if (LIST_ITEM.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim()) {
        // A heading or a table right after a list ends it, blank line or not.
        if (HEADING.test(lines[index].trim()) || lines[index].trim().startsWith('|')) break;
        const item = LIST_ITEM.exec(lines[index].trim());
        if (item) items.push(item[1].trim());
        else if (items.length) items[items.length - 1] += ' ' + lines[index].trim();
        index += 1;
      }
      blocks.push({ kind: 'list', items });
      continue;
    }
    const text: string[] = [];
    while (index < lines.length) {
      const current = lines[index].trim();
      if (!current || HEADING.test(current) || current.startsWith('|') || LIST_ITEM.test(current)) break;
      text.push(current.replace(/^>\s?/, ''));
      index += 1;
    }
    blocks.push({ kind: 'paragraph', text: text.join(' ') });
  }
  return blocks;
}

/** A stable anchor from a heading's text: « 2.1 Votre compte » gives « 2-1-votre-compte ». */
function anchor(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((part, key) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={key} className="rounded bg-muted px-1 font-mono text-[0.85em]">{part.slice(1, -1)}</code>;
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      if (!SAFE_HREF.test(href)) return label;
      const external = /^https:/i.test(href);
      if (!external) return <a key={key} href={href} className="underline underline-offset-4">{label}</a>;
      return <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
        {label}<span className="sr-only"> (nouvel onglet)</span>
      </a>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    return part;
  });
}

const HEADING_CLASS = {
  1: 'text-3xl font-semibold tracking-tight',
  2: 'mt-10 text-xl font-semibold',
  3: 'mt-6 text-base font-semibold',
} as const;

/** `label`: the heading above a table, which names its scrolling region. */
function renderBlock(block: Block, key: number, label?: string): ReactNode {
  switch (block.kind) {
    case 'heading': {
      const Tag = `h${block.level}` as const;
      return <Tag key={key} id={anchor(block.text)} className={HEADING_CLASS[block.level]}>{renderInline(block.text)}</Tag>;
    }
    case 'paragraph':
      return <p key={key} className="text-sm leading-6">{renderInline(block.text)}</p>;
    case 'list':
      return <ul key={key} className="list-disc space-y-1 pl-5 text-sm leading-6">
        {block.items.map((item, index) => <li key={index}>{renderInline(item)}</li>)}
      </ul>;
    case 'table':
      // Focusable and named: a table wider than the screen can be scrolled from the keyboard.
      return <div key={key} role="region" tabIndex={0} aria-labelledby={label}
        className="overflow-x-auto rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <table className="w-full border-collapse text-left text-sm">
          <thead><tr>{block.header.map((cell, index) => <th key={index} scope="col" className="border px-3 py-2 align-top font-semibold">{renderInline(cell)}</th>)}</tr></thead>
          <tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>
            {row.map((cell, index) => <td key={index} className="border px-3 py-2 align-top">{renderInline(cell)}</td>)}
          </tr>)}</tbody>
        </table>
      </div>;
  }
}

export function MarkdownLite({ source }: { source: string }) {
  let heading: string | undefined;
  return <>{parseMarkdown(source).map((block, key) => {
    if (block.kind === 'heading') heading = anchor(block.text);
    return renderBlock(block, key, heading);
  })}</>;
}
