import React from 'react';
import { QuestionType } from '../../types';
import { QuestionRendererProps } from './question.types';
import { SingleChoiceQuestion } from './renderers/SingleChoiceQuestion';
import { MultipleChoiceQuestion } from './renderers/MultipleChoiceQuestion';
import { TrueFalseQuestion } from './renderers/TrueFalseQuestion';
import { FillBlankQuestion } from './renderers/FillBlankQuestion';
import { MatchingQuestion } from './renderers/MatchingQuestion';
import { OrderingQuestion } from './renderers/OrderingQuestion';
import { NumericQuestion } from './renderers/NumericQuestion';
import { ShortAnswerQuestion } from './renderers/ShortAnswerQuestion';

export const questionRenderers: Record<string, React.FC<QuestionRendererProps>> = {
  single_choice: SingleChoiceQuestion,
  multiple_choice: MultipleChoiceQuestion,
  true_false: TrueFalseQuestion,
  fill_blank: FillBlankQuestion,
  multiple_blank: FillBlankQuestion,
  matching: MatchingQuestion,
  drag_drop: MatchingQuestion,
  ordering: OrderingQuestion,
  numeric: NumericQuestion,
  short_answer: ShortAnswerQuestion,
  dropdown: SingleChoiceQuestion,
};

export function getQuestionRenderer(type: QuestionType): React.FC<QuestionRendererProps> {
  return questionRenderers[type] || SingleChoiceQuestion;
}
