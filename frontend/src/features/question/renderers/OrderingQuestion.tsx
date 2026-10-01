import React from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { QuestionRendererProps } from '../question.types';

interface SortableItemProps {
  id: string;
  item: string;
  index: number;
  count: number;
  disabled?: boolean;
  moveItem: (from: number, to: number) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, item, index, count, disabled, moveItem }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center justify-between bg-white border rounded-xl shadow-xs transition-colors ${
        isDragging ? 'border-blue-500 shadow-lg z-10 relative' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Kéo để sắp xếp mục ${index + 1}: ${item}`}
        style={{ touchAction: 'none' }}
        className={`flex min-w-0 flex-1 items-center gap-3 p-3.5 ${disabled ? '' : 'cursor-grab active:cursor-grabbing'}`}
      >
        <GripVertical className="w-4 h-4 shrink-0 text-slate-400" aria-hidden="true" />
        <span className="w-6 h-6 shrink-0 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <span className="font-medium text-slate-800 text-sm">{item}</span>
      </div>
      <div className="flex items-center gap-1 pr-3">
        <button
          type="button"
          disabled={disabled || index === 0}
          onClick={() => moveItem(index, index - 1)}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          title="Di chuyển lên"
          aria-label={`Di chuyển mục ${index + 1} lên`}
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={disabled || index === count - 1}
          onClick={() => moveItem(index, index + 1)}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          title="Di chuyển xuống"
          aria-label={`Di chuyển mục ${index + 1} xuống`}
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const OrderingQuestion: React.FC<QuestionRendererProps> = ({ question, value, onChange, disabled }) => {
  const initialItems: string[] = question.config?.items || question.config?.correct_order || [];
  const currentList: string[] = Array.isArray(value) && value.length === initialItems.length ? value : initialItems;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Repeated labels need distinct drag IDs; the submitted answer stays a string array.
  const seen = new Map<string, number>();
  const entries = currentList.map((item) => {
    const occurrence = seen.get(item) ?? 0;
    seen.set(item, occurrence + 1);
    return { id: `${item}\u0000${occurrence}`, item };
  });

  const moveItem = (from: number, to: number) => {
    if (disabled || to < 0 || to >= currentList.length) return;
    onChange(arrayMove(currentList, from, to));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (disabled || !over || active.id === over.id) return;
    const from = entries.findIndex((entry) => entry.id === active.id);
    const to = entries.findIndex((entry) => entry.id === over.id);
    if (from >= 0 && to >= 0) moveItem(from, to);
  };

  return (
    <div className="max-w-xl">
      <p className="text-xs text-slate-500 mb-3">Kéo thả các mục theo thứ tự từ trên xuống dưới. Bạn cũng có thể dùng nút mũi tên hoặc bàn phím.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={entries.map((entry) => entry.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {entries.map((entry, index) => (
              <SortableItem
                key={entry.id}
                id={entry.id}
                item={entry.item}
                index={index}
                count={entries.length}
                disabled={disabled}
                moveItem={moveItem}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
