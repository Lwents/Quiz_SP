import React, { useState, useMemo, useRef, useCallback } from 'react';
import { QuestionRendererProps } from '../question.types';
import { GripVertical } from 'lucide-react';

/**
 * Giao diện ghép nối dạng kéo-thả đơn giản, sạch sẽ:
 * - Mỗi hàng gồm: [Vế trái bo tròn] ... [Vế phải bo tròn kéo thả]
 * - Cột trái và cột phải ngang hàng nhau
 * - Kéo mảnh từ cột phải vào cột trái để ghép nối
 * - Hỗ trợ cả click-to-match và touch drag cho mobile
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

  // Xáo trộn thứ tự mảnh bên phải (deterministic shuffle)
  const shuffledRight = useMemo(() => {
    const items = [...rightItems];
    if (items.length > 1) {
      let seed = 0;
      const str = String(question.id || 'match');
      for (let i = 0; i < str.length; i++) {
        seed = (seed + str.charCodeAt(i) * (i + 1)) % 10007;
      }
      for (let i = items.length - 1; i > 0; i--) {
        const j = (seed + i * 37) % (i + 1);
        [items[i], items[j]] = [items[j], items[i]];
      }
    }
    return items;
  }, [question.id, rightItems]);

  const [draggedPiece, setDraggedPiece] = useState<string | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  // Touch drag
  const touchRef = useRef<{
    piece: string;
    ghost: HTMLDivElement | null;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const assignedSet = new Set(Object.values(currentMap));
  const matchedCount = Object.keys(currentMap).length;

  // === Core logic ===
  const doAssign = useCallback((leftKey: string, piece: string) => {
    if (disabled) return;
    const next = { ...currentMap };
    // Nếu mảnh đã gắn ở câu khác -> hoán đổi
    const oldLeft = Object.keys(next).find(k => next[k] === piece);
    const existing = next[leftKey];
    if (oldLeft && oldLeft !== leftKey) {
      if (existing) {
        next[oldLeft] = existing;
      } else {
        delete next[oldLeft];
      }
    }
    next[leftKey] = piece;
    onChange(next);
    setDraggedPiece(null);
    setSelectedPiece(null);
    setHoveredSlot(null);
  }, [disabled, currentMap, onChange]);

  const doUnassign = useCallback((piece: string) => {
    if (disabled) return;
    const next = { ...currentMap };
    for (const k of Object.keys(next)) {
      if (next[k] === piece) delete next[k];
    }
    onChange(next);
    setDraggedPiece(null);
    setSelectedPiece(null);
    setHoveredSlot(null);
  }, [disabled, currentMap, onChange]);

  // === HTML5 Drag & Drop ===
  const onDragStart = (e: React.DragEvent, piece: string) => {
    if (disabled) return;
    setDraggedPiece(piece);
    e.dataTransfer.setData('text/plain', piece);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnd = () => {
    setDraggedPiece(null);
    setHoveredSlot(null);
  };

  // === Touch events (mobile) ===
  const onTouchStart = useCallback((e: React.TouchEvent, piece: string) => {
    if (disabled) return;
    const t = e.touches[0];
    touchRef.current = { piece, ghost: null, startX: t.clientX, startY: t.clientY, active: false };
  }, [disabled]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const td = touchRef.current;
    if (!td) return;
    const t = e.touches[0];
    const dist = Math.sqrt((t.clientX - td.startX) ** 2 + (t.clientY - td.startY) ** 2);
    if (!td.active && dist > 5) {
      td.active = true;
      setDraggedPiece(td.piece);
      const g = document.createElement('div');
      g.textContent = td.piece;
      g.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;background:#eff6ff;border:2px solid #3b82f6;border-radius:12px;padding:6px 14px;font-size:13px;font-weight:600;color:#1e3a5f;box-shadow:0 4px 16px rgba(0,0,0,0.12);transform:translate(-50%,-50%);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      document.body.appendChild(g);
      td.ghost = g;
    }
    if (td.active && td.ghost) {
      e.preventDefault();
      td.ghost.style.left = t.clientX + 'px';
      td.ghost.style.top = t.clientY + 'px';
      const el = document.elementFromPoint(t.clientX, t.clientY);
      let found = false;
      slotRefs.current.forEach((slotEl, key) => {
        if (slotEl.contains(el)) { setHoveredSlot(key); found = true; }
      });
      if (!found) setHoveredSlot(null);
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const td = touchRef.current;
    if (!td) return;
    if (td.ghost) document.body.removeChild(td.ghost);
    if (td.active) {
      const t = e.changedTouches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      let dropped = false;
      slotRefs.current.forEach((slotEl, key) => {
        if (slotEl.contains(el)) { doAssign(key, td.piece); dropped = true; }
      });
      if (!dropped) setDraggedPiece(null);
      setHoveredSlot(null);
    }
    touchRef.current = null;
  }, [doAssign]);

  // === Click-to-match ===
  const onPieceClick = (piece: string) => {
    if (disabled) return;
    setSelectedPiece(selectedPiece === piece ? null : piece);
  };

  const onSlotClick = (left: string) => {
    if (disabled) return;
    if (selectedPiece) {
      doAssign(left, selectedPiece);
    } else if (currentMap[left]) {
      setSelectedPiece(currentMap[left]);
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* Hướng dẫn */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Kéo mảnh ghép bên phải để nối với mảnh ghép bên trái (hoặc bấm chọn mảnh ghép rồi bấm vào hàng muốn nối).
        </p>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap ml-3">
          {matchedCount} / {leftItems.length} đã ghép
        </span>
      </div>

      {/* Bảng ghép nối 2 cột ngang hàng */}
      <div className="space-y-3">
        {leftItems.map((left, idx) => {
          const matched = currentMap[left];
          const isHover = hoveredSlot === left;
          const isActive = Boolean(selectedPiece) || Boolean(draggedPiece);

          return (
            <div
              key={idx}
              ref={el => { if (el) slotRefs.current.set(left, el); else slotRefs.current.delete(left); }}
              onDragEnter={e => { if (!disabled) { e.preventDefault(); e.stopPropagation(); setHoveredSlot(left); } }}
              onDragOver={e => { if (!disabled) { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setHoveredSlot(left); } }}
              onDragLeave={e => {
                const rel = e.relatedTarget as Node | null;
                if (e.currentTarget instanceof HTMLElement && rel && e.currentTarget.contains(rel)) return;
                if (hoveredSlot === left) setHoveredSlot(null);
              }}
              onDrop={e => {
                if (disabled) return;
                e.preventDefault(); e.stopPropagation();
                const p = e.dataTransfer.getData('text/plain') || draggedPiece;
                if (p) doAssign(left, p);
                setHoveredSlot(null);
              }}
              onClick={() => onSlotClick(left)}
              className={`flex items-center gap-3 sm:gap-4 p-1 rounded-xl transition-all duration-150 cursor-pointer ${
                isHover ? 'bg-blue-50/60 ring-2 ring-blue-400 shadow-sm' : ''
              }`}
            >
              {/* Vế trái */}
              <div className={`flex items-center gap-3 flex-1 min-w-0 px-4 py-3.5 rounded-xl border transition-colors ${
                matched
                  ? 'bg-blue-50/50 border-blue-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}>
                <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200">
                  {idx + 1}
                </span>
                <span className="text-sm font-medium text-slate-800 leading-snug line-clamp-2">
                  {left}
                </span>
              </div>

              {/* Vế phải: mảnh đã ghép hoặc placeholder */}
              {matched ? (
                <div
                  draggable={!disabled}
                  onDragStart={e => { e.stopPropagation(); onDragStart(e, matched); }}
                  onDragEnd={onDragEnd}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setHoveredSlot(left); }}
                  onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setHoveredSlot(left); }}
                  onDrop={e => {
                    e.preventDefault(); e.stopPropagation();
                    const p = e.dataTransfer.getData('text/plain') || draggedPiece;
                    if (p && p !== matched) doAssign(left, p);
                    setHoveredSlot(null);
                  }}
                  onClick={e => { e.stopPropagation(); onPieceClick(matched); }}
                  onTouchStart={e => onTouchStart(e, matched)}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  className={`flex items-center justify-between flex-1 min-w-0 px-4 py-3.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all ${
                    selectedPiece === matched
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400 shadow-sm'
                      : 'bg-blue-50/50 border-blue-300 hover:border-blue-400'
                  } ${draggedPiece === matched ? 'opacity-40' : ''}`}
                >
                  <span className="text-sm font-semibold text-blue-900 leading-snug line-clamp-2">
                    {matched}
                  </span>
                  <GripVertical className="w-4 h-4 text-blue-400 shrink-0 ml-2" />
                </div>
              ) : (
                <div className={`flex items-center justify-center flex-1 min-w-0 px-4 py-3.5 rounded-xl border-2 border-dashed transition-colors ${
                  isHover
                    ? 'border-blue-400 bg-blue-50/50 text-blue-500'
                    : isActive
                    ? 'border-blue-300 bg-blue-50/30 text-blue-400'
                    : 'border-slate-200 bg-slate-50/30 text-slate-400'
                }`}>
                  <span className="text-xs font-medium">
                    {isHover ? 'Thả vào đây' : isActive ? 'Bấm để nối' : 'Kéo đáp án vào đây'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Khay mảnh ghép bên phải chưa dùng */}
      {shuffledRight.some(p => !assignedSet.has(p)) && (
        <div className="pt-2">
          <p className="text-xs font-semibold text-slate-500 mb-2.5 uppercase tracking-wider">Đáp án</p>
          <div className="flex flex-wrap gap-2.5">
            {shuffledRight.map((piece, idx) => {
              const used = assignedSet.has(piece);
              if (used) return null;

              return (
                <div
                  key={idx}
                  draggable={!disabled}
                  onDragStart={e => onDragStart(e, piece)}
                  onDragEnd={onDragEnd}
                  onClick={() => onPieceClick(piece)}
                  onTouchStart={e => onTouchStart(e, piece)}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border cursor-grab active:cursor-grabbing transition-all select-none ${
                    selectedPiece === piece
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400 shadow-sm scale-[1.02]'
                      : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-xs'
                  } ${draggedPiece === piece ? 'opacity-40' : ''}`}
                >
                  <span className="text-sm font-semibold text-slate-800 leading-snug">
                    {piece}
                  </span>
                  <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
