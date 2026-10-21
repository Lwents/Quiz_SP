import React from 'react';
import { QuestionRendererProps } from '../question.types';
import { cn } from '../../../utils/cn';
import { MathText } from '../../../components/MathText';

export const SingleChoiceQuestion: React.FC<QuestionRendererProps> = ({
  question,
  value,
  onChange,
  disabled,
  revealCorrectAnswer = false
}) => {
  const options = question.config?.options || [];
  const correct = question.config?.correct;
  const correctIds = new Set(
    (Array.isArray(correct) ? correct : [correct])
      .filter((answer: unknown) => answer !== undefined && answer !== null)
      .map((answer: unknown) => String(answer).trim().toLowerCase())
  );

  return (
    <div className="space-y-3">
      {options.map((opt: any) => {
        const isChecked = value === opt.id || value === opt.text;
        const isCorrect = correctIds.has(String(opt.id).trim().toLowerCase())
          || correctIds.has(String(opt.text).trim().toLowerCase());
        const showCorrect = revealCorrectAnswer && isCorrect;
        const showIncorrectSelection = revealCorrectAnswer && isChecked && !isCorrect;
        return (
          <label
            key={opt.id}
            className={cn(
              "flex items-center gap-3 p-3 sm:p-4 min-h-11 rounded-xl border transition-all cursor-pointer select-none",
              showCorrect
                ? "border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm"
                : showIncorrectSelection
                  ? "border-rose-400 bg-rose-50 text-rose-950 shadow-sm"
                  : isChecked
                ? "border-blue-600 bg-blue-50/50 text-blue-950 shadow-sm"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white",
              disabled && "opacity-60 cursor-not-allowed"
            )}
          >
            <input
              type="radio"
              name={`q_${question.id}`}
              value={opt.id}
              checked={isChecked}
              disabled={disabled}
              onChange={() => onChange(opt.id)}
              className={cn(
                "w-4 h-4 shrink-0 focus:ring-blue-500 border-slate-300",
                showCorrect ? "text-emerald-600" : showIncorrectSelection ? "text-rose-600" : "text-blue-600"
              )}
            />
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere] text-base leading-relaxed font-medium"><MathText text={opt.text} /></span>
            {showCorrect && (
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                Đáp án đúng
              </span>
            )}
            {showIncorrectSelection && (
              <span className="shrink-0 rounded-full bg-rose-100 px-2 py-1 text-xs font-bold text-rose-800">
                Đã chọn
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
};
