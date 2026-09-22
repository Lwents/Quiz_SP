import React, { useState } from 'react';
import { QuestionRendererProps } from '../question.types';
import { GripVertical, X, Sparkles, Puzzle } from 'lucide-react';

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

  // Track active dragged item or selected item for tap/click-to-match
  const [draggedPiece, setDraggedPiece] = useState<string | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);

  // Items currently assigned to any slot
  const assignedValues = new Set(Object.values(currentMap));

  const handleAssign = (left: string, right: string) => {
    if (disabled) return;
    // If this piece is already assigned somewhere else, clear it there first
    const updated = { ...currentMap };
    for (const key of Object.keys(updated)) {
      if (updated[key] === right) {
        delete updated[key];
      }
    }
    updated[left] = right;
    onChange(updated);
    setSelectedPiece(null);
    setDraggedPiece(null);
    setHoveredTarget(null);
  };

  const handleRemove = (left: string) => {
    if (disabled) return;
    const updated = { ...currentMap };
    delete updated[left];
    onChange(updated);
  };

  const handleDragStart = (e: React.DragEvent, piece: string) => {
    if (disabled) return;
    setDraggedPiece(piece);
    e.dataTransfer.setData('text/plain', piece);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetLeft: string) => {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (hoveredTarget !== targetLeft) {
      setHoveredTarget(targetLeft);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, targetLeft: string) => {
    if (hoveredTarget === targetLeft) {
      setHoveredTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetLeft: string) => {
    if (disabled) return;
    e.preventDefault();
    const piece = e.dataTransfer.getData('text/plain') || draggedPiece;
    if (piece) {
      handleAssign(targetLeft, piece);
    }
    setHoveredTarget(null);
  };

  const handleSelectPieceClick = (piece: string) => {
    if (disabled) return;
    if (selectedPiece === piece) {
      setSelectedPiece(null);
    } else {
      setSelectedPiece(piece);
    }
  };

  const handleTargetSlotClick = (left: string) => {
    if (disabled) return;
    if (selectedPiece) {
      handleAssign(left, selectedPiece);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Tip guide */}
      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-800">
        <Puzzle className="w-4 h-4 text-indigo-600 shrink-0" />
        <span>
          <strong>Cách làm:</strong> Kéo mảnh ghép từ <strong>Khay mảnh ghép</strong> thả vào ô trống bên dưới, hoặc bấm vào mảnh ghép rồi bấm vào ô đích để ghép.
        </span>
      </div>

      {/* Grid of Match Targets (Vế Trái + Khung ghép Vế Phải) */}
      <div className="space-y-3">
        {leftItems.map((left, idx) => {
          const matchedRight = currentMap[left];
          const isHovered = hoveredTarget === left;
          const isSlotTargetSelected = Boolean(selectedPiece);

          return (
            <div
              key={idx}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 ${
                isHovered
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30'
                  : matchedRight
                  ? 'border-slate-200/90 hover:border-slate-300'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              {/* Vế trái: Khái niệm / Mệnh đề */}
              <div className="flex items-start gap-3 md:w-5/12 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-blue-200/50">
                  {idx + 1}
                </span>
                <span className="text-sm font-semibold text-slate-800 leading-snug">
                  {left}
                </span>
              </div>

              {/* Rãnh kết nối giữa 2 vế */}
              <div className="hidden md:flex items-center justify-center shrink-0 px-1 text-slate-300">
                <div className="w-6 h-0.5 bg-slate-200 rounded"></div>
              </div>

              {/* Vế phải: Ô rãnh nhận mảnh ghép (Drop Zone) */}
              <div
                onDragOver={(e) => handleDragOver(e, left)}
                onDragLeave={(e) => handleDragLeave(e, left)}
                onDrop={(e) => handleDrop(e, left)}
                onClick={() => handleTargetSlotClick(left)}
                className={`flex-1 min-h-[52px] rounded-xl border-2 transition-all flex items-center justify-between p-2.5 sm:p-3 relative ${
                  matchedRight
                    ? 'border-blue-300 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 shadow-2xs'
                    : isHovered
                    ? 'border-blue-500 border-dashed bg-blue-100/60 scale-[1.01]'
                    : isSlotTargetSelected
                    ? 'border-dashed border-blue-400 bg-blue-50/40 hover:bg-blue-100/50 cursor-pointer animate-pulse'
                    : 'border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer'
                }`}
              >
                {matchedRight ? (
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></div>
                      <span className="text-xs sm:text-sm font-medium text-blue-950 break-words leading-relaxed">
                        {matchedRight}
                      </span>
                    </div>

                    {!disabled && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(left);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white/80 rounded-lg transition shrink-0 cursor-pointer shadow-2xs"
                        title="Gỡ mảnh ghép"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full text-slate-400 text-xs font-medium py-1">
                    {isSlotTargetSelected ? (
                      <span className="text-blue-600 font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                        Bấm vào đây để gắn mảnh ghép đã chọn
                      </span>
                    ) : (
                      <span>Kéo thả hoặc bấm chọn mảnh ghép vào đây</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Khay chứa các mảnh ghép (Piece Bank) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Puzzle className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Khay mảnh ghép tương ứng
            </h4>
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            {assignedValues.size} / {rightItems.length} đã ghép
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {rightItems.map((piece, rIdx) => {
            const isAssigned = assignedValues.has(piece);
            const isSelected = selectedPiece === piece;

            return (
              <div
                key={rIdx}
                draggable={!disabled && !isAssigned}
                onDragStart={(e) => handleDragStart(e, piece)}
                onClick={() => !isAssigned && handleSelectPieceClick(piece)}
                className={`group px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center gap-2 shadow-2xs ${
                  isAssigned
                    ? 'opacity-35 bg-slate-100 border-slate-200 text-slate-400 line-through cursor-not-allowed'
                    : isSelected
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105 ring-2 ring-blue-400/50 cursor-pointer'
                    : 'bg-white border-slate-200/90 text-slate-800 hover:border-blue-400 hover:shadow-xs cursor-grab active:cursor-grabbing hover:bg-blue-50/30'
                }`}
              >
                {!isAssigned && (
                  <GripVertical
                    className={`w-3.5 h-3.5 ${
                      isSelected ? 'text-white/80' : 'text-slate-400 group-hover:text-blue-500'
                    }`}
                  />
                )}
                <span>{piece}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
