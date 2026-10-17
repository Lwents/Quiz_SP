import katex from 'katex';

const ARROWS: Record<string, string> = {
  rightarrow: '→', longrightarrow: '→', to: '→', implies: '⇒',
  Rightarrow: '⇒', Longrightarrow: '⇒', leftarrow: '←', longleftarrow: '←',
  Leftarrow: '⇐', Longleftarrow: '⇐', leftrightarrow: '↔',
  longleftrightarrow: '↔', Leftrightarrow: '⇔', Longleftrightarrow: '⇔', iff: '⇔',
};
const arrowCommand = /\\(longrightarrow|Longrightarrow|longleftarrow|Longleftarrow|longleftrightarrow|Longleftrightarrow|rightarrow|Rightarrow|leftarrow|Leftarrow|leftrightarrow|Leftrightarrow|implies|iff|to)\b/g;
const textCommand = /\\text(?:bf|it|rm|normal)?\{([^{}]*)\}/g;

const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!));

const normalizeFormula = (formula: string): string => formula
  .replace(/\\\\([a-zA-Z]+)/g, '\\$1')
  // AI sometimes nests inline delimiters inside an already delimited formula.
  .replace(/(?<!\\)\$/g, '')
  .trim();

const proseFormula = (formula: string): string | null => {
  const remainder = formula.replace(textCommand, '').replace(arrowCommand, '').replace(/[→⇒←⇐↔⇔]/g, '').trim();
  if (remainder) return null;
  return formula.replace(textCommand, '$1')
    .replace(arrowCommand, (_, command: string) => ` ${ARROWS[command]} `)
    .replace(/\s+/g, ' ').trim();
};

const renderKatexSafe = (formula: string, displayMode: boolean): string => {
  try {
    return katex.renderToString(formula, {
      displayMode, throwOnError: true, trust: false, strict: 'ignore', maxExpand: 100, maxSize: 12,
    });
  } catch {
    // Invalid AI output remains readable text, rather than red KaTeX error HTML.
    return escapeHtml(formula.replace(textCommand, '$1')
      .replace(arrowCommand, (_, command: string) => ARROWS[command]));
  }
};

export const preprocessAllMath = (text: string): string => {
  const arrowTokens = new Set<string>();
  const token = (formula: string, displayMode: boolean): string => {
    const normalized = normalizeFormula(formula);
    const prose = proseFormula(normalized);
    const kind = displayMode && prose === null ? 'BLOCK' : 'INLINE';
    const html = prose === null ? renderKatexSafe(normalized, displayMode) : escapeHtml(prose);
    const result = `###MATH_${kind}###${encodeURIComponent(html)}###END###`;
    if (prose !== null && Object.values(ARROWS).includes(prose)) arrowTokens.add(result);
    return result;
  };

  // Only tokens generated here may be interpreted as HTML by the renderer.
  const safeText = text.replace(/###MATH_(?:INLINE|BLOCK)###/g, (marker) => marker.replace(/#/g, '＃'));
  const out = safeText.replace(
    /```[\s\S]*?```|`[^`\n]*`|\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|(?<!\\)\$([^$\n]+?)\$|\\\(([\s\S]*?)\\\)|\\{1,2}[a-zA-Z]+(?:\{[^{}]*\})?/g,
    (match, dollarsBlock, bracketsBlock, dollarsInline, parenthesesInline) => {
      if (match.startsWith('`')) return match;
      if (dollarsBlock !== undefined) return token(dollarsBlock, true);
      if (bracketsBlock !== undefined) return token(bracketsBlock, true);
      if (dollarsInline !== undefined) return token(dollarsInline, false);
      if (parenthesesInline !== undefined) return token(parenthesesInline, false);
      return token(match, false);
    },
  );

  // A standalone implication sign belongs to the surrounding explanation,
  // not to a separate padded equation card.
  return out.replace(/\n[ \t]*(###MATH_INLINE###.*?###END###)[ \t]*\n/g,
    (match, marker: string) => arrowTokens.has(marker) ? ` ${marker} ` : match);
};
