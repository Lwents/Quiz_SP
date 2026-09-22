import React, { useState, useMemo } from 'react';
import { QuestionRendererProps } from '../question.types';
import { GripVertical } from 'lucide-react';

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

  // Sinh thứ tự ngẫu nhiên ban đầu cho danh sách mảnh ghép bên phải
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

  // Track active drag / click selection
  const [draggedPiece, setDraggedPiece] = useState<string | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  // Tập hợp các mảnh ghép đã gắn vào một ô nào đó
  const assignedValues = new Set(Object.values(currentMap));

  // Gán mảnh ghép vào 1 ô bên trái
  const handleAssign = (targetLeft: string, piece: string) => {
    if (disabled) return;
    const next = { ...currentMap };

    // Nếu mảnh này đang ở câu khác -> hoán đổi hoặc nhấc sang
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
    setHoveredSlot(null);
  };

  // Trả mảnh ghép về bên phải (khi kéo thả mảnh từ ô trái ra ngoài hoặc sang phải)
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
  };

  // Drag & Drop
  const onDragStartPiece = (e: React.DragEvent, piece: string) => {
    if (disabled) return;
    setDraggedPiece(piece);
    e.dataTransfer.setData('text/plain', piece);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOverSlot = (e: React.DragEvent, left: string) => {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (hoveredSlot !== left) setHoveredSlot(left);
  };

  const onDragLeaveSlot = (_e: React.DragEvent, left: string) => {
    if (hoveredSlot === left) setHoveredSlot(null);
  };

  const onDropSlot = (e: React.DragEvent, left: string) => {
    if (disabled) return;
    e.preventDefault();
    const piece = e.dataTransfer.getData('text/plain') || draggedPiece;
    if (piece) {
      handleAssign(left, piece);
    }
    setHoveredSlot(null);
  };

  const onDropRightArea = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    const piece = e.dataTransfer.getData('text/plain') || draggedPiece;
    if (piece) {
      handleUnassign(piece);
    }
  };

  const onPieceClick = (piece: string) => {
    if (disabled) return;
    if (selectedPiece === piece) {
      setSelectedPiece(null);
    } else {
      setSelectedPiece(piece);
    }
  };

  const onSlotClick = (left: string) => {
    if (disabled) return;
    if (selectedPiece) {
      handleAssign(left, selectedPiece);
    } else if (currentMap[left]) {
      // Bấm vào ô đã có mảnh ghép -> chọn mảnh đó để chuyển sang câu khác hoặc trả về
      setSelectedPiece(currentMap[left]);
    }
  };

  return (
    <div className="space-y-4 select-none">
      <div className="text-xs text-slate-500 italic pb-1">
        💡 <strong>Kéo thả mảnh ghép:</strong> Giữ mảnh ghép ở bên phải kéo thả vào ô khuyết bên trái để gắn vào. Bạn có thể kéo mảnh ghép qua lại giữa các câu để đổi đáp án tự do.
      </div>

      {/* Grid 2 bên: Bên trái là khối câu hỏi kèm ô khuyết thiếu, Bên phải là các mảnh ghép rời */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
        
        {/* CỘT TRÁI: CÂU HỎI KÈM MẢNH GHÉP THIẾU (SLOT) */}
        <div className="space-y-3.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1 pb-1">
            Mảnh ghép câu hỏi (chờ gắn đáp án)
          </div>

          {leftItems.map((left, idx) => {
            const matchedPiece = currentMap[left];
            const isHovered = hoveredSlot === left;
            const isTargetActive = Boolean(selectedPiece);

            return (
              <div
                key={idx}
                onDragOver={(e) => onDragOverSlot(e, left)}
                onDragLeave={(e) => onDragLeaveSlot(e, left)}
                onDrop={(e) => onDropSlot(e, left)}
                onClick={() => onSlotClick(left)}
                className={`flex items-stretch rounded-2xl border-2 transition-all min-h-[58px] overflow-visible ${
                  isHovered
                    ? 'border-blue-500 ring-2 ring-blue-400/30 bg-blue-50/20'
                    : matchedPiece
                    ? 'border-blue-400 bg-white shadow-xs'
                    : isTargetActive
                    ? 'border-dashed border-blue-400 bg-blue-50/10 cursor-pointer'
                    : 'border-slate-300 bg-white shadow-2xs'
                }`}
              >
                {/* Nửa bên trái: Tên câu hỏi */}
                <div className="flex-1 p-3.5 sm:p-4 bg-slate-50/80 border-r border-slate-200/90 flex items-center gap-2.5 min-w-0 rounded-l-2xl">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200/60">
                    {idx + 1}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 break-words leading-relaxed">
                    {left}
                  </span>
                </div>

                {/* Nửa bên phải: Khớp puzzle lõm (Nếu chưa ghép = rãnh khuyết thiếu; Nếu đã ghép = mảnh ghép khớp vào) */}
                <div className="flex-1 relative flex items-center justify-center p-3 sm:p-3.5 min-w-0">
                  {/* Rãnh khuyết bán nguyệt (Female notch) khoét ở vách giữa */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-y-2 border-r-2 border-slate-300 z-10 pointer-events-none" />

                  {matchedPiece ? (
                    /* ĐÃ GHÉP MẢNH ĐÁP ÁN VÀO ĐÂY (CÓ THỂ KÉO TIẾP SANG CÂU KHÁC) */
                    <div
                      draggable={!disabled}
                      onDragStart={(e) => onDragStartPiece(e, matchedPiece)}
                      className="w-full h-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-300 text-blue-950 cursor-grab active:cursor-grabbing shadow-2xs"
                      title="Kéo sang câu khác hoặc kéo ra ngoài để đổi"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-xs sm:text-sm font-bold truncate leading-relaxed">
                          {matchedPiece}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-100/70 px-1.5 py-0.5 rounded shrink-0">
                        Đã khớp
                      </span>
                    </div>
                  ) : (
                    /* CHƯA GHÉP: Ô TRỐNG KHUYẾT THIẾU VIỀN NÉT ĐỨT */
                    <div
                      className={`w-full h-full border-2 border-dashed rounded-xl flex items-center justify-center text-xs text-center py-2 px-3 transition-colors ${
                        isHovered
                          ? 'border-blue-500 bg-blue-100/40 text-blue-700 font-semibold'
                          : isTargetActive
                          ? 'border-blue-400 bg-blue-50/50 text-blue-600 animate-pulse font-medium'
                          : 'border-slate-300 bg-slate-50/40 text-slate-400'
                      }`}
                    >
                      {isTargetActive ? 'Bấm để thả mảnh vào đây' : 'Thả mảnh ghép vào đây'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CỘT PHẢI: MẢNH GHÉP CÒN LẠI (CÓ CHỐT LỒI ĐỂ GẮN VÀO Ô THIẾU) */}
        <div
          onDragOver={(e) => {
            if (disabled) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={onDropRightArea}
          className="space-y-3.5"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 px-1 pb-1">
            <span>Mảnh ghép còn lại (kéo sang vế trái)</span>
            <span className="text-[11px] font-semibold text-blue-600 lowercase font-normal">
              {rightItems.length - assignedValues.size} mảnh chờ ghép
            </span>
          </div>

          {initialShuffledRight.map((piece, idx) => {
            const isAssigned = assignedValues.has(piece);
            const isSelected = selectedPiece === piece;

            if (isAssigned) {
              /* MẢNH ĐÃ ĐƯỢC GẮN VÀO BÊN TRÁI -> HIỂN THỊ KHUNG MỜ BÁO HIỆU ĐÃ LẤY ĐI */
              return (
                <div
                  key={idx}
                  className="flex items-center justify-center p-3.5 rounded-2xl border-2 border-dashed border-slate-200/90 bg-slate-50/50 min-h-[58px] text-xs text-slate-400 select-none"
                >
                  <span>Mảnh ghép này đã gắn vào vế bên trái</span>
                </div>
              );
            }

            /* MẢNH RỜI CHƯA GẮN -> CÓ THỂ CẦM KÉO THẢ VÀO BẤT KỲ Ô THIẾU NÀO */
            return (
              <div
                key={idx}
                draggable={!disabled}
                onDragStart={(e) => onDragStartPiece(e, piece)}
                onClick={() => onPieceClick(piece)}
                className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 transition-all min-h-[58px] cursor-grab active:cursor-grabbing select-none shadow-2xs ${
                  isSelected
                    ? 'border-blue-600 bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40 scale-[1.01]'
                    : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50/30 text-slate-800'
                }`}
              >
                {/* Mấu lồi dương (Male knob) ở cạnh trái để gắn vào rãnh bên kia */}
                <div
                  className={`absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-y-2 border-l-2 z-10 transition-colors pointer-events-none shadow-2xs ${
                    isSelected
                      ? 'bg-blue-600 border-white text-white'
                      : 'bg-white border-slate-300'
                  }`}
                />

                <div className="flex items-center gap-2.5 pl-3 min-w-0">
                  <GripVertical
                    className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}
                  />
                  <span className="text-xs sm:text-sm font-bold break-words leading-relaxed">
                    {piece}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isSelected ? 'Đang chọn' : 'Kéo'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
