import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { QuestionRendererProps } from '../question.types';
import { GripVertical } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { CollisionDetection } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

/*
 * Component Matching SVG Puzzle Piece:
 * Vẽ mảnh ghép với ngàm tròn kiểu jigsaw puzzle:
 * - isLeft: cạnh phải có ngàm khuyết lõm vào trong (notch)
 * - !isLeft: cạnh trái có mấu nhô lồi ra ngoài (tab/knob)
 */
interface PuzzlePieceProps {
  isLeft: boolean;
  text: string;
  pieceWidth: number;
  index?: number;
  isSelected?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  onClick?: () => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  draggable?: boolean;
}

const PuzzlePiece: React.FC<PuzzlePieceProps> = ({
  isLeft,
  text,
  pieceWidth,
  index,
  isSelected,
  isHovered,
  isDragging,
  onClick,
  onContextMenu,
  draggable
}) => {
  const rightEdge = pieceWidth - 2;
  const notchEdge = pieceWidth - 10;

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`relative w-full h-[64px] select-none transition-all duration-150 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${isSelected ? 'scale-[1.02] filter drop-shadow-md' : 'hover:drop-shadow-xs'} ${
        isDragging ? 'opacity-40' : 'opacity-100'
      }`}
    >
      {/* SVG Background Puzzle shape */}
      <svg
        viewBox={`0 0 ${pieceWidth} 64`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {isLeft ? (
          /* MẢNH TRÁI: cạnh phải có rãnh khuyết tròn */
          <path
            d={`M 2 2 H ${rightEdge} V 20 H ${notchEdge} A 12 12 0 0 0 ${notchEdge} 44 H ${rightEdge} V 62 H 2 Z`}
            strokeLinejoin="round"
            className={`transition-colors duration-150 ${
              isHovered
                ? 'fill-blue-50/80 stroke-blue-500 stroke-2'
                : 'fill-white stroke-slate-300 stroke-[1.5]'
            }`}
          />
        ) : (
          /* MẢNH PHẢI: cạnh trái có mấu nhô tròn */
          <path
            d={`M 22 2 H ${rightEdge} V 62 H 22 V 44 H 14 A 12 12 0 0 1 14 20 H 22 V 2 Z`}
            strokeLinejoin="round"
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
          isLeft ? 'pr-8' : 'pl-8'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {index !== undefined && (
            <span className="w-6 h-6 rounded-none bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
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

const LeftPiece: React.FC<{
  text: string;
  index: number;
  pieceWidth: number;
  disabled?: boolean;
  onClick: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}> = ({ text, index, pieceWidth, disabled, onClick, onContextMenu }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `left-${index}`, disabled });
  return (
    <div ref={setNodeRef}>
      <PuzzlePiece
        isLeft
        text={text}
        pieceWidth={pieceWidth}
        index={index + 1}
        isHovered={isOver}
        onClick={onClick}
        onContextMenu={onContextMenu}
      />
    </div>
  );
};

const RightPiece: React.FC<{
  text: string;
  index: number;
  pieceWidth: number;
  disabled?: boolean;
  selected: boolean;
  matched: boolean;
  onClick: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}> = ({ text, index, pieceWidth, disabled, selected, matched, onClick, onContextMenu }) => {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `right-${index}`, disabled });
  const { setNodeRef: setDragRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: `piece-${index}`,
    disabled,
  });

  return (
    <div ref={setDropRef} className={matched ? 'matching-piece-connected' : undefined}>
      <div
        ref={setDragRef}
        {...attributes}
        {...listeners}
        onClick={onClick}
        onContextMenu={onContextMenu}
        title={matched ? 'Nhấn chuột phải để gỡ ghép' : undefined}
        style={{ transform: CSS.Translate.toString(transform), touchAction: 'none' }}
        className={isDragging ? 'relative z-20' : undefined}
      >
        <PuzzlePiece
          isLeft={false}
          text={text}
          pieceWidth={pieceWidth}
          isSelected={selected}
          isHovered={isOver}
          isDragging={isDragging}
          draggable={!disabled}
        />
      </div>
    </div>
  );
};

const orderFromAnswers = (
  leftItems: string[],
  shuffledRight: string[],
  answers: Record<string, string>
): string[] => {
  const order = Array<string | undefined>(shuffledRight.length).fill(undefined);
  const used = new Set<string>();

  leftItems.forEach((left, index) => {
    const right = answers[left];
    if (index < order.length && shuffledRight.includes(right) && !used.has(right)) {
      order[index] = right;
      used.add(right);
    }
  });

  const remaining = shuffledRight.filter((right) => !used.has(right));
  return order.map((right) => right ?? remaining.shift()!);
};

// Ưu tiên ô bên trái khi mảnh kéo chạm vào nó; con trỏ có thể vẫn nằm ở nửa phải.
const matchingCollision: CollisionDetection = (args) => {
  const initial = args.active.rect.current.initial;
  const movingLeft = initial && args.collisionRect.left < initial.left - 20;
  const leftTargets = args.droppableContainers.filter((container) =>
    String(container.id).startsWith('left-')
  );
  const touchingLeft = movingLeft
    ? rectIntersection({ ...args, droppableContainers: leftTargets })
    : [];
  return touchingLeft.length > 0 ? touchingLeft : pointerWithin(args);
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
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const [pieceWidth, setPieceWidth] = useState(320);

  useLayoutEffect(() => {
    const element = leftColumnRef.current;
    if (!element) return;
    const measure = () => setPieceWidth(element.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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
  const [rightOrder, setRightOrder] = useState<string[]>(() =>
    orderFromAnswers(leftItems, initialShuffledRight, currentMap)
  );

  useEffect(() => {
    setRightOrder(orderFromAnswers(leftItems, initialShuffledRight, currentMap));
  }, [leftItems, initialShuffledRight, currentMap]);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Hoán đổi vị trí của 2 mảnh ghép ở cột phải
  const handleSwap = (fromIdx: number, toIdx: number, matchLeft = false) => {
    if (disabled || !rightOrder[fromIdx] || !leftItems[toIdx]) return;
    const newOrder = [...rightOrder];
    if (fromIdx !== toIdx) {
      [newOrder[fromIdx], newOrder[toIdx]] = [newOrder[toIdx], newOrder[fromIdx]];
      setRightOrder(newOrder);
    }

    if (matchLeft) {
      const nextMap = { ...currentMap };
      const right = rightOrder[fromIdx];
      Object.keys(nextMap).forEach((left) => {
        if (nextMap[left] === right) delete nextMap[left];
      });
      nextMap[leftItems[toIdx]] = right;
      onChange(nextMap);
    }

    setSelectedIdx(null);
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
      handleSwap(selectedIdx, idx, true);
    }
  };

  const removeMatch = (left?: string) => {
    if (disabled) return;
    setSelectedIdx(null);
    if (left && currentMap[left]) {
      const nextMap = { ...currentMap };
      delete nextMap[left];
      onChange(nextMap);
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
      <DndContext
        sensors={sensors}
        collisionDetection={matchingCollision}
        onDragEnd={({ active, over }) => {
          if (!over || disabled) return;
          const from = Number(String(active.id).replace('piece-', ''));
          const to = Number(String(over.id).replace(/^(left|right)-/, ''));
          if (Number.isInteger(from) && Number.isInteger(to)) {
            handleSwap(from, to, String(over.id).startsWith('left-'));
          }
        }}
      >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 items-start">
        
        {/* CỘT TRÁI: MẢNH CÂU HỎI (CẠNH PHẢI CÓ RÃNH LÕM NOTCH) */}
        <div ref={leftColumnRef} className="space-y-3.5">
          {leftItems.map((left, idx) => (
            <LeftPiece
              key={idx}
              text={left}
              index={idx}
              pieceWidth={pieceWidth}
              disabled={disabled}
              onClick={() => onLeftPieceClick(idx)}
              onContextMenu={(event) => {
                event.preventDefault();
                removeMatch(left);
              }}
            />
          ))}
        </div>

        {/* CỘT PHẢI: MẢNH ĐÁP ÁN (CẠNH TRÁI CÓ MẤU LỒI TAB/KNOB, KÉO ĐỔI TỰ DO) */}
        <div className="space-y-3.5">
          {rightOrder.map((piece, idx) => (
            <RightPiece
              key={idx}
              text={piece}
              index={idx}
              pieceWidth={pieceWidth}
              selected={selectedIdx === idx}
              matched={currentMap[leftItems[idx]] === piece}
              disabled={disabled}
              onClick={() => onRightPieceClick(idx)}
              onContextMenu={(event) => {
                event.preventDefault();
                removeMatch(Object.keys(currentMap).find((left) => currentMap[left] === piece));
              }}
            />
          ))}
        </div>

      </div>
      </DndContext>
    </div>
  );
};
