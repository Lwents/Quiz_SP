import React from 'react';
import { QuestionRendererProps } from '../question.types';

export const ShortAnswerQuestion: React.FC<QuestionRendererProps> = ({
  value,
  onChange,
  disabled
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-600 block">Câu trả lời ngắn của bạn:</label>
      <input
        type="text"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nhập câu trả lời ngắn..."
        className="w-full max-w-lg px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-800 text-base shadow-sm disabled:bg-slate-100 disabled:opacity-60"
      />
    </div>
  );
};
