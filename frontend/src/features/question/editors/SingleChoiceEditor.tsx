import React from 'react';
import { QuestionEditorProps } from '../question.types';
import { Plus, Trash2 } from 'lucide-react';

export const SingleChoiceEditor: React.FC<QuestionEditorProps> = ({ config, onChange }) => {
  const options = config.options || [
    { id: 'a', text: 'Lựa chọn A' },
    { id: 'b', text: 'Lựa chọn B' }
  ];
  const correct = config.correct || 'a';

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
    let nextCorrect = correct;
    if (correct === removed.id && next.length > 0) {
      nextCorrect = next[0].id;
    }
    onChange({ ...config, options: next, correct: nextCorrect });
  };

  const setCorrect = (id: string) => {
    onChange({ ...config, correct: id });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">Các phương án lựa chọn & Đáp án đúng:</label>
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
              type="radio"
              name="correct_choice"
              checked={correct === opt.id}
              onChange={() => setCorrect(opt.id)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
              title="Chọn làm đáp án đúng"
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
              title="Xóa lựa chọn"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 italic">* Tích chọn nút tròn ở đầu dòng để đặt phương án đó làm đáp án đúng.</p>
    </div>
  );
};
