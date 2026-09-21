import React from 'react';
import { QuestionRendererProps } from '../question.types';
import { cn } from '../../../utils/cn';

export const TrueFalseQuestion: React.FC<QuestionRendererProps> = ({
  question,
  value,
  onChange,
  disabled
}) => {
  const options = [
    { id: true, label: 'Đúng (True)' },
    { id: false, label: 'Sai (False)' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((opt) => {
        const isChecked = value === opt.id || value === String(opt.id);
        return (
          <label
            key={String(opt.id)}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer select-none",
              isChecked
                ? "border-blue-600 bg-blue-50/50 text-blue-950 shadow-sm"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white",
              disabled && "opacity-60 cursor-not-allowed"
            )}
          >
            <input
              type="radio"
              name={`q_${question.id}`}
              checked={isChecked}
              disabled={disabled}
              onChange={() => onChange(opt.id)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <span className="text-base font-semibold">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
};
