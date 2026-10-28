import React, { useState } from 'react';
import { Participant } from '../types/ogiri';
import { GripHorizontal, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { reorderList } from '../utils/ogiriLogic';

interface ParticipantOrderListProps {
  participants: Participant[];
  onReorder: (newOrderIds: number[]) => void;
}

export const ParticipantOrderList: React.FC<ParticipantOrderListProps> = ({
  participants,
  onReorder,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (participants.length === 0) {
    return (
      <div className="p-4 bg-amber-50/80 border-2 border-dashed border-neutral-400 rounded-lg text-center text-neutral-600 font-bold">
        現在「参加している」に設定されている参加者はいません。「参加状況」でONにしてください。
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    // Only clear if needed
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (draggedIndex !== dropIndex) {
      const currentIds = participants.map((p) => p.id);
      const newIds = reorderList(currentIds, draggedIndex, dropIndex);
      onReorder(newIds);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveLeft = (index: number) => {
    if (index > 0) {
      const currentIds = participants.map((p) => p.id);
      const newIds = reorderList(currentIds, index, index - 1);
      onReorder(newIds);
    }
  };

  const moveRight = (index: number) => {
    if (index < participants.length - 1) {
      const currentIds = participants.map((p) => p.id);
      const newIds = reorderList(currentIds, index, index + 1);
      onReorder(newIds);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-neutral-700">
          ※ 各ボックスをドラッグ＆ドロップしてモニター表示順（左から右）を並べ替えます
        </span>
        <span className="text-xs font-bold text-neutral-900 bg-amber-200/90 px-2 py-0.5 rounded border border-neutral-900">
          並び順：全 {participants.length} 名
        </span>
      </div>

      <div className="flex items-stretch gap-3 overflow-x-auto pb-4 pt-1 px-1 min-h-[110px] scrollbar-thin">
        {participants.map((p, index) => {
          const isDragging = draggedIndex === index;
          const isOver = dragOverIndex === index;

          return (
            <div
              key={p.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex-shrink-0 flex flex-col items-center justify-between w-36 sm:w-40 p-2.5 rounded-lg border-2 select-none transition-all duration-150 cursor-grab active:cursor-grabbing bg-white ${
                isDragging
                  ? 'opacity-40 scale-95 border-amber-500 shadow-none'
                  : isOver
                  ? 'border-blue-600 ring-2 ring-blue-400 scale-105 shadow-lg'
                  : 'border-neutral-950 shadow-md hover:shadow-lg hover:border-neutral-800'
              }`}
            >
              <div className="w-full flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-xs font-black text-neutral-900 bg-amber-200 border border-neutral-900 rounded-full w-5 h-5 flex items-center justify-center">
                  {index + 1}
                </span>
                <GripHorizontal className="w-4 h-4 text-neutral-700 hover:text-neutral-950" />
              </div>

              {/* Avatar Icon */}
              <div className="w-12 h-12 rounded-full border-2 border-neutral-900 overflow-hidden flex items-center justify-center bg-amber-100 mb-1.5 flex-shrink-0 shadow-inner">
                {p.avatarUrl ? (
                  <img
                    src={p.avatarUrl}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-7 h-7 text-neutral-800" />
                )}
              </div>

              {/* Name */}
              <div
                className="text-center font-bold text-sm text-neutral-950 w-full truncate px-1 mb-2"
                title={p.name}
              >
                {p.name}
              </div>

              {/* Quick shift buttons for accessibility / fine adjustment */}
              <div className="flex items-center justify-between w-full border-t border-neutral-200 pt-1">
                <button
                  type="button"
                  aria-label={`${p.name}を左に移動`}
                  onClick={() => moveLeft(index)}
                  disabled={index === 0}
                  className="p-1 rounded text-neutral-800 hover:bg-amber-100 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-black text-neutral-500">
                  #{p.id}
                </span>
                <button
                  type="button"
                  aria-label={`${p.name}を右に移動`}
                  onClick={() => moveRight(index)}
                  disabled={index === participants.length - 1}
                  className="p-1 rounded text-neutral-800 hover:bg-amber-100 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
