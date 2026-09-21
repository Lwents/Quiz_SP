import React from 'react';
import { QuestionRendererProps } from '../question.types';
import { cn } from '../../../utils/cn';

export const MultipleChoiceQuestion: React.FC<QuestionRendererProps> = ({
  question,
  value,
  onChange,
  disabled
}) => {
  const options = question.config?.options || [];
  const selectedList: string[] = Array.isArray(value) ? value : [];

  const handleToggle = (optId: string) => {
    if (disabled) return;
    if (selectedList.includes(optId)) {
      onChange(selectedList.filter((id) => id !== optId));
    } else {
      onChange([...selectedList, optId]);
    }
  };

  return (
    <div className="space-y-3">
      {options.map((opt: any) => {
        const isChecked = selectedList.includes(opt.id);
        return (
          <label
            key={opt.id}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer select-none",
              isChecked
                ? "border-blue-600 bg-blue-50/50 text-blue-950 shadow-sm"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white",
              disabled && "opacity-60 cursor-not-allowed"
            )}
          >
            <input
              type="checkbox"
              value={opt.id}
              checked={isChecked}
              disabled={disabled}
              onChange={() => handleToggle(opt.id)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <span className="text-base leading-relaxed font-medium">{opt.text}</span>
          </label>
        );
      })}
    </div>
  );
};
