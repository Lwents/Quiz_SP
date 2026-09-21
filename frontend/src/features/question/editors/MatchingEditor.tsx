import React from 'react';
import { QuestionEditorProps } from '../question.types';
import { Plus, Trash2 } from 'lucide-react';

export const MatchingEditor: React.FC<QuestionEditorProps> = ({ config, onChange }) => {
  const pairs: Array<{ left: string; right: string }> = config.pairs || [
    { left: 'Khái niệm A', right: 'Định nghĩa A' },
    { left: 'Khái niệm B', right: 'Định nghĩa B' }
  ];

  const updatePair = (idx: number, field: 'left' | 'right', val: string) => {
    const next = [...pairs];
    next[idx] = { ...next[idx], [field]: val };
    onChange({ ...config, pairs: next });
  };

  const addPair = () => {
    onChange({
      ...config,
      pairs: [...pairs, { left: '', right: '' }]
    });
  };

  const removePair = (idx: number) => {
    if (pairs.length <= 1) return;
    const next = pairs.filter((_, i) => i !== idx);
    onChange({ ...config, pairs: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">Các cặp ghép nối tương ứng (Trái - Phải):</label>
        <button
          type="button"
          onClick={addPair}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm cặp ghép nối
        </button>
      </div>

      <div className="space-y-3">
        {pairs.map((p, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono w-6 text-right">#{idx + 1}</span>
            <input
              type="text"
              value={p.left}
              onChange={(e) => updatePair(idx, 'left', e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="Vế trái..."
            />
            <span className="text-slate-400">↔</span>
            <input
              type="text"
              value={p.right}
              onChange={(e) => updatePair(idx, 'right', e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="Vế phải..."
            />
            <button
              type="button"
              onClick={() => removePair(idx)}
              disabled={pairs.length <= 1}
              className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-20 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
