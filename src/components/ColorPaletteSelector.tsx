import React from 'react';
import { ColorPalette } from '../types/ogiri';
import { PALETTE_CONFIGS } from '../utils/ogiriLogic';
import { Palette, Check } from 'lucide-react';

interface ColorPaletteSelectorProps {
  selectedPalette: ColorPalette;
  onSelectPalette: (palette: ColorPalette) => void;
  isDark?: boolean;
}

export const ColorPaletteSelector: React.FC<ColorPaletteSelectorProps> = ({
  selectedPalette,
  onSelectPalette,
  isDark = false,
}) => {
  return (
    <section
      className={`rounded-xl border-2 p-4 sm:p-6 shadow-md transition-colors ${
        isDark
          ? 'bg-neutral-900/95 border-neutral-700 text-white'
          : 'bg-white/95 border-neutral-950 text-neutral-950'
      }`}
    >
      <div className={`border-b-2 pb-2 mb-4 ${isDark ? 'border-neutral-700' : 'border-neutral-950'}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-amber-300 text-neutral-950 px-2 py-0.5 rounded border border-neutral-900 font-black flex items-center gap-1">
            <Palette className="w-3.5 h-3.5" />
            画面デザイン設定
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-black mt-1">
          カラーパレット（背景色設定）
        </h2>
        <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
          モニター画面およびコンソール画面の背景色を選択します。「黒」を選択した場合は自動的に文字が白反転し、劇場や暗転ステージに最適なダークモードになります。
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {PALETTE_CONFIGS.map((item) => {
          const isSelected = selectedPalette === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPalette(item.id)}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer text-left select-none ${
                isSelected
                  ? isDark
                    ? 'border-amber-400 bg-neutral-800 ring-2 ring-amber-400/50 scale-102 shadow-lg'
                    : 'border-neutral-950 bg-amber-50 ring-2 ring-neutral-950 scale-102 shadow-lg'
                  : isDark
                  ? 'border-neutral-700 bg-neutral-850 hover:bg-neutral-800 hover:border-neutral-500'
                  : 'border-neutral-300 bg-white hover:bg-neutral-50 hover:border-neutral-900'
              }`}
            >
              {/* Swatch preview */}
              <div
                className="w-10 h-10 rounded-full border-2 shadow-inner flex items-center justify-center transition-transform"
                style={{
                  backgroundColor: item.bgHex,
                  borderColor: item.borderPreviewHex,
                }}
              >
                {isSelected && (
                  <Check
                    className={`w-5 h-5 font-black ${
                      item.isDark ? 'text-white' : 'text-neutral-950'
                    }`}
                  />
                )}
              </div>

              {/* Color name label */}
              <div className="text-center w-full">
                <span
                  className={`text-xs font-black block truncate ${
                    isDark ? 'text-neutral-100' : 'text-neutral-900'
                  }`}
                >
                  {item.name}
                </span>
                <span className="text-[10px] font-mono text-neutral-500 font-bold block">
                  {item.bgHex}
                </span>
              </div>

              {isSelected && (
                <span className="text-[10px] bg-amber-400 text-neutral-950 px-1.5 py-0.2 rounded font-black border border-neutral-900">
                  選択中
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
