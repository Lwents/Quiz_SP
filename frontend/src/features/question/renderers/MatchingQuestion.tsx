import React, { useState, useMemo } from 'react';
import { QuestionRendererProps } from '../question.types';
import { X, Check, GripVertical } from 'lucide-react';

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

  // Xáo trộn ngẫu nhiên danh sách vế phải ban đầu để đối diện từng hàng với vế trái
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

  // State theo dõi kéo thả và bấm chọn ghép
  const [draggedPiece, setDraggedPiece] = useState<string | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);

  // Tập hợp các mảnh ghép vế phải đã được ghép vào vế trái
  const assignedValues = new Set(Object.values(currentMap));

  const handleAssign = (left: string, right: string) => {
    if (disabled) return;
    const updated = { ...currentMap };
    // Nếu mảnh này đã ghép ở câu khác thì gỡ ở câu đó trước
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

  const maxRows = Math.max(leftItems.length, initialRightList.length);

  return (
    <div className="space-y-4 select-none">
      <div className="text-xs text-slate-500 italic pb-1">
        💡 Kéo mảnh ghép ở bên phải thả vào rãnh bên trái để ghép đôi (hoặc bấm chọn mảnh ghép rồi bấm vào vế muốn ghép).
      </div>

      {/* Danh sách các hàng mảnh ghép 2 bên song song đối xứng */}
      <div className="space-y-3.5">
        {Array.from({ length: maxRows }).map((_, idx) => {
          const leftItem = leftItems[idx];
          const rightPiece = initialRightList[idx];

          const matchedRight = leftItem ? currentMap[leftItem] : null;
          const isHovered = leftItem ? hoveredTarget === leftItem : false;
          const isRightAssigned = rightPiece ? assignedValues.has(rightPiece) : false;
          const isRightSelected = selectedPiece === rightPiece;

          return (
            <div
              key={idx}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-center"
            >
              {/* CỘT TRÁI: VẾ 1 (CÓ RÃNH LÕM 凹 Ở CẠNH PHẢI) */}
              {leftItem ? (
                matchedRight ? (
                  /* TRẠNG THÁI ĐÃ GHÉP: 2 MẢNH GHÉP DÍNH LIỀN NHAU QUA KHỚP NỐI */
                  <div className="flex items-stretch rounded-2xl border-2 border-blue-400 bg-white shadow-xs overflow-hidden min-h-[58px] transition-all">
                    {/* Nửa bên trái: Khái niệm */}
                    <div className="flex-1 p-3.5 bg-slate-50/80 border-r border-blue-200/80 flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200">
                        {idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug break-words">
                        {leftItem}
                      </span>
                    </div>

                    {/* Mấu ghép puzzle ở giữa liên kết 2 nửa */}
                    <div className="w-4 -ml-2 -mr-2 z-10 flex items-center justify-center shrink-0">
                      <div className="w-4 h-7 rounded-r-full bg-blue-50 border-y-2 border-r-2 border-blue-400 shadow-2xs" />
                    </div>

                    {/* Nửa bên phải: Mảnh ghép đã khớp vào */}
                    <div className="flex-1 p-3.5 bg-blue-50/60 flex items-center justify-between gap-2 min-w-0 pl-3">
                      <span className="text-xs sm:text-sm font-bold text-blue-950 truncate leading-relaxed">
                        {matchedRight}
                      </span>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => handleRemove(leftItem)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition shrink-0 cursor-pointer shadow-2xs"
                          title="Gỡ mảnh ghép"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* TRẠNG THÁI CHƯA GHÉP: MẢNH TRÁI VỚI RÃNH LÕM 凹 CHỜ KÉO VÀO */
                  <div
                    onDragOver={(e) => handleDragOver(e, leftItem)}
                    onDragLeave={(e) => handleDragLeave(e, leftItem)}
                    onDrop={(e) => handleDrop(e, leftItem)}
                    onClick={() => handleTargetSlotClick(leftItem)}
                    className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 transition-all min-h-[58px] cursor-pointer ${
                      isHovered
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40'
                        : selectedPiece
                        ? 'border-blue-400 border-dashed bg-blue-50/20 hover:bg-blue-50/50'
                        : 'border-slate-300 hover:border-slate-400 bg-white shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 pr-6 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200/60">
                        {idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug break-words">
                        {leftItem}
                      </span>
                    </div>

                    {/* Rãnh lõm hình bán nguyệt 凹 ở cạnh phải mảnh ghép */}
                    <div className="absolute -right-[2px] top-1/2 -translate-y-1/2 w-4 h-7 flex items-center justify-center z-10 pointer-events-none">
                      <div className={`w-3.5 h-6 rounded-l-full border-y-2 border-l-2 ${
                        isHovered ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-300'
                      }`} />
                    </div>
                  </div>
                )
              ) : (
                <div />
              )}

              {/* CỘT PHẢI: MẢNH CÒN THIẾU (CÓ CHỐT LỒI 凸 Ở CẠNH TRÁI) */}
              {rightPiece ? (
                isRightAssigned ? (
                  /* MẢNH NÀY ĐÃ ĐƯỢC GHÉP -> HIỂN THỊ KHUNG MỜ GIỮ VỊ TRÍ HÀNG */
                  <div className="flex items-center justify-center p-3 sm:p-3.5 rounded-2xl border-2 border-dashed border-slate-200/80 bg-slate-50/50 min-h-[58px] text-xs text-slate-400 gap-1.5 select-none">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Đã ghép vào vế bên trái</span>
                  </div>
                ) : (
                  /* MẢNH CÒN THIẾU CHƯA GHÉP: CÓ CHỐT LỒI 凸 CHỜ KÉO SANG TRÁI */
                  <div
                    draggable={!disabled}
                    onDragStart={(e) => handleDragStart(e, rightPiece)}
                    onClick={() => handleSelectPieceClick(rightPiece)}
                    className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 transition-all min-h-[58px] cursor-grab active:cursor-grabbing shadow-2xs select-none ${
                      isRightSelected
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md ring-2 ring-blue-400/50 scale-[1.01]'
                        : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50/30 text-slate-800'
                    }`}
                  >
                    {/* Chốt lồi hình bán nguyệt 凸 ở cạnh trái mảnh ghép */}
                    <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-4 h-7 flex items-center justify-center z-10 pointer-events-none">
                      <div className={`w-3.5 h-6 rounded-l-full border-y-2 border-l-2 shadow-2xs ${
                        isRightSelected
                          ? 'bg-blue-600 border-white text-white'
                          : 'bg-white border-slate-300'
                      }`} />
                    </div>

                    <div className="flex items-center gap-2.5 pl-2 min-w-0">
                      <GripVertical className={`w-4 h-4 shrink-0 ${isRightSelected ? 'text-white/80' : 'text-slate-400'}`} />
                      <span className="text-xs sm:text-sm font-semibold break-words leading-relaxed">
                        {rightPiece}
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                      isRightSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isRightSelected ? 'Đang chọn' : 'Kéo'}
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
