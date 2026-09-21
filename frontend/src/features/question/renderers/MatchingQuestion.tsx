import React from 'react';
import { QuestionRendererProps } from '../question.types';

export const MatchingQuestion: React.FC<QuestionRendererProps> = ({
  question,
  value,
  onChange,
  disabled
}) => {
  // config: { left_items: [...], right_items: [...] } or { pairs: [...] }
  const leftItems: string[] = question.config?.left_items || (question.config?.pairs?.map((p: any) => p.left) || []);
  const rightItems: string[] = question.config?.right_items || (question.config?.pairs?.map((p: any) => p.right) || []);

  const currentMap: Record<string, string> = value || {};

  const handleSelect = (left: string, right: string) => {
    if (disabled) return;
    onChange({
      ...currentMap,
      [left]: right,
    });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 w-1/2">Vế trái (Khái niệm / Mệnh đề)</th>
              <th className="py-3 px-4 w-1/2">Ghép với vế phải</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {leftItems.map((left, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 px-4 font-medium text-slate-800">{left}</td>
                <td className="py-3.5 px-4">
                  <select
                    value={currentMap[left] || ''}
                    disabled={disabled}
                    onChange={(e) => handleSelect(left, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:opacity-60"
                  >
                    <option value="">-- Chọn đáp án tương ứng --</option>
                    {rightItems.map((right, rIdx) => (
                      <option key={rIdx} value={right}>
                        {right}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
