import React from 'react';
import katex from 'katex';

// Imported factorial expressions predate the use of explicit LaTeX delimiters.
// Match only this small mathematical grammar, leaving ordinary prose untouched.
const factorial = String.raw`(?:[nk]|\(\s*n\s*[-−–]\s*k\s*\))!`;
const denominator = String.raw`(?:\[\s*(?:${factorial}\s*)+\]|\(\s*(?:${factorial}\s*)+\)|${factorial})`;
const legacyFormula = new RegExp(
  String.raw`(?<![\p{L}\p{N}_\\])${factorial}(?:\s*\/\s*${denominator})?(?![\p{L}\p{N}_])`,
  'gu',
);
const delimitedFormula = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$\n]+\$)/g;

function legacyLatex(text: string): string {
  const normalized = text.replace(/\s/g, '').replace(/[−–]/g, '-');
  const [numerator, rawDenominator] = normalized.split('/');
  if (!rawDenominator) return normalized;
  const divisor = rawDenominator.startsWith('[')
    || (rawDenominator.startsWith('(') && rawDenominator.endsWith(')'))
    ? rawDenominator.slice(1, -1) : rawDenominator;
  return `\\dfrac{${numerator}}{${divisor}}`;
}

function formulaNode(formula: string, original: string, key: string): React.ReactNode {
  try {
    const html = katex.renderToString(formula, {
      throwOnError: true,
      trust: false,
      maxExpand: 100,
      maxSize: 12,
      output: 'htmlAndMathml',
    });
    return <span key={key} className="inline-block max-w-full overflow-x-auto align-middle py-1" dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <React.Fragment key={key}>{original}</React.Fragment>;
  }
}

function plainText(text: string, key: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  let offset = 0;
  for (const match of text.matchAll(legacyFormula)) {
    nodes.push(text.slice(offset, match.index));
    nodes.push(formulaNode(legacyLatex(match[0]), match[0], `${key}-${match.index}`));
    offset = match.index + match[0].length;
  }
  nodes.push(text.slice(offset));
  return <React.Fragment key={key}>{nodes}</React.Fragment>;
}

/** Render math as generated KaTeX markup; input HTML remains escaped by React. */
export const MathText: React.FC<{ text: string }> = ({ text }) => {
  const nodes: React.ReactNode[] = [];
  let offset = 0;
  for (const match of text.matchAll(delimitedFormula)) {
    nodes.push(plainText(text.slice(offset, match.index), `text-${offset}`));
    const token = match[0];
    const boundary = token.startsWith('$$') || token.startsWith('\\') ? 2 : 1;
    nodes.push(formulaNode(token.slice(boundary, -boundary), token, `math-${match.index}`));
    offset = match.index + token.length;
  }
  nodes.push(plainText(text.slice(offset), `text-${offset}`));
  return <>{nodes}</>;
};
