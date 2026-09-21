import React from 'react';
import { QuestionRendererProps } from '../question.types';

export const NumericQuestion: React.FC<QuestionRendererProps> = ({
  value,
  onChange,
  disabled
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-600 block">Nhập giá trị số kết quả:</label>
      <input
        type="number"
        step="any"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="Ví dụ: 3.14"
        className="w-full max-w-xs px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-800 text-base shadow-sm disabled:bg-slate-100 disabled:opacity-60"
      />
    </div>
  );
};
