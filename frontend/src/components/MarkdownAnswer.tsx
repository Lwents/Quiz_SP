import React from 'react';
import katex from 'katex';

type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: number; text: string }
  | { type: 'list'; ordered: boolean; items: Array<{ level: number; text: string }> }
  | { type: 'code'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'rule' };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let index = 0;

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim();
    if (text) blocks.push({ type: 'paragraph', text });
    paragraph = [];
  };

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      flushParagraph();
      index += 1;
      continue;
    }

    const codeStart = line.match(/^\s*```/);
    if (codeStart) {
      flushParagraph();
      index += 1;
      const code: string[] = [];
      while (index < lines.length && !/^\s*```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }

    if (/^\s*(?:[-*_]\s*){3,}$/.test(line)) {
      flushParagraph();
      blocks.push({ type: 'rule' });
      index += 1;
      continue;
    }

    const listItem = line.match(/^(\s*)(?:([-+*])\s+|(\d+)[.)]\s+)(.+)$/);
    if (listItem) {
      flushParagraph();
      const ordered = Boolean(listItem[3]);
      const items: Array<{ level: number; text: string }> = [];
      while (index < lines.length) {
        const item = lines[index].match(/^(\s*)(?:([-+*])\s+|(\d+)[.)]\s+)(.+)$/);
        if (!item || Boolean(item[3]) !== ordered) break;
        items.push({ level: Math.floor(item[1].length / 2), text: item[4] });
        index += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    const quote = line.match(/^\s*&gt;\s?(.*)$/) || line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      blocks.push({ type: 'quote', text: quote[1] });
      index += 1;
      continue;
    }

    paragraph.push(line.trim());
    index += 1;
  }
  flushParagraph();
  return blocks;
}

function renderMath(formula: string): React.ReactNode {
  const normalized = formula.replace(/\\\\([a-zA-Z]+)/g, '\\$1').trim();
  try {
    const html = katex.renderToString(normalized, {
      throwOnError: false,
      trust: false,
      strict: 'ignore',
      maxExpand: 100,
      maxSize: 12,
    });
    return <span className="inline-block max-w-full overflow-x-auto align-middle" dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <code>{formula}</code>;
  }
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\$[^$\n]+?\$|`[^`\n]+`|\*\*.+?\*\*|__.+?__|\*[^*\n]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      return <React.Fragment key={index}>{renderMath(part.slice(1, -1))}</React.Fragment>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="rounded bg-slate-200/80 px-1 py-0.5 font-mono text-[0.92em] text-indigo-950">{part.slice(1, -1)}</code>;
    }
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return <strong key={index} className="font-semibold text-slate-950">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export function MarkdownAnswer({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return <div className="space-y-2 leading-6 [overflow-wrap:anywhere]">
    {blocks.map((block, index) => {
      if (block.type === 'heading') {
        const Tag = block.level <= 2 ? 'h4' : 'h5';
        return <Tag key={index} className="pt-1 font-bold text-slate-950">{renderInline(block.text)}</Tag>;
      }
      if (block.type === 'list') {
        const Tag = block.ordered ? 'ol' : 'ul';
        return <Tag key={index} className={`${block.ordered ? 'list-decimal' : 'list-disc'} space-y-1 pl-5`}>
          {block.items.map((item, itemIndex) => <li key={itemIndex} style={{ marginLeft: Math.min(item.level * 0.75, 2.25) + 'rem' }}>
            {renderInline(item.text)}
          </li>)}
        </Tag>;
      }
      if (block.type === 'code') {
        return <pre key={index} className="overflow-x-auto rounded-md bg-slate-900 p-3 font-mono text-xs leading-5 text-slate-50"><code>{block.text}</code></pre>;
      }
      if (block.type === 'quote') {
        return <blockquote key={index} className="border-l-2 border-blue-300 pl-3 text-slate-700">{renderInline(block.text)}</blockquote>;
      }
      if (block.type === 'rule') return <hr key={index} className="border-slate-300" />;
      return <p key={index}>{renderInline(block.text)}</p>;
    })}
  </div>;
}
