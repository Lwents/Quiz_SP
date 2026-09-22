import React, { useState, useEffect, useMemo } from 'react';
import { QuestionRendererProps } from '../question.types';
import { GripVertical } from 'lucide-react';

/* 
 * Component Matching SVG Puzzle Piece:
 * Vẽ hình chữ nhật bo góc với khớp nối hình jigsaw puzzle:
 * - isLeft: cạnh phải có ngàm khuyết lõm vào trong (notch)
 * - !isLeft: cạnh trái có mấu nhô lồi ra ngoài (tab/knob)
 */
interface PuzzlePieceProps {
  isLeft: boolean;
  text: string;
  index?: number;
  isSelected?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  draggable?: boolean;
}

const PuzzlePiece: React.FC<PuzzlePieceProps> = ({
  isLeft,
  text,
  index,
  isSelected,
  isHovered,
  isDragging,
  onClick,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragEnd,
  draggable
}) => {
  return (
    <div
      onClick={onClick}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      draggable={draggable}
      onDragStart={onDragStart}
      className={`relative w-full h-[64px] select-none transition-all duration-150 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${isSelected ? 'scale-[1.02] filter drop-shadow-md' : 'hover:drop-shadow-xs'} ${
        isDragging ? 'opacity-40' : 'opacity-100'
      }`}
    >
      {/* SVG Background Puzzle shape */}
      <svg
        viewBox="0 0 320 64"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {isLeft ? (
          /* MẢNH TRÁI: Bo góc 12px, cạnh phải có rãnh khuyết hình tròn bán kính r=12 lõm vào trong */
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
              isHovered
                ? 'fill-blue-50/80 stroke-blue-500 stroke-2'
                : 'fill-white stroke-slate-300 stroke-[1.5]'
            }`}
          />
        ) : (
          /* MẢNH PHẢI: Bo góc 12px, cạnh trái có mấu nhô hình tròn bán kính r=12 lồi ra ngoài */
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
                : isHovered
                ? 'fill-blue-50/60 stroke-blue-400 stroke-2'
                : 'fill-white stroke-slate-300 stroke-[1.5]'
            }`}
          />
        )}
      </svg>

      {/* Content overlay */}
      <div
        className={`relative z-10 w-full h-full flex items-center justify-between px-5 pointer-events-none select-none ${
          isLeft ? 'pr-8' : 'pl-7'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {index !== undefined && (
            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
              {index}
            </span>
          )}
          <span className="text-sm font-medium text-slate-800 break-words leading-snug line-clamp-2">
            {text}
          </span>
        </div>

        {!isLeft && (
          <GripVertical className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
        )}
      </div>
    </div>
  );
};

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

  // Sinh thứ tự xáo trộn ngẫu nhiên xác định cho danh sách bên phải
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

  // Thứ tự hiển thị hiện tại của các mảnh ghép bên phải
  const [rightOrder, setRightOrder] = useState<string[]>(() => {
    const keys = Object.keys(currentMap);
    if (keys.length > 0) {
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
    const keys = Object.keys(currentMap);
    if (keys.length > 0) {
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

  // Hoán đổi vị trí của 2 mảnh ghép ở cột phải
  const handleSwap = (fromIdx: number, toIdx: number) => {
    if (disabled || fromIdx === toIdx) return;
    const newOrder = [...rightOrder];
    const temp = newOrder[fromIdx];
    newOrder[fromIdx] = newOrder[toIdx];
    newOrder[toIdx] = temp;
    setRightOrder(newOrder);

    // Cập nhật kết quả ghép đối ứng với vế trái
    const nextMap: Record<string, string> = {};
    leftItems.forEach((left, i) => {
      if (i < newOrder.length) {
        nextMap[left] = newOrder[i];
      }
    });
    onChange(nextMap);

    setDraggingIdx(null);
    setHoveredIdx(null);
    setSelectedIdx(null);
  };

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, idx: number) => {
    if (disabled) return;
    setDraggingIdx(idx);
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>, idx: number) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (hoveredIdx !== idx) setHoveredIdx(idx);
  };

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>, idx: number) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    if (hoveredIdx !== idx) setHoveredIdx(idx);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (hoveredIdx === idx) setHoveredIdx(null);
  };

  const onDragEnd = () => {
    setDraggingIdx(null);
    setHoveredIdx(null);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>, idx: number) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    const fromStr = e.dataTransfer.getData('text/plain');
    const from = fromStr !== '' ? parseInt(fromStr, 10) : draggingIdx;
    if (from !== null && !isNaN(from)) {
      handleSwap(from, idx);
    }
    setDraggingIdx(null);
    setHoveredIdx(null);
  };

  const onRightPieceClick = (idx: number) => {
    if (disabled) return;
    if (selectedIdx === null) {
      setSelectedIdx(idx);
    } else if (selectedIdx === idx) {
      setSelectedIdx(null);
    } else {
      handleSwap(selectedIdx, idx);
    }
  };

  const onLeftPieceClick = (idx: number) => {
    if (disabled) return;
    if (selectedIdx !== null) {
      handleSwap(selectedIdx, idx);
    }
  };

  const matchedCount = Object.keys(currentMap).length;

  return (
    <div className="space-y-4">
      {/* Header hướng dẫn & đếm số câu đã ghép */}
      <div className="flex items-center justify-between pb-1">
        <div className="text-xs text-slate-500">
          Kéo mảnh ghép bên phải để nối với mảnh ghép bên trái (hoặc bấm chọn mảnh ghép rồi bấm vào hàng muốn nối).
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          {matchedCount} / {leftItems.length} đã ghép
        </span>
      </div>

      {/* Grid 2 cột mảnh ghép đối xứng theo đúng ảnh mẫu */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 items-start">
        
        {/* CỘT TRÁI: MẢNH CÂU HỎI (CẠNH PHẢI CÓ RÃNH LÕM NOTCH) */}
        <div className="space-y-3.5">
          {leftItems.map((left, idx) => (
            <PuzzlePiece
              key={idx}
              isLeft={true}
              text={left}
              index={idx + 1}
              isHovered={hoveredIdx === idx}
              onClick={() => onLeftPieceClick(idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDragEnter={(e) => onDragEnter(e, idx)}
              onDragLeave={(e) => onDragLeave(e, idx)}
              onDrop={(e) => onDrop(e, idx)}
            />
          ))}
        </div>

        {/* CỘT PHẢI: MẢNH ĐÁP ÁN (CẠNH TRÁI CÓ MẤU LỒI TAB/KNOB, KÉO ĐỔI TỰ DO) */}
        <div className="space-y-3.5">
          {rightOrder.map((piece, idx) => (
            <PuzzlePiece
              key={idx}
              isLeft={false}
              text={piece}
              isSelected={selectedIdx === idx}
              isHovered={hoveredIdx === idx}
              isDragging={draggingIdx === idx}
              draggable={!disabled}
              onClick={() => onRightPieceClick(idx)}
              onDragStart={(e) => onDragStart(e, idx)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => onDragOver(e, idx)}
              onDragEnter={(e) => onDragEnter(e, idx)}
              onDragLeave={(e) => onDragLeave(e, idx)}
              onDrop={(e) => onDrop(e, idx)}
            />
          ))}
        </div>

      </div>
    </div>
  );
};
