import React, { useState, useEffect, useMemo } from 'react';
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

  // Thứ tự xáo trộn ngẫu nhiên ban đầu của các mảnh bên phải
  const initialShuffledRight = useMemo(() => {
    const items = [...rightItems];
    if (items.length > 1) {
      let seed = 0;
      const str = String(question.id || 'match-seed');
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

  // Danh sách mảnh ghép bên phải hiện tại trên từng hàng
  const [rightOrder, setRightOrder] = useState<string[]>(() => {
    if (Object.keys(currentMap).length > 0) {
      const order: string[] = [];
      const used = new Set<string>();
      leftItems.forEach((left) => {
        const match = currentMap[left];
        if (match) {
          order.push(match);
          used.add(match);
        }
      });
      initialShuffledRight.forEach((item) => {
        if (!used.has(item)) order.push(item);
      });
      return order.length === initialShuffledRight.length ? order : initialShuffledRight;
    }
    return initialShuffledRight;
  });

  useEffect(() => {
    if (Object.keys(currentMap).length > 0) {
      const order: string[] = [];
      const used = new Set<string>();
      leftItems.forEach((left) => {
        const match = currentMap[left];
        if (match) {
          order.push(match);
          used.add(match);
        }
      });
      initialShuffledRight.forEach((item) => {
        if (!used.has(item)) order.push(item);
      });
      if (order.length === initialShuffledRight.length) {
        setRightOrder(order);
      }
    } else {
      setRightOrder(initialShuffledRight);
    }
  }, [question.id, initialShuffledRight]);

  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Hoán đổi 2 mảnh ghép ở cột phải
  const handleSwap = (fromIdx: number, toIdx: number) => {
    if (disabled || fromIdx === toIdx) return;
    const newOrder = [...rightOrder];
    const temp = newOrder[fromIdx];
    newOrder[fromIdx] = newOrder[toIdx];
    newOrder[toIdx] = temp;
    setRightOrder(newOrder);

    // Lưu ngay kết quả ghép nối của các hàng
    const newMap: Record<string, string> = {};
    leftItems.forEach((left, i) => {
      if (i < newOrder.length) {
        newMap[left] = newOrder[i];
      }
    });
    onChange(newMap);

    setDraggingIdx(null);
    setHoveredIdx(null);
    setSelectedIdx(null);
  };

  const onDragStart = (e: React.DragEvent, idx: number) => {
    if (disabled) return;
    setDraggingIdx(idx);
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, idx: number) => {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (hoveredIdx !== idx) setHoveredIdx(idx);
  };

  const onDragLeave = (_e: React.DragEvent, idx: number) => {
    if (hoveredIdx === idx) setHoveredIdx(null);
  };

  const onDrop = (e: React.DragEvent, idx: number) => {
    if (disabled) return;
    e.preventDefault();
    const fromStr = e.dataTransfer.getData('text/plain');
    const from = fromStr !== '' ? parseInt(fromStr, 10) : draggingIdx;
    if (from !== null && !isNaN(from)) {
      handleSwap(from, idx);
    }
    setDraggingIdx(null);
    setHoveredIdx(null);
  };

  const onItemClick = (idx: number) => {
    if (disabled) return;
    if (selectedIdx === null) {
      setSelectedIdx(idx);
    } else if (selectedIdx === idx) {
      setSelectedIdx(null);
    } else {
      handleSwap(selectedIdx, idx);
    }
  };

  const maxRows = Math.max(leftItems.length, rightOrder.length);
  const hasAnswered = Object.keys(currentMap).length > 0;

  return (
    <div className="space-y-4 select-none">
      <div className="text-xs text-slate-500 italic pb-1">
        💡 Kéo thả mảnh ghép bên phải để hoán đổi vị trí sao cho khớp với vế bên trái (hoặc bấm chọn mảnh ghép rồi bấm vào hàng muốn đổi).
      </div>

      {/* Danh sách các hàng mảnh ghép 2 bên song song theo đúng hình vẽ */}
      <div className="space-y-3.5">
        {Array.from({ length: maxRows }).map((_, idx) => {
          const leftItem = leftItems[idx];
          const rightPiece = rightOrder[idx];
          const isSelected = selectedIdx === idx;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-center"
            >
              {/* CỘT TRÁI: MẢNH GHI NỘI DUNG (CÓ RÃNH LÕM 凹 Ở CẠNH PHẢI) */}
              {leftItem ? (
                <div
                  onDragOver={(e) => onDragOver(e, idx)}
                  onDragLeave={(e) => onDragLeave(e, idx)}
                  onDrop={(e) => onDrop(e, idx)}
                  onClick={() => selectedIdx !== null && handleSwap(selectedIdx, idx)}
                  className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl border-2 transition-all min-h-[58px] ${
                    isHovered
                      ? 'border-blue-400 bg-blue-50/40'
                      : 'border-slate-300 bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center gap-3 pr-4 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200">
                      {idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-800 break-words leading-relaxed">
                      {leftItem}
                    </span>
                  </div>

                  {/* Rãnh khuyết âm (Notch) cắt vào trong ở cạnh phải */}
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-y-2 border-l-2 border-slate-300 z-10 pointer-events-none" />
                </div>
              ) : (
                <div />
              )}

              {/* CỘT PHẢI: MẢNH CÒN THIẾU (CÓ MẤU LỒI 凸 Ở CẠNH TRÁI, KÉO THẢ TỰ DO ĐỔI CÂU) */}
              {rightPiece ? (
                <div
                  draggable={!disabled}
                  onDragStart={(e) => onDragStart(e, idx)}
                  onDragOver={(e) => onDragOver(e, idx)}
                  onDragLeave={(e) => onDragLeave(e, idx)}
                  onDrop={(e) => onDrop(e, idx)}
                  onClick={() => onItemClick(idx)}
                  className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl border-2 transition-all duration-150 min-h-[58px] cursor-grab active:cursor-grabbing shadow-2xs select-none ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40 scale-[1.01]'
                      : isHovered
                      ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-200'
                      : hasAnswered
                      ? 'border-blue-400 bg-white hover:border-blue-500 text-slate-900'
                      : 'border-slate-300 hover:border-blue-400 bg-white text-slate-800'
                  }`}
                >
                  {/* Mấu lồi dương (Knob) nhô ra ngoài ở cạnh trái */}
                  <div
                    className={`absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-y-2 border-l-2 z-10 transition-colors pointer-events-none shadow-2xs ${
                      isSelected
                        ? 'bg-blue-600 border-white text-white'
                        : hasAnswered
                        ? 'bg-white border-blue-400'
                        : 'bg-white border-slate-300'
                    }`}
                  />

                  <div className="flex items-center gap-2 pl-3 min-w-0">
                    <GripVertical
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-white/80' : 'text-slate-400'
                      }`}
                    />
                    <span className="text-xs sm:text-sm font-bold break-words leading-relaxed">
                      {rightPiece}
                    </span>
                  </div>
                </div>
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
