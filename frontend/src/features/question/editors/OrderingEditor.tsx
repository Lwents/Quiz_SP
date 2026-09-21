import React from 'react';
import { QuestionEditorProps } from '../question.types';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

export const OrderingEditor: React.FC<QuestionEditorProps> = ({ config, onChange }) => {
  const items: string[] = config.correct_order || ['Bước 1', 'Bước 2', 'Bước 3'];

  const updateItem = (idx: number, val: string) => {
    const next = [...items];
    next[idx] = val;
    onChange({ ...config, correct_order: next });
  };

  const addItem = () => {
    onChange({ ...config, correct_order: [...items, `Mục ${items.length + 1}`] });
  };

  const removeItem = (idx: number) => {
    if (items.length <= 2) return;
    const next = items.filter((_, i) => i !== idx);
    onChange({ ...config, correct_order: next });
  };

  const move = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onChange({ ...config, correct_order: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">Thứ tự đúng chuẩn (Từ trên xuống dưới):</label>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm mục
        </button>
      </div>

      <div className="space-y-2.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
              {idx + 1}
            </span>
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(idx, e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="Nội dung mục sắp xếp..."
            />
            <button
              type="button"
              disabled={idx === 0}
              onClick={() => move(idx, idx - 1)}
              className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={idx === items.length - 1}
              onClick={() => move(idx, idx + 1)}
              className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              disabled={items.length <= 2}
              className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-20 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
