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
      <p className="text-sm text-slate-600">Chọn tất cả đáp án đúng (có thể có một hoặc nhiều đáp án).</p>
      {options.map((opt: any) => {
        const isChecked = selectedList.includes(opt.id);
        return (
          <label
            key={opt.id}
            className={cn(
              "flex items-center gap-3 p-3 sm:p-4 min-h-11 rounded-xl border transition-all cursor-pointer select-none",
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
              className="w-4 h-4 shrink-0 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <span className="min-w-0 [overflow-wrap:anywhere] text-base leading-relaxed font-medium">{opt.text}</span>
          </label>
        );
      })}
    </div>
  );
};
