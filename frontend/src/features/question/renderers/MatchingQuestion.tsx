import React, { useState, useEffect, useMemo } from 'react';
import { QuestionRendererProps } from '../question.types';
import { GripVertical, Check } from 'lucide-react';

/*
 * Giao diện ghép mảnh Puzzle chuẩn:
 * - Cột trái: Các mảnh câu hỏi. Mỗi hàng có Mảnh Vế Trái (có rãnh khuyết notch ở mép phải)
 *   và một RÃNH ĐÓN (Slot) ngay sát cạnh để khi kéo mảnh bên phải vào sẽ KHỚP DÍNH LIỀN KHỐI.
 * - Cột phải: Các mảnh đáp án còn lại (có chốt nhô tab ở mép trái).
 * - Kéo thả cực nhạy (HTML5 drag & drop kèm fallbacks click-to-match).
 * - Kéo nhầm chỉ việc kéo mảnh đó thả sang câu khác hoặc kéo sang phải để nhả ra.
 */

export const MatchingQuestion: React.FC<QuestionRendererProps> = ({
  question,
  value,
  onChange,
  disabled
}) => {
  const leftItems: string[] = useMemo(
    () => question.config?.left_items || (question.config?.pairs?.map((p: any) => p.left) || []),
    [question.config]
  );
  const rightItems: string[] = useMemo(
    () => question.config?.right_items || (question.config?.pairs?.map((p: any) => p.right) || []),
    [question.config]
  );

  const currentMap: Record<string, string> = useMemo(() => value || {}, [value]);

  // Sinh thứ tự ban đầu cho các mảnh bên phải (xáo trộn ngẫu nhiên xác định)
  const initialShuffledRight = useMemo(() => {
    const items = [...rightItems];
    if (items.length > 1) {
      let seed = 0;
      const str = String(question.id || 'puzzle-match');
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
  }, [question.id, rightItems]);

  // Trạng thái kéo thả & tương tác
  const [draggedPiece, setDraggedPiece] = useState<string | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);

  // Tập hợp các mảnh bên phải đã được ghép vào câu hỏi nào đó
  const assignedValues = new Set(Object.values(currentMap));

  // Gán 1 mảnh ghép vào câu vế trái
  const handleAssign = (targetLeft: string, piece: string) => {
    if (disabled) return;
    const next = { ...currentMap };

    // Nếu mảnh này đã ghép ở câu khác thì hoán đổi hoặc nhấc sang câu mới
    const oldLeftOfPiece = Object.keys(next).find((k) => next[k] === piece);
    const existingInTarget = next[targetLeft];

    if (oldLeftOfPiece && oldLeftOfPiece !== targetLeft) {
      if (existingInTarget) {
        // Đổi chỗ 2 mảnh giữa 2 câu
        next[oldLeftOfPiece] = existingInTarget;
      } else {
        delete next[oldLeftOfPiece];
      }
    }

    next[targetLeft] = piece;
    onChange(next);
    setDraggedPiece(null);
    setSelectedPiece(null);
    setHoveredTarget(null);
  };

  // Trả mảnh ghép về lại cột bên phải
  const handleUnassign = (piece: string) => {
    if (disabled) return;
    const next = { ...currentMap };
    for (const k of Object.keys(next)) {
      if (next[k] === piece) {
        delete next[k];
      }
    }
    onChange(next);
    setDraggedPiece(null);
    setSelectedPiece(null);
    setHoveredTarget(null);
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, piece: string) => {
    if (disabled) return;
    setDraggedPiece(piece);
    e.dataTransfer.setData('text/plain', piece);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverSlot = (e: React.DragEvent, targetLeft: string) => {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (hoveredTarget !== targetLeft) setHoveredTarget(targetLeft);
  };

  const handleDragLeaveSlot = (_e: React.DragEvent, targetLeft: string) => {
    if (hoveredTarget === targetLeft) setHoveredTarget(null);
  };

  const handleDropSlot = (e: React.DragEvent, targetLeft: string) => {
    if (disabled) return;
    e.preventDefault();
    const piece = e.dataTransfer.getData('text/plain') || draggedPiece;
    if (piece) {
      handleAssign(targetLeft, piece);
    }
    setHoveredTarget(null);
  };

  const handleDropRightArea = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    const piece = e.dataTransfer.getData('text/plain') || draggedPiece;
    if (piece) {
      handleUnassign(piece);
    }
  };

  const handlePieceClick = (piece: string) => {
    if (disabled) return;
    if (selectedPiece === piece) {
      setSelectedPiece(null);
    } else {
      setSelectedPiece(piece);
    }
  };

  const handleSlotClick = (left: string) => {
    if (disabled) return;
    if (selectedPiece) {
      handleAssign(left, selectedPiece);
    } else if (currentMap[left]) {
      // Đã có mảnh ghép -> bấm vào để nhấc mảnh này lên đổi chỗ
      setSelectedPiece(currentMap[left]);
    }
  };

  const matchedCount = Object.keys(currentMap).length;

  return (
    <div className="space-y-4 select-none">
      {/* Header hướng dẫn */}
      <div className="flex items-center justify-between pb-1">
        <div className="text-xs text-slate-500">
          Kéo mảnh ghép bên phải để gắn khớp vào mảnh ghép bên trái (có thể kéo đổi qua lại giữa các câu tự do).
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          {matchedCount} / {leftItems.length} đã ghép
        </span>
      </div>

      {/* Grid 2 cột đối xứng ngang hàng */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 items-start">
        
        {/* CỘT TRÁI: CÁC CÂU HỎI KÈM KHỚP NỐI PUZZLE */}
        <div className="space-y-3.5">
          {leftItems.map((left, idx) => {
            const matchedPiece = currentMap[left];
            const isHovered = hoveredTarget === left;
            const isSlotActive = Boolean(selectedPiece);

            return (
              <div
                key={idx}
                onDragOver={(e) => handleDragOverSlot(e, left)}
                onDragLeave={(e) => handleDragLeaveSlot(e, left)}
                onDrop={(e) => handleDropSlot(e, left)}
                onClick={() => handleSlotClick(left)}
                className={`relative w-full h-[64px] flex items-stretch rounded-xl transition-all duration-150 cursor-pointer ${
                  matchedPiece
                    ? 'shadow-xs'
                    : isHovered
                    ? 'ring-2 ring-blue-500 shadow-md'
                    : isSlotActive
                    ? 'ring-2 ring-blue-400/50 ring-dashed'
                    : 'hover:shadow-xs'
                }`}
              >
                {/* SVG Khối vế trái với rãnh khuyết bán nguyệt lõm ở mép phải */}
                <div className="relative flex-1 h-full min-w-0">
                  <svg
                    viewBox="0 0 320 64"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    <path
                      d="
                        M 12 2 
                        L 308 2 
                        A 12 12 0 0 1 320 14 
                        L 320 20 
                        A 12 12 0 0 0 320 44 
                        L 320 50 
                        A 12 12 0 0 1 308 62 
                        L 12 62 
                        A 12 12 0 0 1 0 50 
                        L 0 14 
                        A 12 12 0 0 1 12 2 
                        Z
                      "
                      className={`transition-colors duration-150 ${
                        matchedPiece
                          ? 'fill-blue-50/40 stroke-blue-400 stroke-2'
                          : isHovered
                          ? 'fill-blue-50/70 stroke-blue-500 stroke-2'
                          : 'fill-white stroke-slate-300 stroke-[1.5]'
                      }`}
                    />
                  </svg>

                  {/* Nội dung chữ vế trái */}
                  <div className="relative z-10 w-full h-full flex items-center gap-3 pl-4 pr-7 pointer-events-none">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-800 break-words leading-snug line-clamp-2">
                      {left}
                    </span>
                  </div>
                </div>

                {/* VỊ TRÍ GẮN KHỚP MẢNH PHẢI VÀO (ĂN KHỚP VỪA KHÍT) */}
                {matchedPiece ? (
                  <div
                    draggable={!disabled}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      handleDragStart(e, matchedPiece);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePieceClick(matchedPiece);
                    }}
                    title="Kéo sang câu khác hoặc kéo ra ngoài để đổi"
                    className={`relative w-[48%] h-full -ml-3 z-20 cursor-grab active:cursor-grabbing transition-transform ${
                      selectedPiece === matchedPiece ? 'scale-[1.03] ring-2 ring-blue-500 rounded-r-xl' : ''
                    }`}
                  >
                    <svg
                      viewBox="0 0 200 64"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                      <path
                        d="
                          M 24 2 
                          L 188 2 
                          A 12 12 0 0 1 200 14 
                          L 200 50 
                          A 12 12 0 0 1 188 62 
                          L 24 62 
                          A 12 12 0 0 1 12 50 
                          L 12 44 
                          A 12 12 0 0 1 12 20 
                          L 12 14 
                          A 12 12 0 0 1 24 2 
                          Z
                        "
                        className="fill-blue-50 stroke-blue-500 stroke-2"
                      />
                    </svg>

                    <div className="relative z-10 w-full h-full flex items-center justify-between pl-6 pr-3 pointer-events-none">
                      <span className="text-xs sm:text-sm font-bold text-blue-950 truncate leading-snug">
                        {matchedPiece}
                      </span>
                      <GripVertical className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-1" />
                    </div>
                  </div>
                ) : (
                  /* KHI CHƯA GẮN: Ô MỜ GỢI Ý CHỜ GẮN KHỚP */
                  <div className="relative w-[48%] h-full -ml-3 z-10 pointer-events-none flex items-center justify-center">
                    <svg
                      viewBox="0 0 200 64"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                      <path
                        d="
                          M 24 2 
                          L 188 2 
                          A 12 12 0 0 1 200 14 
                          L 200 50 
                          A 12 12 0 0 1 188 62 
                          L 24 62 
                          A 12 12 0 0 1 12 50 
                          L 12 44 
                          A 12 12 0 0 1 12 20 
                          L 12 14 
                          A 12 12 0 0 1 24 2 
                          Z
                        "
                        className={`transition-colors duration-150 ${
                          isHovered
                            ? 'fill-blue-100/50 stroke-blue-500 stroke-2 stroke-dasharray-[4,4]'
                            : isSlotActive
                            ? 'fill-blue-50/40 stroke-blue-400 stroke-[1.5] stroke-dasharray-[4,4]'
                            : 'fill-slate-50/40 stroke-slate-200 stroke-[1.5] stroke-dasharray-[4,4]'
                        }`}
                        strokeDasharray="4 4"
                      />
                    </svg>
                    <span className="relative z-10 text-[11px] text-slate-400 font-medium pl-3">
                      {isHovered ? 'Thả vào đây' : isSlotActive ? 'Bấm để gắn' : 'Rãnh nối'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CỘT PHẢI: CÁC MẢNH GHÉP ĐÁP ÁN ĐỐI DIỆN */}
        <div
          onDragOver={(e) => {
            if (disabled) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={handleDropRightArea}
          className="space-y-3.5"
        >
          {initialShuffledRight.map((piece, idx) => {
            const isAssigned = assignedValues.has(piece);
            const isSelected = selectedPiece === piece;

            if (isAssigned) {
              /* Mảnh này đã được gắn sang cột trái -> hiển thị khung vị trí báo hiệu đã dùng */
              return (
                <div
                  key={idx}
                  onClick={() => handleUnassign(piece)}
                  title="Mảnh ghép này đã gắn ở cột bên trái (Bấm để gỡ ra lại)"
                  className="relative w-full h-[64px] rounded-xl border border-dashed border-slate-200 bg-slate-50/40 flex items-center justify-between px-5 text-xs text-slate-400 cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="truncate italic">
                      Đã ghép: <strong className="font-semibold text-slate-600 not-italic">{piece}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-blue-600 font-medium hover:underline">
                    Gỡ ra
                  </span>
                </div>
              );
            }

            /* Mảnh còn ở khay -> có thể cầm kéo sang cột trái hoặc bấm chọn */
            return (
              <div
                key={idx}
                draggable={!disabled}
                onDragStart={(e) => handleDragStart(e, piece)}
                onClick={() => handlePieceClick(piece)}
                className={`relative w-full h-[64px] select-none transition-all duration-150 cursor-grab active:cursor-grabbing ${
                  isSelected ? 'scale-[1.02] filter drop-shadow-md' : 'hover:drop-shadow-xs'
                } ${draggedPiece === piece ? 'opacity-40' : 'opacity-100'}`}
              >
                <svg
                  viewBox="0 0 320 64"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <path
                    d="
                      M 24 2 
                      L 308 2 
                      A 12 12 0 0 1 320 14 
                      L 320 50 
                      A 12 12 0 0 1 308 62 
                      L 24 62 
                      A 12 12 0 0 1 12 50 
                      L 12 44 
                      A 12 12 0 0 1 12 20 
                      L 12 14 
                      A 12 12 0 0 1 24 2 
                      Z
                    "
                    className={`transition-colors duration-150 ${
                      isSelected
                        ? 'fill-blue-50 stroke-blue-600 stroke-2'
                        : 'fill-white stroke-slate-300 stroke-[1.5] hover:stroke-blue-400'
                    }`}
                  />
                </svg>

                <div className="relative z-10 w-full h-full flex items-center justify-between pl-7 pr-5 pointer-events-none">
                  <span className="text-sm font-semibold text-slate-800 break-words leading-snug line-clamp-2">
                    {piece}
                  </span>
                  <GripVertical className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
