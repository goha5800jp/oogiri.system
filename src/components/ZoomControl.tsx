import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ZoomControlProps {
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  className?: string;
  isDark?: boolean;
}

export const ZoomControl: React.FC<ZoomControlProps> = ({
  zoom,
  onZoomChange,
  className = '',
  isDark = false,
}) => {
  const handleZoomIn = () => {
    onZoomChange(Math.min(2.0, Math.round((zoom + 0.1) * 10) / 10));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(0.6, Math.round((zoom - 0.1) * 10) / 10));
  };

  const handleReset = () => {
    onZoomChange(1.0);
  };

  const percent = Math.round(zoom * 100);

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border-2 shadow-md select-none z-50 ${
        isDark
          ? 'bg-neutral-900/95 border-neutral-600 text-white'
          : 'bg-white/95 border-neutral-950 text-neutral-950'
      } ${className}`}
      title="画面表示の拡大・縮小（この画面のみ適用）"
    >
      <span
        className={`text-[11px] font-black mr-0.5 hidden xs:inline ${
          isDark ? 'text-neutral-400' : 'text-neutral-600'
        }`}
      >
        表示倍率:
      </span>

      <button
        type="button"
        onClick={handleZoomOut}
        disabled={zoom <= 0.6}
        aria-label="画面表示を縮小"
        className={`w-6 h-6 rounded disabled:opacity-30 border flex items-center justify-center cursor-pointer disabled:cursor-not-allowed transition ${
          isDark
            ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-600 text-white'
            : 'bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 border-neutral-900 text-neutral-950'
        }`}
        title="縮小 (-10%)"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={handleReset}
        className={`px-1.5 py-0.5 text-xs font-mono font-black rounded border cursor-pointer transition min-w-[42px] text-center ${
          isDark
            ? 'hover:bg-neutral-800 border-neutral-600 text-white'
            : 'hover:bg-amber-100 border-neutral-400 text-neutral-950'
        }`}
        title="100%にリセット"
      >
        {percent}%
      </button>

      <button
        type="button"
        onClick={handleZoomIn}
        disabled={zoom >= 2.0}
        aria-label="画面表示を拡大"
        className={`w-6 h-6 rounded disabled:opacity-30 border flex items-center justify-center cursor-pointer disabled:cursor-not-allowed transition ${
          isDark
            ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-600 text-white'
            : 'bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 border-neutral-900 text-neutral-950'
        }`}
        title="拡大 (+10%)"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

