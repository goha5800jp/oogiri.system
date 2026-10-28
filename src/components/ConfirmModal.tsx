import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = '確認',
  message,
  confirmLabel = 'はい',
  cancelLabel = 'いいえ',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-neutral-900 border-2 border-neutral-950 dark:border-neutral-700 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 text-center transform transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-amber-100 dark:bg-amber-950 border-2 border-neutral-950">
          {isDestructive ? (
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          ) : (
            <HelpCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          )}
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-black text-neutral-950 dark:text-neutral-100">
            {title}
          </h3>
          <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mt-2 leading-relaxed whitespace-pre-wrap">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl border-2 border-neutral-950 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-black text-sm cursor-pointer transition shadow-xs"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 rounded-xl border-2 border-neutral-950 font-black text-sm cursor-pointer transition shadow-xs text-white ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
