/** Restore answers while keeping each occurrence of a repeated label. */
export function orderFromAnswers(
  leftItems: string[],
  shuffledRight: string[],
  answers: Record<string, string>,
): string[] {
  const order: Array<string | undefined> = Array(shuffledRight.length).fill(undefined);
  const available = [...shuffledRight];

  leftItems.forEach((left, index) => {
    if (index >= order.length) return;
    const occurrence = available.indexOf(answers[left]);
    if (occurrence === -1) return;
    order[index] = available.splice(occurrence, 1)[0];
  });

  return order.map((right) => right ?? available.shift()!);
}

/** Move the selected occurrence, without clearing other equal labels. */
export function moveMatch(
  leftItems: string[],
  rightOrder: string[],
  answers: Record<string, string>,
  fromIndex: number,
  toIndex: number,
): Record<string, string> {
  const right = rightOrder[fromIndex];
  const target = leftItems[toIndex];
  if (right === undefined || target === undefined) return answers;
  const next = { ...answers };
  const source = leftItems[fromIndex];
  if (source !== target && next[source] === right) delete next[source];
  next[target] = right;
  return next;
}

/** Native touch selection uses a free occurrence before moving an existing match. */
export function chooseMatch(
  leftItems: string[],
  rightOrder: string[],
  answers: Record<string, string>,
  toIndex: number,
  right: string,
): Record<string, string> {
  const target = leftItems[toIndex];
  if (target === undefined) return answers;
  if (!right) {
    const next = { ...answers };
    delete next[target];
    return next;
  }
  if (answers[target] === right) return answers;
  const order = orderFromAnswers(leftItems, rightOrder, answers);
  let fromIndex = order.findIndex((item, index) => item === right && answers[leftItems[index]] !== item);
  if (fromIndex === -1) fromIndex = order.indexOf(right);
  return moveMatch(leftItems, order, answers, fromIndex, toIndex);
}
