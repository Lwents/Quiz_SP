import React from 'react';
import { QuestionRendererProps } from '../question.types';
import { ArrowUp, ArrowDown } from 'lucide-react';

export const OrderingQuestion: React.FC<QuestionRendererProps> = ({
  question,
  value,
  onChange,
  disabled
}) => {
  const initialItems: string[] = question.config?.items || question.config?.correct_order || [];
  const currentList: string[] = Array.isArray(value) && value.length === initialItems.length ? value : initialItems;

  const moveItem = (fromIdx: number, toIdx: number) => {
    if (disabled || toIdx < 0 || toIdx >= currentList.length) return;
    const updated = [...currentList];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    onChange(updated);
  };

  return (
    <div className="space-y-2 max-w-xl">
      <p className="text-xs text-slate-500 mb-2">Dùng nút mũi tên để sắp xếp các mục theo đúng thứ tự từ trên xuống dưới:</p>
      {currentList.map((item, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
              {idx + 1}
            </span>
            <span className="font-medium text-slate-800 text-sm">{item}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled || idx === 0}
              onClick={() => moveItem(idx, idx - 1)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Di chuyển lên"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={disabled || idx === currentList.length - 1}
              onClick={() => moveItem(idx, idx + 1)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Di chuyển xuống"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
