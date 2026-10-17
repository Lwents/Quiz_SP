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
