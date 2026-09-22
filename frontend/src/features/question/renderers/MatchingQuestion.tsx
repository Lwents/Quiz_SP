import React, { useState, useMemo } from 'react';
import { QuestionRendererProps } from '../question.types';
import { GripVertical, X, Sparkles, Puzzle, ArrowRight, Check } from 'lucide-react';

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

  // Khởi tạo danh sách vế phải ban đầu được xếp tương ứng từng dòng với vế trái
  // (Được xáo trộn ngẫu nhiên xác định theo question.id để không bị lộ thứ tự 1-1, 2-2)
  const initialRightList = useMemo(() => {
    const items = [...rightItems];
    if (items.length > 1) {
      let seed = 0;
      const str = String(question.id || 'seed-match');
      for (let i = 0; i < str.length; i++) {
        seed = (seed + str.charCodeAt(i) * (i + 1)) % 10007;
      }
      for (let i = items.length - 1; i > 0; i--) {
        const j = (seed + i * 37) % (i + 1);
        const temp = items[i];
        items[i] = items[j];
        items[j] = temp;
      }
    }
    return items;
  }, [question.id, question.config]);

  // Track active dragged item or selected item for tap/click-to-match
  const [draggedPiece, setDraggedPiece] = useState<string | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  // Items currently assigned to any slot
  const assignedValues = new Set(Object.values(currentMap));

  const handleAssign = (left: string, right: string) => {
    if (disabled) return;
    const updated = { ...currentMap };
    // Clear right piece from any existing assignment first
    for (const key of Object.keys(updated)) {
      if (updated[key] === right) {
        delete updated[key];
      }
    }
    updated[left] = right;
    onChange(updated);
    setSelectedPiece(null);
    setDraggedPiece(null);
    setHoveredSlot(null);
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
    if (hoveredSlot !== targetLeft) {
      setHoveredSlot(targetLeft);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, targetLeft: string) => {
    if (hoveredSlot === targetLeft) {
      setHoveredSlot(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetLeft: string) => {
    if (disabled) return;
    e.preventDefault();
    const piece = e.dataTransfer.getData('text/plain') || draggedPiece;
    if (piece) {
      handleAssign(targetLeft, piece);
    }
    setHoveredSlot(null);
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

  const maxRows = Math.max(leftItems.length, initialRightList.length);

  return (
    <div className="space-y-4 select-none">
      {/* Tip guide */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 shadow-2xs">
        <Puzzle className="w-4 h-4 text-indigo-600 shrink-0" />
        <span>
          <strong>Kéo thả ngang:</strong> Kéo mảnh ghép từ <strong>Cột bên phải</strong> sang rãnh ở <strong>Cột bên trái</strong> cùng hàng ngang để khớp lại, hoặc bấm chọn mảnh ghép rồi bấm vào ô đích để ghép.
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1 pb-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Vế 1: Khái niệm & Ô ghép
          </span>
          <span className="text-xs font-semibold text-blue-600">
            {assignedValues.size} / {leftItems.length} đã ghép
          </span>
        </div>

        <div className="hidden md:flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Vế 2: Mảnh ghép đáp án (Kéo sang trái)
          </span>
          <span className="text-xs font-medium text-slate-400">
            {initialRightList.length - assignedValues.size} mảnh chờ ghép
          </span>
        </div>
      </div>

      {/* Row by row side-by-side layout: exactly on the same rows */}
      <div className="space-y-3">
        {Array.from({ length: maxRows }).map((_, idx) => {
          const leftItem = leftItems[idx];
          const rightPiece = initialRightList[idx];

          const matchedRight = leftItem ? currentMap[leftItem] : null;
          const isHovered = leftItem ? hoveredSlot === leftItem : false;
          const isSlotTargetSelected = Boolean(selectedPiece);
          const isRightAssigned = rightPiece ? assignedValues.has(rightPiece) : false;
          const isRightSelected = selectedPiece === rightPiece;

          return (
            <div
              key={idx}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch"
            >
              {/* BÊN TRÁI: KHÁI NIỆM & RÃNH GHÉP (CÙNG HÀNG NÀY) */}
              {leftItem ? (
                matchedRight ? (
                  /* ĐÃ GHÉP THÀNH MỘT MẢNH NỐI HOÀN CHỈNH */
                  <div className="flex items-stretch rounded-2xl border border-blue-300 bg-white shadow-xs overflow-hidden min-h-[58px] transition-all hover:border-blue-400">
                    {/* Vế trái text */}
                    <div className="flex-1 p-3 sm:p-3.5 bg-slate-50/70 border-r border-slate-200/90 flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200/60">
                        {idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug break-words">
                        {leftItem}
                      </span>
                    </div>

                    {/* Mối nối puzzle tab ở giữa */}
                    <div className="w-5 -ml-2.5 -mr-2.5 z-10 flex items-center justify-center shrink-0">
                      <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-xs flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    </div>

                    {/* Mảnh ghép vế phải đã khớp vào */}
                    <div
                      draggable={!disabled}
                      onDragStart={(e) => handleDragStart(e, matchedRight)}
                      className="flex-1 p-3 sm:p-3.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 flex items-center justify-between gap-2 min-w-0 pl-3 cursor-grab"
                    >
                      <span className="text-xs sm:text-sm font-bold text-blue-950 truncate leading-relaxed">
                        {matchedRight}
                      </span>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(leftItem);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition shrink-0 cursor-pointer shadow-2xs"
                          title="Gỡ mảnh ghép ra"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* CHƯA GHÉP: RÃNH TRỐNG CHỜ KÉO MẢNH GHÉP VÀO */
                  <div
                    onDragOver={(e) => handleDragOver(e, leftItem)}
                    onDragLeave={(e) => handleDragLeave(e, leftItem)}
                    onDrop={(e) => handleDrop(e, leftItem)}
                    onClick={() => handleTargetSlotClick(leftItem)}
                    className={`flex items-stretch rounded-2xl border transition-all overflow-hidden min-h-[58px] cursor-pointer shadow-2xs ${
                      isHovered
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30'
                        : isSlotTargetSelected
                        ? 'border-dashed border-blue-400 bg-blue-50/20 hover:bg-blue-50/50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {/* Vế trái text */}
                    <div className="flex-1 p-3 sm:p-3.5 bg-slate-50/70 border-r border-slate-200/80 flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200/50">
                        {idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug break-words">
                        {leftItem}
                      </span>
                    </div>

                    {/* Khớp nối âm chờ nhận mảnh ghép */}
                    <div className="w-5 -ml-2.5 -mr-2.5 z-10 flex items-center justify-center shrink-0">
                      <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400/50" />
                      </div>
                    </div>

                    {/* Rãnh trống chờ kéo thả vào */}
                    <div className="flex-1 p-3 sm:p-3.5 bg-slate-50/40 border-dashed border-slate-300 flex items-center justify-center text-center pl-3">
                      {isSlotTargetSelected ? (
                        <span className="text-blue-600 font-semibold text-xs flex items-center gap-1.5 animate-pulse">
                          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                          Bấm để gắn vào đây
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs flex items-center gap-1">
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
                          Kéo thả vào đây
                        </span>
                      )}
                    </div>
                  </div>
                )
              ) : (
                <div />
              )}

              {/* BÊN PHẢI: MẢNH GHÉP ĐÁP ÁN (NGANG HÀNG NÀY) */}
              {rightPiece ? (
                isRightAssigned ? (
                  /* MẢNH NÀY ĐÃ ĐƯỢC DÙNG (GIỮ CHỖ NGANG HÀNG ĐỂ ĐỐI XỨNG CÂN BẰNG) */
                  <div className="p-3 sm:p-3.5 rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/40 flex items-center justify-between gap-2 min-h-[58px] text-xs text-slate-400">
                    <div className="flex items-center gap-2 min-w-0">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="truncate">
                        Đã ghép: <strong className="text-slate-600 font-semibold">{rightPiece}</strong>
                      </span>
                    </div>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => {
                          const leftKey = Object.keys(currentMap).find((k) => currentMap[k] === rightPiece);
                          if (leftKey) handleRemove(leftKey);
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline shrink-0 cursor-pointer"
                      >
                        Thu hồi
                      </button>
                    )}
                  </div>
                ) : (
                  /* MẢNH RỜI CHƯA GHÉP: KÉO SANG TRÁI HOẶC BẤM CHỌN */
                  <div
                    draggable={!disabled}
                    onDragStart={(e) => handleDragStart(e, rightPiece)}
                    onClick={() => handleSelectPieceClick(rightPiece)}
                    className={`relative p-3 sm:p-3.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 min-h-[58px] shadow-2xs cursor-grab active:cursor-grabbing select-none ${
                      isRightSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md ring-2 ring-blue-400/50 scale-[1.01]'
                        : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-xs hover:bg-blue-50/30 text-slate-800'
                    }`}
                  >
                    {/* Chốt nhô puzzle bên trái mảnh ghép */}
                    <div
                      className={`absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border flex items-center justify-center shadow-2xs ${
                        isRightSelected
                          ? 'bg-blue-600 border-white text-white'
                          : 'bg-white border-slate-300 text-slate-400'
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          isRightSelected ? 'bg-white' : 'bg-blue-500/50'
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-2 pl-2 min-w-0">
                      <GripVertical
                        className={`w-4 h-4 shrink-0 ${
                          isRightSelected ? 'text-white/80' : 'text-slate-400'
                        }`}
                      />
                      <span className="text-xs sm:text-sm font-semibold break-words leading-relaxed">
                        {rightPiece}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                        isRightSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isRightSelected ? 'Đang chọn' : 'Kéo sang'}
                    </span>
                  </div>
                )
              ) : (
                <div />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
