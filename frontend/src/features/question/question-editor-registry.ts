import React from 'react';
import { QuestionType } from '../../types';
import { QuestionEditorProps } from './question.types';
import { SingleChoiceEditor } from './editors/SingleChoiceEditor';
import { MultipleChoiceEditor } from './editors/MultipleChoiceEditor';
import { FillBlankEditor } from './editors/FillBlankEditor';
import { MatchingEditor } from './editors/MatchingEditor';
import { OrderingEditor } from './editors/OrderingEditor';

export const questionEditors: Record<string, React.FC<QuestionEditorProps>> = {
  single_choice: SingleChoiceEditor,
  multiple_choice: MultipleChoiceEditor,
  fill_blank: FillBlankEditor,
  matching: MatchingEditor,
  ordering: OrderingEditor,
  dropdown: SingleChoiceEditor,
  short_answer: FillBlankEditor,
  drag_drop: MatchingEditor,
};

export function getQuestionEditor(type: QuestionType): React.FC<QuestionEditorProps> {
  return questionEditors[type] || SingleChoiceEditor;
}
