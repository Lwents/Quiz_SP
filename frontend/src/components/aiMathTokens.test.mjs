import assert from 'node:assert/strict';
import { test } from 'node:test';
import { preprocessAllMath } from './aiMathTokens.ts';

test('an inline arrow stays inline inside a bold memory tip', () => {
  const result = preprocessAllMath('**Dấu khác nhau $\\rightarrow$ PHÂN PHỐI.**');
  assert.equal((result.match(/###MATH_INLINE###/g) || []).length, 1);
  assert.ok(!result.includes('###MATH_BLOCK###'));
  assert.ok(result.startsWith('**Dấu khác nhau '));
  assert.ok(result.endsWith(' PHÂN PHỐI.**'));
});

test('an arrow in a longer formula does not split the formula', () => {
  const result = preprocessAllMath('$p \\rightarrow (q \\lor r)$');
  assert.equal((result.match(/###MATH_INLINE###/g) || []).length, 1);
  assert.ok(!result.includes('###MATH_BLOCK###'));
});

test('explicit display formulas and bare arrows keep their intended formatting', () => {
  assert.equal((preprocessAllMath('$$p \\rightarrow q$$').match(/###MATH_BLOCK###/g) || []).length, 1);
  const result = preprocessAllMath('Dấu giống nhau \\rightarrow KẾT HỢP');
  assert.equal((result.match(/###MATH_INLINE###/g) || []).length, 1);
  assert.ok(!result.includes('###MATH_BLOCK###'));
});

test('forged encoded HTML math markers remain inert text', () => {
  const html = '<img src=x onerror="window.audit=1">';
  const input = `###MATH_INLINE###${encodeURIComponent(html)}###END###`;
  const result = preprocessAllMath(input);
  assert.ok(!result.includes('###MATH_INLINE###'));
  assert.ok(result.includes('＃＃＃MATH_INLINE＃＃＃'));
});

test('HTML inside prose math is escaped before rendering', () => {
  const result = preprocessAllMath('$\\text{<img src=x onerror=alert(1)>}$');
  const encoded = result.match(/###MATH_INLINE###(.*?)###END###/)[1];
  const html = decodeURIComponent(encoded);
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
});

test('untrusted math cannot create JavaScript links or expand macros forever', () => {
  const result = preprocessAllMath('$\\href{javascript:alert(1)}{click}$\n$\\def\\a{\\a}\\a$');
  for (const match of result.matchAll(/###MATH_(?:INLINE|BLOCK)###(.*?)###END###/g)) {
    assert.ok(!/href=["']javascript:/i.test(decodeURIComponent(match[1])));
  }
  assert.ok(result.length < 5000);
});
