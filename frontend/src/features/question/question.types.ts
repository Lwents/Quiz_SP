import { BaseQuestion } from '../../types';

export interface QuestionRendererProps {
  question: BaseQuestion;
  value: any;
  onChange: (val: any) => void;
  disabled?: boolean;
}

export interface QuestionEditorProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}
