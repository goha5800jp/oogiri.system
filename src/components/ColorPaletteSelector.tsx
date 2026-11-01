import React, { useRef } from 'react';
import { ColorPalette, TopicFontFamily, BgPattern } from '../types/ogiri';
import { PALETTE_CONFIGS, TOPIC_FONT_OPTIONS } from '../utils/ogiriLogic';
import { Palette, Check, Image as ImageIcon, Upload, Trash2, Sliders, Type, Sparkles, Ban, Grid, CircleDot } from 'lucide-react';
import { Switch } from './Switch';

interface ColorPaletteSelectorProps {
  selectedPalette: ColorPalette;
  onSelectPalette: (palette: ColorPalette) => void;
  isDark?: boolean;
  customBgUrl?: string;
  bgScale?: number;
  bgOpacity?: number;
  bgBrightness?: number;
  onUploadBgImage?: (dataUrl: string) => void;
  onRemoveBgImage?: () => void;
  onChangeBgScale?: (scale: number) => void;
  onChangeBgOpacity?: (opacity: number) => void;
  onChangeBgBrightness?: (brightness: number) => void;
  bgPattern?: BgPattern;
  onChangeBgPattern?: (pattern: BgPattern) => void;
  bgPatternScale?: number;
  onChangeBgPatternScale?: (scale: number) => void;
  bgPatternSpeed?: number;
  onChangeBgPatternSpeed?: (speed: number) => void;
  bgPatternOpacity?: number;
  onChangeBgPatternOpacity?: (opacity: number) => void;
  bgPatternCount?: number;
  onChangeBgPatternCount?: (count: number) => void;
  topicFontFamily?: TopicFontFamily;
  onChangeTopicFontFamily?: (fontId: TopicFontFamily) => void;
  isTopicBold?: boolean;
  onChangeTopicBold?: (bold: boolean) => void;
  isTopicOutline?: boolean;
  onChangeTopicOutline?: (outline: boolean) => void;
}

export const ColorPaletteSelector: React.FC<ColorPaletteSelectorProps> = ({
  selectedPalette,
  onSelectPalette,
  isDark = false,
  customBgUrl,
  bgScale = 100,
  bgOpacity = 100,
  bgBrightness = 100,
  onUploadBgImage,
  onRemoveBgImage,
  onChangeBgScale,
  onChangeBgOpacity,
  onChangeBgBrightness,
  bgPattern = 'none',
  onChangeBgPattern,
  bgPatternScale = 100,
  onChangeBgPatternScale,
  bgPatternSpeed = 100,
  onChangeBgPatternSpeed,
  bgPatternOpacity = 60,
  onChangeBgPatternOpacity,
  bgPatternCount = 100,
  onChangeBgPatternCount,
  topicFontFamily = 'gothic',
  onChangeTopicFontFamily,
  isTopicBold = true,
  onChangeTopicBold,
  isTopicOutline = false,
  onChangeTopicOutline,
}) => {
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onUploadBgImage?.(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <section
      className={`rounded-xl border-2 p-3 sm:p-4 shadow-sm transition-colors ${
        isDark
          ? 'bg-neutral-900/95 border-neutral-700 text-white'
          : 'bg-white/95 border-neutral-950 text-neutral-950'
      }`}
    >
      <div className={`border-b-2 pb-2 mb-3 ${isDark ? 'border-neutral-700' : 'border-neutral-950'}`}>
        <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
          <Palette className="w-4 h-4 text-amber-500" />
          <span>カラーパレット（背景色設定）</span>
        </h2>
        <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
          モニター画面およびコンソール画面の背景色を選択します。「黒」を選択した場合は自動的に文字が白反転し、劇場や暗転ステージに最適なダークモードになります。
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
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

      {/* ======================================================== */}
      {/* 背景の模様設定 (模様なし / 格子 / ドット) & サイズ・速さスライダー */}
      {/* ======================================================== */}
      <div className={`mt-3.5 pt-3 border-t-2 ${isDark ? 'border-neutral-700' : 'border-neutral-200'}`}>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Left: 模様の選択 (模様なし, 格子, ドット) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
            <span className={`text-xs font-black flex items-center gap-1.5 flex-shrink-0 ${isDark ? 'text-neutral-200' : 'text-neutral-900'}`}>
              <Sparkles className="w-4 h-4 text-amber-500" />
              背景の模様:
            </span>

            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
              {([
                { id: 'none' as const, label: '模様なし' },
                { id: 'grid' as const, label: '格子' },
                { id: 'dots' as const, label: 'ドット' },
              ]).map((opt) => {
                const isSelected = bgPattern === opt.id;
                const isWhiteBg = selectedPalette === 'white';
                const strokeOrFill = isWhiteBg ? '#64748b' : '#ffffff';

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeBgPattern?.(opt.id)}
                    className={`relative flex flex-col items-center gap-1.5 p-2 sm:p-2.5 rounded-xl border-2 transition-all cursor-pointer text-left select-none ${
                      isSelected
                        ? isDark
                          ? 'border-amber-400 bg-neutral-800 ring-2 ring-amber-400/50 scale-102 shadow-md'
                          : 'border-neutral-950 bg-amber-50 ring-2 ring-neutral-950 scale-102 shadow-md'
                        : isDark
                        ? 'border-neutral-700 bg-neutral-850 hover:bg-neutral-800 hover:border-neutral-500'
                        : 'border-neutral-300 bg-white hover:bg-neutral-50 hover:border-neutral-900'
                    }`}
                  >
                    {/* Visual pattern swatch */}
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 border-neutral-900/40 shadow-inner flex items-center justify-center relative overflow-hidden bg-neutral-800 dark:bg-neutral-950">
                      {opt.id === 'none' && (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                          <Ban className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                        </div>
                      )}
                      {opt.id === 'grid' && (
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                          <line x1="8" y1="0" x2="8" y2="36" stroke={strokeOrFill} strokeWidth="1" opacity="0.6" />
                          <line x1="20" y1="0" x2="20" y2="36" stroke={strokeOrFill} strokeWidth="1" opacity="0.8" />
                          <line x1="30" y1="0" x2="30" y2="36" stroke={strokeOrFill} strokeWidth="1" opacity="0.5" />
                          <line x1="0" y1="10" x2="36" y2="10" stroke={strokeOrFill} strokeWidth="1" opacity="0.7" />
                          <line x1="0" y1="22" x2="36" y2="22" stroke={strokeOrFill} strokeWidth="1" opacity="0.8" />
                          <line x1="0" y1="31" x2="36" y2="31" stroke={strokeOrFill} strokeWidth="1" opacity="0.4" />
                          <rect x="8" y="10" width="12" height="12" fill="none" stroke={strokeOrFill} strokeWidth="1.2" opacity="0.9" />
                        </svg>
                      )}
                      {opt.id === 'dots' && (
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                          <circle cx="9" cy="9" r="3.5" fill={strokeOrFill} opacity="0.75" />
                          <circle cx="24" cy="8" r="5.5" fill={strokeOrFill} opacity="0.85" />
                          <circle cx="28" cy="24" r="2.5" fill={strokeOrFill} opacity="0.7" />
                          <circle cx="12" cy="25" r="5" fill={strokeOrFill} opacity="0.65" />
                          <circle cx="19" cy="18" r="2" fill={strokeOrFill} opacity="0.9" />
                        </svg>
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={`text-xs font-black block truncate ${
                        isDark ? 'text-neutral-100' : 'text-neutral-900'
                      }`}
                    >
                      {opt.label}
                    </span>

                    {/* 選択中 badge */}
                    {isSelected && (
                      <span className="text-[10px] bg-amber-400 text-neutral-950 px-1.5 py-0.2 rounded font-black border border-neutral-900">
                        選択中
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: 「格子」か「ドット」が選択されている時のみ表示されるスライダー (サイズ, 速さ, 色の濃さ, 出現する数) */}
          {bgPattern && bgPattern !== 'none' && (
            <div className="flex-1 min-w-[280px] max-w-2xl flex flex-col gap-2 bg-neutral-50 dark:bg-neutral-850 p-2.5 sm:p-3 rounded-xl border-2 border-neutral-300 dark:border-neutral-700 shadow-2xs">
              {/* Row 1: サイズ (50% - 200%) & 速さ (20% - 300%) */}
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                {/* Slider 1: サイズ (50% - 200%) */}
                <div className="flex-1 bg-white dark:bg-neutral-900 p-2 sm:p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className={isDark ? 'text-neutral-200' : 'text-neutral-800'}>
                      サイズ:
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-mono text-[11px] font-black">
                      {bgPatternScale}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={bgPatternScale}
                    onChange={(e) => onChangeBgPatternScale?.(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500 cursor-pointer"
                    aria-label="背景模様のサイズ倍率"
                  />
                </div>

                {/* Slider 2: 速さ (20% - 300%) */}
                <div className="flex-1 bg-white dark:bg-neutral-900 p-2 sm:p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className={isDark ? 'text-neutral-200' : 'text-neutral-800'}>
                      速さ:
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-mono text-[11px] font-black">
                      {bgPatternSpeed}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    step="5"
                    value={bgPatternSpeed}
                    onChange={(e) => onChangeBgPatternSpeed?.(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500 cursor-pointer"
                    aria-label="背景模様のアニメーション速さ"
                  />
                </div>
              </div>

              {/* Row 2: 色の濃さ (10% - 100%) & 出現する数 (20% - 200%) */}
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                {/* Slider 3: 色の濃さ (10% - 100%) */}
                <div className="flex-1 bg-white dark:bg-neutral-900 p-2 sm:p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className={isDark ? 'text-neutral-200' : 'text-neutral-800'}>
                      色の濃さ:
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-mono text-[11px] font-black">
                      {bgPatternOpacity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={bgPatternOpacity}
                    onChange={(e) => onChangeBgPatternOpacity?.(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500 cursor-pointer"
                    aria-label="背景模様の色の濃さ"
                  />
                </div>

                {/* Slider 4: 出現する数 (20% - 200%) */}
                <div className="flex-1 bg-white dark:bg-neutral-900 p-2 sm:p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className={isDark ? 'text-neutral-200' : 'text-neutral-800'}>
                      出現する数:
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-mono text-[11px] font-black">
                      {bgPatternCount}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    step="10"
                    value={bgPatternCount}
                    onChange={(e) => onChangeBgPatternCount?.(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500 cursor-pointer"
                    aria-label="背景模様の出現する数"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 背景画像設定 & 3つの調整スライダー */}
      {/* ======================================================== */}
      <div className={`mt-3.5 pt-3 border-t-2 ${isDark ? 'border-neutral-700' : 'border-neutral-200'}`}>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-850 p-3 rounded-xl border border-neutral-300 dark:border-neutral-700 shadow-xs">
          {/* Left: Background upload & remove */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              ref={bgFileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => bgFileInputRef.current?.click()}
              className="inline-flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-amber-300 px-4 py-2.5 rounded-xl border-2 border-neutral-950 font-black text-xs sm:text-sm shadow-md cursor-pointer transition"
            >
              <Upload className="w-4 h-4" />
              <span>背景を設定する</span>
            </button>

            {customBgUrl && (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg border-2 border-neutral-950 overflow-hidden shadow-xs bg-white flex-shrink-0">
                  <img
                    src={customBgUrl}
                    alt="背景プレビュー"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={onRemoveBgImage}
                  className="inline-flex items-center gap-1.5 bg-white dark:bg-neutral-800 hover:bg-rose-50 text-rose-700 dark:text-rose-400 px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-800 font-black text-xs cursor-pointer shadow-xs transition"
                  title="背景画像の設定を解除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>設定を解除</span>
                </button>
              </div>
            )}

            {!customBgUrl && (
              <span className={`text-xs font-bold ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                ※ 未設定（設定するとモニター画面の背景に画像が敷かれます）
              </span>
            )}
          </div>

          {/* Right: 3 Sliders (拡大・縮小率, 透明度, 明るさ) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 lg:max-w-xl">
            {/* Slider 1: 画像の拡大・縮小率 (20% - 300%) */}
            <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs font-black">
                <span className={isDark ? 'text-neutral-200' : 'text-neutral-800'}>
                  画像の拡大・縮小率:
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-mono text-[11px] font-black">
                  {bgScale}%
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="300"
                step="5"
                value={bgScale}
                disabled={!customBgUrl}
                onChange={(e) => onChangeBgScale?.(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer disabled:opacity-40"
              />
            </div>

            {/* Slider 2: 画像の透明度 (0% - 100%) */}
            <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs font-black">
                <span className={isDark ? 'text-neutral-200' : 'text-neutral-800'}>
                  画像の透明度:
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-mono text-[11px] font-black">
                  {bgOpacity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={bgOpacity}
                disabled={!customBgUrl}
                onChange={(e) => onChangeBgOpacity?.(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer disabled:opacity-40"
              />
            </div>

            {/* Slider 3: 画像の明るさ (20% - 200%) */}
            <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs font-black">
                <span className={isDark ? 'text-neutral-200' : 'text-neutral-800'}>
                  画像の明るさ:
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-mono text-[11px] font-black">
                  {bgBrightness}%
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                step="5"
                value={bgBrightness}
                disabled={!customBgUrl}
                onChange={(e) => onChangeBgBrightness?.(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>
        </div>

        {/* お題のフォント選択・太字・縁取り文字（背景・背景画に連動） */}
        {(onChangeTopicFontFamily || onChangeTopicBold || onChangeTopicOutline) && (
          <div className={`mt-3.5 pt-3 border-t-2 ${isDark ? 'border-neutral-700' : 'border-neutral-200'} space-y-2`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              {/* フォント種類 */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-black flex items-center gap-1.5 ${isDark ? 'text-neutral-200' : 'text-neutral-900'}`}>
                  <Type className="w-4 h-4 text-amber-500" />
                  お題のフォント:
                </span>
                <div className={`inline-flex rounded-lg border-2 ${isDark ? 'border-neutral-700' : 'border-neutral-950'} overflow-hidden shadow-2xs`}>
                  {TOPIC_FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onChangeTopicFontFamily?.(f.id)}
                      className={`px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                        topicFontFamily === f.id
                          ? 'bg-neutral-950 text-[#FEF9C3] dark:bg-amber-400 dark:text-neutral-950'
                          : isDark
                          ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                          : 'bg-white text-neutral-800 hover:bg-neutral-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ボールド & 縁取り文字スイッチ */}
              <div className="flex flex-wrap items-center gap-2">
                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border-2 shadow-2xs ${
                  isDark
                    ? 'bg-neutral-850 border-neutral-700 text-neutral-200'
                    : 'bg-white border-neutral-950 text-neutral-900'
                }`}>
                  <span className="text-xs font-black whitespace-nowrap">
                    太字 (ボールド):
                  </span>
                  <Switch
                    size="sm"
                    checked={isTopicBold}
                    onChange={(checked) => onChangeTopicBold?.(checked)}
                    onLabel="ON"
                    offLabel="OFF"
                    ariaLabel="お題フォントのボールド設定"
                  />
                </div>

                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border-2 shadow-2xs ${
                  isDark
                    ? 'bg-neutral-850 border-neutral-700 text-neutral-200'
                    : 'bg-white border-neutral-950 text-neutral-900'
                }`}>
                  <span className="text-xs font-black whitespace-nowrap">
                    縁取り文字:
                  </span>
                  <Switch
                    size="sm"
                    checked={isTopicOutline}
                    onChange={(checked) => onChangeTopicOutline?.(checked)}
                    onLabel="ON"
                    offLabel="OFF"
                    ariaLabel="お題フォントの縁取り文字設定"
                  />
                </div>
              </div>
            </div>
            <p className={`text-[11px] font-bold ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              ※「縁取り文字」をONにすると、背景画や明暗に合わせてお題文字に縁取り（黒文字には白縁、白文字には黒縁）が付き、背景画像を設定した際も視認性をしっかり確保できます。
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
