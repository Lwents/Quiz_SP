import React, { useState, useEffect, useMemo } from 'react';
import { QuestionRendererProps } from '../question.types';
import { GripVertical, Check, ArrowRightLeft, Sparkles, Unlink } from 'lucide-react';

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

  // Sinh thứ tự ngẫu nhiên ban đầu cho vế phải
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

  // Thứ tự hiển thị hiện tại của các mảnh ghép ở Cột Phải (theo từng hàng 0, 1, 2, ...)
  const [rightOrder, setRightOrder] = useState<string[]>(() => {
    // Nếu đã có đáp án lưu sẵn, sắp xếp sao cho các mảnh đã ghép khớp với vế trái tương ứng
    const order = [...initialShuffledRight];
    const usedInOrder = new Set<string>();

    leftItems.forEach((left, idx) => {
      const matched = currentMap[left];
      if (matched && order.includes(matched)) {
        order[idx] = matched;
        usedInOrder.add(matched);
      }
    });

    // Điền các mảnh chưa ghép vào các hàng còn lại
    const remaining = initialShuffledRight.filter((item) => !usedInOrder.has(item));
    let remIdx = 0;
    for (let i = 0; i < order.length; i++) {
      if (!currentMap[leftItems[i]] && remIdx < remaining.length) {
        order[i] = remaining[remIdx++];
      }
    }
    return order;
  });

  // Cập nhật lại khi câu hỏi thay đổi
  useEffect(() => {
    const order = [...initialShuffledRight];
    const usedInOrder = new Set<string>();

    leftItems.forEach((left, idx) => {
      const matched = currentMap[left];
      if (matched && order.includes(matched)) {
        order[idx] = matched;
        usedInOrder.add(matched);
      }
    });

    const remaining = initialShuffledRight.filter((item) => !usedInOrder.has(item));
    let remIdx = 0;
    for (let i = 0; i < order.length; i++) {
      if (!currentMap[leftItems[i]] && remIdx < remaining.length) {
        order[i] = remaining[remIdx++];
      }
    }
    setRightOrder(order);
  }, [question.id, initialShuffledRight]);

  // State hỗ trợ kéo thả & click-to-swap
  const [draggingRow, setDraggingRow] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  // Xử lý hoán đổi hoặc ghép mảnh
  const handleSwapOrAssign = (fromRow: number, toRow: number) => {
    if (disabled) return;

    const pieceFrom = rightOrder[fromRow];
    const pieceTo = rightOrder[toRow];

    const nextOrder = [...rightOrder];
    nextOrder[fromRow] = pieceTo;
    nextOrder[toRow] = pieceFrom;
    setRightOrder(nextOrder);

    const nextMap = { ...currentMap };

    // Vế đích toRow nhận mảnh pieceFrom
    if (toRow < leftItems.length) {
      nextMap[leftItems[toRow]] = pieceFrom;
    }

    // Nếu khác hàng:
    if (fromRow !== toRow) {
      if (fromRow < leftItems.length) {
        // Nếu hàng cũ đã được ghép từ trước, hàng cũ nhận mảnh pieceTo (hoán đổi 2 câu)
        if (currentMap[leftItems[fromRow]]) {
          nextMap[leftItems[fromRow]] = pieceTo;
        } else {
          delete nextMap[leftItems[fromRow]];
        }
      }
    } else {
      // Bấm hoặc thả ngay trên cùng 1 hàng: xác nhận ghép cho hàng đó
      if (toRow < leftItems.length) {
        nextMap[leftItems[toRow]] = pieceFrom;
      }
    }

    onChange(nextMap);
    setDraggingRow(null);
    setHoveredRow(null);
    setSelectedRow(null);
  };

  // Ngắt kết nối 1 hàng nếu muốn đưa về chưa ghép
  const handleUncouple = (rowIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || rowIdx >= leftItems.length) return;
    const nextMap = { ...currentMap };
    delete nextMap[leftItems[rowIdx]];
    onChange(nextMap);
  };

  // Drag & Drop handlers
  const onDragStart = (e: React.DragEvent, rowIdx: number) => {
    if (disabled) return;
    setDraggingRow(rowIdx);
    e.dataTransfer.setData('text/plain', String(rowIdx));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, rowIdx: number) => {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (hoveredRow !== rowIdx) {
      setHoveredRow(rowIdx);
    }
  };

  const onDragLeave = (_e: React.DragEvent, rowIdx: number) => {
    if (hoveredRow === rowIdx) {
      setHoveredRow(null);
    }
  };

  const onDrop = (e: React.DragEvent, rowIdx: number) => {
    if (disabled) return;
    e.preventDefault();
    const fromStr = e.dataTransfer.getData('text/plain');
    const fromIdx = fromStr !== '' ? parseInt(fromStr, 10) : draggingRow;
    if (fromIdx !== null && !isNaN(fromIdx)) {
      handleSwapOrAssign(fromIdx, rowIdx);
    }
    setDraggingRow(null);
    setHoveredRow(null);
  };

  const onRightPieceClick = (rowIdx: number) => {
    if (disabled) return;
    if (selectedRow === null) {
      setSelectedRow(rowIdx);
    } else if (selectedRow === rowIdx) {
      setSelectedRow(null);
    } else {
      handleSwapOrAssign(selectedRow, rowIdx);
    }
  };

  const onRowContainerClick = (rowIdx: number) => {
    if (disabled) return;
    if (selectedRow !== null) {
      handleSwapOrAssign(selectedRow, rowIdx);
    }
  };

  const maxRows = Math.max(leftItems.length, rightOrder.length);
  const matchedCount = Object.keys(currentMap).length;

  return (
    <div className="space-y-4 select-none">
      {/* Hướng dẫn thao tác */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <ArrowRightLeft className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="truncate">
            <strong>Kéo thả ngang & Đổi câu tự do:</strong> Kéo mảnh ghép ở cột phải thả sang vế trái. Nếu kéo nhầm câu, bạn chỉ cần kéo mảnh ghép thả sang câu khác để tự động hoán đổi!
          </span>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shrink-0 ml-2">
          {matchedCount} / {leftItems.length} đã ghép
        </span>
      </div>

      {/* Tiêu đề 2 cột */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
        <div className="md:col-span-5 flex items-center justify-between">
          <span>Vế 1 (Nội dung câu hỏi)</span>
        </div>
        <div className="hidden md:flex md:col-span-2 items-center justify-center text-[11px] text-slate-400 font-medium lowercase">
          khớp nối
        </div>
        <div className="md:col-span-5 flex items-center justify-between">
          <span>Vế 2 (Mảnh ghép đáp án)</span>
          <span className="text-[11px] lowercase text-slate-400 font-normal">Kéo để đổi</span>
        </div>
      </div>

      {/* Danh sách từng hàng puzzle đối xứng ngang hàng */}
      <div className="space-y-3">
        {Array.from({ length: maxRows }).map((_, idx) => {
          const leftItem = leftItems[idx];
          const rightPiece = rightOrder[idx];

          const isMatched = leftItem ? Boolean(currentMap[leftItem] && currentMap[leftItem] === rightPiece) : false;
          const isHovered = hoveredRow === idx;
          const isSelected = selectedRow === idx;

          return (
            <div
              key={idx}
              onClick={() => onRowContainerClick(idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDragLeave={(e) => onDragLeave(e, idx)}
              onDrop={(e) => onDrop(e, idx)}
              className={`grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 items-center p-2 sm:p-2.5 rounded-2xl transition-all duration-200 border-2 ${
                isHovered
                  ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-400/20'
                  : isMatched
                  ? 'border-blue-300 bg-blue-50/15 shadow-2xs'
                  : isSelected
                  ? 'border-dashed border-blue-400 bg-blue-50/10'
                  : 'border-slate-200/80 bg-slate-50/30 hover:border-slate-300'
              }`}
            >
              {/* CỘT TRÁI (5 cols): MẢNH GHI NỘI DUNG (CÓ RÃNH LÕM 凹 Ở CẠNH PHẢI) */}
              <div className="md:col-span-5">
                {leftItem ? (
                  <div
                    className={`relative flex items-center justify-between p-3.5 rounded-xl border transition-all min-h-[56px] shadow-2xs ${
                      isMatched
                        ? 'border-blue-400 bg-white text-blue-950 shadow-xs'
                        : 'border-slate-300 bg-white text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 pr-4 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border ${
                          isMatched
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold leading-relaxed break-words">
                        {leftItem}
                      </span>
                    </div>

                    {/* Rãnh lõm hình bán nguyệt 凹 ở cạnh phải mảnh trái */}
                    <div className="absolute -right-[2px] top-1/2 -translate-y-1/2 w-4 h-7 flex items-center justify-center z-10 pointer-events-none">
                      <div
                        className={`w-3.5 h-6 rounded-l-full border-y-2 border-l-2 transition-colors ${
                          isMatched
                            ? 'bg-blue-100 border-blue-500'
                            : isHovered
                            ? 'bg-blue-50 border-blue-400'
                            : 'bg-slate-100 border-slate-300'
                        }`}
                      />
                    </div>
                  </div>
                ) : (
                  <div />
                )}
              </div>

              {/* KHỚP NỐI Ở GIỮA (2 cols): TRẠNG THÁI LIÊN KẾT PUZZLE */}
              <div className="hidden md:flex md:col-span-2 items-center justify-center px-1">
                {isMatched ? (
                  <div
                    onClick={(e) => handleUncouple(idx, e)}
                    title="Bấm để hủy ghép hàng này"
                    className="group flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 border border-blue-300 text-blue-800 text-[11px] font-bold cursor-pointer hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5 text-blue-600 group-hover:hidden" />
                    <Unlink className="w-3.5 h-3.5 text-rose-600 hidden group-hover:inline" />
                    <span className="group-hover:hidden">Đã khớp</span>
                    <span className="hidden group-hover:inline">Tách rời</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-slate-300 text-[11px] font-medium">
                    <span className="w-3 h-0.5 bg-slate-300 rounded" />
                    <span className="text-slate-400 text-xs">⇄</span>
                    <span className="w-3 h-0.5 bg-slate-300 rounded" />
                  </div>
                )}
              </div>

              {/* CỘT PHẢI (5 cols): MẢNH GHÉP ĐÁP ÁN (CÓ CHỐT LỒI 凸 Ở CẠNH TRÁI, TỰ DO KÉO THẢ) */}
              <div className="md:col-span-5">
                {rightPiece ? (
                  <div
                    draggable={!disabled}
                    onDragStart={(e) => onDragStart(e, idx)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRightPieceClick(idx);
                    }}
                    className={`relative flex items-center justify-between p-3.5 rounded-xl border-2 transition-all min-h-[56px] cursor-grab active:cursor-grabbing shadow-2xs select-none ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md ring-2 ring-blue-400/50 scale-[1.01]'
                        : isMatched
                        ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50/70 text-blue-950 hover:border-blue-500'
                        : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50/30 text-slate-800'
                    }`}
                  >
                    {/* Chốt lồi hình bán nguyệt 凸 ở cạnh trái mảnh phải */}
                    <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-4 h-7 flex items-center justify-center z-10 pointer-events-none">
                      <div
                        className={`w-3.5 h-6 rounded-l-full border-y-2 border-l-2 shadow-2xs transition-colors ${
                          isSelected
                            ? 'bg-blue-600 border-white text-white'
                            : isMatched
                            ? 'bg-blue-500 border-blue-600 text-white'
                            : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-2.5 pl-2 min-w-0">
                      <GripVertical
                        className={`w-4 h-4 shrink-0 ${
                          isSelected
                            ? 'text-white/80'
                            : isMatched
                            ? 'text-blue-500'
                            : 'text-slate-400'
                        }`}
                      />
                      <span className="text-xs sm:text-sm font-bold break-words leading-relaxed">
                        {rightPiece}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ml-1 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isMatched
                          ? 'bg-blue-200/70 text-blue-900'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isSelected ? 'Đang chọn' : isMatched ? 'Khớp' : 'Kéo'}
                    </span>
                  </div>
                ) : (
                  <div />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
