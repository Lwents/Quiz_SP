import assert from 'node:assert/strict';
import { test } from 'node:test';
import { orderFromAnswers, moveMatch, chooseMatch } from './matchingPieces.ts';

const left = ['N', 'Z', 'Q', 'R'];
const pieces = ['True', 'False', 'True', 'True'];

test('matching repeated True/False labels never produces blank pieces', () => {
  const answers = { Z: 'False', Q: 'True' };
  const order = orderFromAnswers(left, pieces, answers);
  assert.deepEqual(order, ['True', 'False', 'True', 'True']);
  assert.deepEqual([...order].sort(), [...pieces].sort());
  assert.deepEqual(orderFromAnswers(left, pieces, {
    N: 'True', Z: 'True', Q: 'True', R: 'False',
  }), ['True', 'True', 'True', 'False']);
});

test('connecting and moving one True keeps the other True answers', () => {
  const order = ['True', 'True', 'True', 'False'];
  const twoMatches = { N: 'True', Z: 'True' };
  const threeMatches = moveMatch(left, order, twoMatches, 2, 2);
  assert.deepEqual(threeMatches, { N: 'True', Z: 'True', Q: 'True' });
  assert.deepEqual(moveMatch(left, order, threeMatches, 0, 3), {
    Z: 'True', Q: 'True', R: 'True',
  });
});

test('ordinary unique matching still restores every saved pair', () => {
  assert.deepEqual(orderFromAnswers(['a', 'b', 'c'], ['3', '1', '2'], {
    a: '1', c: '3',
  }), ['1', '2', '3']);
});

test('touch selection fills repeated labels without clearing earlier matches', () => {
  let answers = {};
  for (let i = 0; i < 3; i++) {
    const order = orderFromAnswers(left, pieces, answers);
    answers = chooseMatch(left, order, answers, i, 'True');
  }
  answers = chooseMatch(left, orderFromAnswers(left, pieces, answers), answers, 3, 'False');
  assert.deepEqual(answers, { N: 'True', Z: 'True', Q: 'True', R: 'False' });
});

test('touch selection can move, clear, and restore an answer', () => {
  const items = ['a', 'b'];
  const order = ['1', '2'];
  assert.deepEqual(chooseMatch(items, order, { a: '1' }, 1, '1'), { b: '1' });
  assert.deepEqual(chooseMatch(items, order, { a: '1', b: '2' }, 0, ''), { b: '2' });
  assert.deepEqual(chooseMatch(items, order, {}, 0, 'invalid'), {});
});

test('touch selection uses current answers even when source options are shuffled', () => {
  assert.deepEqual(chooseMatch(['one', 'two', 'three'], ['B', 'A', 'C'],
    { one: 'A', two: 'B' }, 2, 'A'), { two: 'B', three: 'A' });
});
