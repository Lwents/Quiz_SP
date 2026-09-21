import React, { useState } from 'react';
import { QuestionEditorProps } from '../question.types';
import { Plus, Trash2 } from 'lucide-react';

export const FillBlankEditor: React.FC<QuestionEditorProps> = ({ config, onChange }) => {
  const acceptedAnswers: string[] = config.accepted_answers || [''];
  const caseSensitive = config.case_sensitive ?? false;

  const updateAnswer = (idx: number, val: string) => {
    const next = [...acceptedAnswers];
    next[idx] = val;
    onChange({ ...config, accepted_answers: next });
  };

  const addAnswer = () => {
    onChange({ ...config, accepted_answers: [...acceptedAnswers, ''] });
  };

  const removeAnswer = (idx: number) => {
    if (acceptedAnswers.length <= 1) return;
    const next = acceptedAnswers.filter((_, i) => i !== idx);
    onChange({ ...config, accepted_answers: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">Các đáp án được chấp nhận (tương đương):</label>
        <button
          type="button"
          onClick={addAnswer}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm đáp án chấp nhận
        </button>
      </div>

      <div className="space-y-2.5">
        {acceptedAnswers.map((ans, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono w-6 text-right">#{idx + 1}</span>
            <input
              type="text"
              value={ans}
              onChange={(e) => updateAnswer(idx, e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              placeholder="Ví dụ: Hà Nội hoặc Ha Noi..."
            />
            <button
              type="button"
              onClick={() => removeAnswer(idx)}
              disabled={acceptedAnswers.length <= 1}
              className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-20 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="case_sensitive"
          checked={caseSensitive}
          onChange={(e) => onChange({ ...config, case_sensitive: e.target.checked })}
          className="w-4 h-4 rounded text-blue-600 border-slate-300"
        />
        <label htmlFor="case_sensitive" className="text-xs font-medium text-slate-700 cursor-pointer">
          Phân biệt chữ hoa / chữ thường (Case sensitive)
        </label>
      </div>
    </div>
  );
};
