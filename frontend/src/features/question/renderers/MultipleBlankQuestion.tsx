import React from 'react';
import { QuestionRendererProps } from '../question.types';

export const MultipleBlankQuestion: React.FC<QuestionRendererProps> = ({ question, value, onChange, disabled }) => {
  const count = Math.max(2, Number(question.config?.blank_count) || 2);
  const answers: string[] = Array.isArray(value) ? value : Array(count).fill('');

  return (
    <div className="space-y-3 max-w-lg">
      {Array.from({ length: count }, (_, index) => (
        <label key={index} className="block text-sm font-medium text-slate-600">
          Chỗ trống {index + 1}
          <input
            type="text"
            value={answers[index] || ''}
            disabled={disabled}
            onChange={(event) => {
              const next = [...answers];
              next[index] = event.target.value;
              onChange(next);
            }}
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
          />
        </label>
      ))}
    </div>
  );
};
