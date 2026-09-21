import React from 'react';
import { QuestionEditorProps } from '../question.types';
import { Plus, Trash2 } from 'lucide-react';

export const MultipleChoiceEditor: React.FC<QuestionEditorProps> = ({ config, onChange }) => {
  const options = config.options || [
    { id: 'a', text: 'Lựa chọn A' },
    { id: 'b', text: 'Lựa chọn B' }
  ];
  const correct = Array.isArray(config.correct) ? config.correct : (config.correct ? [config.correct] : ['a']);
  const allowPartial = config.allow_partial ?? true;

  const updateOption = (idx: number, text: string) => {
    const next = [...options];
    next[idx] = { ...next[idx], text };
    onChange({ ...config, options: next });
  };

  const addOption = () => {
    const nextId = String.fromCharCode(97 + options.length);
    onChange({
      ...config,
      options: [...options, { id: nextId, text: `Lựa chọn ${nextId.toUpperCase()}` }]
    });
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    const removed = options[idx];
    const next = options.filter((_: any, i: number) => i !== idx);
    const nextCorrect = correct.filter((c: string) => c !== removed.id);
    onChange({ ...config, options: next, correct: nextCorrect.length ? nextCorrect : [next[0].id] });
  };

  const toggleCorrect = (id: string) => {
    if (correct.includes(id)) {
      if (correct.length > 1) {
        onChange({ ...config, correct: correct.filter((c: string) => c !== id) });
      }
    } else {
      onChange({ ...config, correct: [...correct, id] });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">Các phương án lựa chọn (Chọn nhiều đáp án đúng):</label>
        <button
          type="button"
          onClick={addOption}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm phương án
        </button>
      </div>

      <div className="space-y-2.5">
        {options.map((opt: any, idx: number) => (
          <div key={opt.id} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={correct.includes(opt.id)}
              onChange={() => toggleCorrect(opt.id)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
              title="Đánh dấu là đáp án đúng"
            />
            <span className="w-6 text-sm font-semibold text-slate-500 uppercase">{opt.id}.</span>
            <input
              type="text"
              value={opt.text}
              onChange={(e) => updateOption(idx, e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              placeholder="Nội dung phương án..."
            />
            <button
              type="button"
              onClick={() => removeOption(idx)}
              disabled={options.length <= 2}
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
          id="allow_partial"
          checked={allowPartial}
          onChange={(e) => onChange({ ...config, allow_partial: e.target.checked })}
          className="w-4 h-4 rounded text-blue-600 border-slate-300"
        />
        <label htmlFor="allow_partial" className="text-xs font-medium text-slate-700 cursor-pointer">
          Cho phép tính điểm từng phần (Partial scoring)
        </label>
      </div>
    </div>
  );
};
