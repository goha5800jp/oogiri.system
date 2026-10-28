import {
  ColorPalette,
  OgiriState,
  Participant,
  Topic,
  TimerState,
  TitleItem,
  GameLogItem,
  AnswerLogEntry,
  TopicFontFamily,
  TopicFontOption,
  PresetItem,
  PresetCustomTimer,
} from '../types/ogiri';

export const TOPIC_FONT_OPTIONS: TopicFontOption[] = [
  {
    id: 'gothic',
    label: 'ゴシック',
    category: 'サンセリフ',
    fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif",
  },
  {
    id: 'mincho',
    label: '明朝',
    category: 'セリフ',
    fontFamily: "'Noto Serif JP', 'Shippori Mincho', 'Yu Mincho', serif",
  },
  {
    id: 'round',
    label: '丸ゴシック',
    category: '丸ゴシック',
    fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif",
  },
  {
    id: 'handwriting',
    label: '手書き体',
    category: '手書き風',
    fontFamily: "'Klee One', cursive, sans-serif",
  },
  {
    id: 'display',
    label: '極太デザイン',
    category: 'インパクト',
    fontFamily: "'Dela Gothic One', Impact, sans-serif",
  },
];

export interface PaletteItem {
  id: ColorPalette;
  name: string;
  bgHex: string;
  isDark: boolean;
  borderPreviewHex: string;
}

export const PALETTE_CONFIGS: PaletteItem[] = [
  { id: 'yellow', name: '薄い黄色（デフォルト）', bgHex: '#FEF9C3', isDark: false, borderPreviewHex: '#EAB308' },
  { id: 'white', name: '白', bgHex: '#FFFFFF', isDark: false, borderPreviewHex: '#CBD5E1' },
  { id: 'gray', name: '薄い灰色', bgHex: '#F3F4F6', isDark: false, borderPreviewHex: '#9CA3AF' },
  { id: 'blue', name: '薄い水色', bgHex: '#E0F2FE', isDark: false, borderPreviewHex: '#38BDF8' },
  { id: 'pink', name: '薄いピンク', bgHex: '#FCE7F3', isDark: false, borderPreviewHex: '#F472B6' },
  { id: 'green', name: '薄い緑', bgHex: '#DCFCE7', isDark: false, borderPreviewHex: '#4ADE80' },
  { id: 'black', name: '黒（ダークモード）', bgHex: '#121212', isDark: true, borderPreviewHex: '#525252' },
];

export function getPaletteTheme(palette: ColorPalette = 'yellow') {
  const isDark = palette === 'black';
  const found = PALETTE_CONFIGS.find((p) => p.id === palette) || PALETTE_CONFIGS[0];

  return {
    id: found.id,
    name: found.name,
    bgHex: found.bgHex,
    isDark,
    containerBgHex: found.bgHex,
    textColorClass: isDark ? 'text-white' : 'text-neutral-950',
    subTextClass: isDark ? 'text-neutral-300' : 'text-neutral-700',
    headerBgClass: isDark ? 'bg-neutral-900/95 border-neutral-700' : 'bg-white/90 border-neutral-950',
    cardBgClass: isDark ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-950',
    sectionBgClass: isDark ? 'bg-neutral-900/95 border-neutral-700' : 'bg-white/95 border-neutral-950',
    innerBoxBgClass: isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-[#FFFDE7] border-neutral-950',
    inputBgClass: isDark ? 'bg-neutral-800 text-white border-neutral-600 focus:ring-amber-400' : 'bg-white text-neutral-950 border-neutral-950 focus:ring-neutral-900',
    timerBgClass: isDark ? 'bg-neutral-850 text-white border-neutral-600' : 'bg-white text-neutral-950 border-neutral-950',
    monitorCardClass: isDark
      ? 'bg-neutral-900/95 border-neutral-600 text-white shadow-xl'
      : 'bg-white/95 border-neutral-950 text-neutral-950 shadow-md',
    badgeClass: isDark
      ? 'bg-amber-400 text-neutral-950 border-neutral-900'
      : 'bg-amber-300 text-neutral-950 border-neutral-950',
    borderClass: isDark ? 'border-neutral-700' : 'border-neutral-950',
    dividerClass: isDark ? 'border-neutral-700' : 'border-neutral-950',
  };
}

/**
 * Parses participant name supporting (k) or (K) line-break syntax.
 * Up to 2 lines are returned.
 * If 2 or more breaks exist, line 1 is first segment, line 2 is remaining joined by a space.
 */
export function parseParticipantName(name: string): { hasBreak: boolean; lines: string[] } {
  const trimmed = (name || '').trim();
  if (!trimmed) return { hasBreak: false, lines: [] };

  if (/\([kK]\)|\r?\n/.test(trimmed)) {
    const rawLines = trimmed
      .split(/\([kK]\)|\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (rawLines.length === 0) return { hasBreak: false, lines: [] };
    if (rawLines.length === 1) return { hasBreak: false, lines: rawLines };
    return {
      hasBreak: true,
      lines: [rawLines[0], rawLines.slice(1).join(' ')],
    };
  }

  return { hasBreak: false, lines: [trimmed] };
}

/**
 * Maximum number of concurrently participating contestants allowed on monitor (14).
 * 7 max per row, up to 2 rows.
 */
export const MAX_ACTIVE_PARTICIPANTS = 14;

/**
 * Checks if a participant can be activated without exceeding the 14-person limit.
 */
export function canActivateParticipant(currentActiveCount: number): boolean {
  return currentActiveCount < MAX_ACTIVE_PARTICIPANTS;
}

/**
 * Calculates responsive dynamic font size for participant names based on character length.
 * Shorter names get larger fonts to fill the space cleanly; longer names scale down.
 */
export function getParticipantNameFontSize(
  lines: string[],
  isCompact: boolean = false
): string {
  if (!lines || lines.length === 0) return 'text-sm font-black';

  const maxLen = Math.max(...lines.map((l) => l.length), 0);

  if (isCompact) {
    // 2-row mode (8..14 participants) - slightly more compact
    if (maxLen <= 4) {
      return 'text-sm sm:text-base md:text-lg font-black';
    } else if (maxLen <= 7) {
      return 'text-xs sm:text-sm md:text-base font-black';
    } else if (maxLen <= 11) {
      return 'text-[11px] sm:text-xs md:text-sm font-bold';
    } else {
      return 'text-[10px] sm:text-[11px] md:text-xs font-bold';
    }
  }

  // Normal 1-row mode (<= 7 participants) - larger, higher impact
  if (maxLen <= 4) {
    return 'text-lg sm:text-xl md:text-2xl lg:text-3xl font-black';
  } else if (maxLen <= 7) {
    return 'text-base sm:text-lg md:text-xl lg:text-2xl font-black';
  } else if (maxLen <= 11) {
    return 'text-sm sm:text-base md:text-lg font-black';
  } else {
    return 'text-xs sm:text-sm md:text-base font-bold';
  }
}

/**
 * Exports full Ogiri state to JSON string for complete backup and restore.
 */
export function exportFullStateToJson(state: OgiriState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Parses and validates full Ogiri state from JSON string.
 */
export function parseFullStateFromJson(jsonStr: string): {
  success: boolean;
  state?: OgiriState;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'JSON形式が正しくありません' };
    }
    if (!Array.isArray(parsed.topics)) {
      return { success: false, error: 'お題データ（topics）が見つかりません' };
    }
    if (!Array.isArray(parsed.participants)) {
      return { success: false, error: '参加者データ（participants）が見つかりません' };
    }

    const defaults = createDefaultOgiriState();
    const fullState: OgiriState = {
      ...defaults,
      ...parsed,
      topics: parsed.topics.map((t: Partial<Topic>, idx: number) => ({
        id: t.id ?? idx + 1,
        text: t.text ?? '',
        imageUrl: t.imageUrl,
        isUsed: !!t.isUsed,
      })),
      participants: parsed.participants.map((p: Partial<Participant>, idx: number) => ({
        id: p.id ?? idx + 1,
        name: p.name ?? '',
        avatarUrl: p.avatarUrl,
        isParticipating: !!p.isParticipating,
        score: p.score ?? 0,
        teamName: p.teamName ?? '',
      })),
      timer: {
        ...defaults.timer,
        ...(parsed.timer || {}),
        isRunning: false, // Ensure timer starts paused on restore
        targetEndTime: undefined,
      },
      scoreButtons: parsed.scoreButtons || defaults.scoreButtons,
      activeParticipantOrder: Array.isArray(parsed.activeParticipantOrder)
        ? parsed.activeParticipantOrder
        : defaults.activeParticipantOrder,
      colorPalette: parsed.colorPalette || defaults.colorPalette || 'yellow',
      activeAnsweringParticipantId: parsed.activeAnsweringParticipantId ?? null,
      isScoringModeEnabled: parsed.isScoringModeEnabled ?? true,
      titles: Array.isArray(parsed.titles)
        ? parsed.titles.map((title: Partial<TitleItem>, idx: number) => ({
            id: title.id ?? idx + 1,
            text: title.text ?? '',
          }))
        : defaults.titles,
      selectedTitleNumber:
        typeof parsed.selectedTitleNumber === 'number'
          ? parsed.selectedTitleNumber
          : defaults.selectedTitleNumber ?? 1,
      topicFontSizeOffset:
        typeof parsed.topicFontSizeOffset === 'number'
          ? parsed.topicFontSizeOffset
          : 0,
      topicFontFamily: parsed.topicFontFamily || 'gothic',
      isTopicBold: parsed.isTopicBold !== undefined ? parsed.isTopicBold : true,
      answerLogs: Array.isArray(parsed.answerLogs)
        ? parsed.answerLogs.map((log: Partial<AnswerLogEntry>, idx: number) => ({
            id: log.id ?? idx + 1,
            respondentName: log.respondentName ?? '',
            answerText: log.answerText ?? '',
          }))
        : defaults.answerLogs,
      gameLogs: Array.isArray(parsed.gameLogs) ? parsed.gameLogs : [],
      presets: Array.isArray(parsed.presets) && parsed.presets.length > 0
        ? parsed.presets.map((p: any, idx: number) => ({
            id: p.id || `preset-${idx + 1}`,
            isTitleEnabled: !!p.isTitleEnabled,
            selectedTitleNumber: typeof p.selectedTitleNumber === 'number' ? p.selectedTitleNumber : 1,
            isTopicEnabled: !!p.isTopicEnabled,
            selectedTopicNumber: typeof p.selectedTopicNumber === 'number' ? p.selectedTopicNumber : 1,
            isParticipantsEnabled: !!p.isParticipantsEnabled,
            activeParticipantIds: Array.isArray(p.activeParticipantIds) ? p.activeParticipantIds : [],
            isCustomTimerEnabled: !!p.isCustomTimerEnabled,
            customTimer: p.customTimer || {
              totalMinutes: 3,
              totalSeconds: 0,
              alertMinutes: 1,
              alertSeconds: 0,
            },
          }))
        : defaults.presets,
      selectedPresetId: parsed.selectedPresetId ?? null,
      isPresetModeEnabled: !!parsed.isPresetModeEnabled,
      audienceVoting: parsed.audienceVoting || defaults.audienceVoting,
      audienceVotes: parsed.audienceVotes || defaults.audienceVotes || {},
      audienceVoters: Array.isArray(parsed.audienceVoters) ? parsed.audienceVoters : [],
    };

    return { success: true, state: fullState };
  } catch (err: any) {
    return { success: false, error: err?.message || 'ファイルの読み込みに失敗しました' };
  }
}

/**
 * Creates a default single preset item.
 */
export function createDefaultPresetItem(id: string = 'preset-1'): PresetItem {
  return {
    id,
    isTitleEnabled: false,
    selectedTitleNumber: 1,
    isTopicEnabled: false,
    selectedTopicNumber: 1,
    isParticipantsEnabled: false,
    activeParticipantIds: [],
    isCustomTimerEnabled: false,
    customTimer: {
      totalMinutes: 3,
      totalSeconds: 0,
      alertMinutes: 1,
      alertSeconds: 0,
    },
  };
}

/**
 * Generates the user-friendly display name of a preset.
 * If title is enabled and has text, e.g. "1 : 予選1回戦 第1試合".
 * Otherwise fallback to "1 : 設定1番".
 */
export function getPresetDisplayName(
  preset: PresetItem,
  index: number,
  titles: TitleItem[] = []
): string {
  if (preset.isTitleEnabled && preset.selectedTitleNumber) {
    const titleItem = titles.find((t) => t.id === preset.selectedTitleNumber);
    const titleText = titleItem?.text?.trim();
    if (titleText) {
      return `${index + 1} : ${titleText}`;
    }
  }
  return `${index + 1} : 設定${index + 1}番`;
}

/**
 * Parses raw topic text.
 * When `(k)` (or `(K)`) is encountered, it is treated as a line-break signal.
 * Returns an array of lines to be rendered.
 */
export function parseTopicLines(rawText: string): string[] {
  if (!rawText) return [];
  
  // Replace (k) or (K) with standard newline, then split by newlines
  const withNewlines = rawText.replace(/\(k\)|\(K\)/g, '\n');
  return withNewlines.split('\n');
}

/**
 * 11 tiers of responsive font size classes.
 * Shifting tiers by offset (+1, -1, etc.) ensures smooth, predictable,
 * fully responsive scaling across all screen sizes without any breakages.
 */
export const TOPIC_FONT_SIZE_TIERS = [
  { fontSizeClass: 'text-base sm:text-lg md:text-xl lg:text-2xl', lineHeightClass: 'leading-snug' }, // 0
  { fontSizeClass: 'text-lg sm:text-xl md:text-2xl lg:text-3xl', lineHeightClass: 'leading-snug' }, // 1
  { fontSizeClass: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl', lineHeightClass: 'leading-normal sm:leading-relaxed' }, // 2
  { fontSizeClass: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl', lineHeightClass: 'leading-snug sm:leading-relaxed' }, // 3
  { fontSizeClass: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl', lineHeightClass: 'leading-snug sm:leading-relaxed' }, // 4
  { fontSizeClass: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl', lineHeightClass: 'leading-tight sm:leading-normal' }, // 5
  { fontSizeClass: 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl', lineHeightClass: 'leading-tight sm:leading-snug' }, // 6 (Default for short topics)
  { fontSizeClass: 'text-6xl sm:text-7xl md:text-8xl lg:text-9xl', lineHeightClass: 'leading-tight sm:leading-snug' }, // 7
  { fontSizeClass: 'text-7xl sm:text-8xl md:text-9xl lg:text-[9.5rem]', lineHeightClass: 'leading-none sm:leading-tight' }, // 8
  { fontSizeClass: 'text-8xl sm:text-9xl md:text-[9.5rem] lg:text-[11.5rem]', lineHeightClass: 'leading-none' }, // 9
  { fontSizeClass: 'text-9xl sm:text-[9.5rem] md:text-[11.5rem] lg:text-[13rem]', lineHeightClass: 'leading-none' }, // 10
];

/**
 * Calculates appropriate CSS font size according to the text length, line count, and manual offset.
 * Ensures the topic text fits comfortably on stage monitors and scales predictably.
 */
export function getTopicFontSize(
  lines: string[],
  offset: number = 0
): {
  fontSizeClass: string;
  lineHeightClass: string;
} {
  const totalLength = lines.reduce((acc, line) => acc + line.length, 0);
  const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const lineCount = lines.length;

  let baseTierIndex = 6;
  if (totalLength <= 12 && lineCount <= 2) {
    baseTierIndex = 6;
  } else if (totalLength <= 25 && lineCount <= 3 && maxLineLength <= 18) {
    baseTierIndex = 5;
  } else if (totalLength <= 50 && lineCount <= 4 && maxLineLength <= 25) {
    baseTierIndex = 4;
  } else if (totalLength <= 85) {
    baseTierIndex = 3;
  } else {
    baseTierIndex = 2;
  }

  const effectiveIndex = Math.max(
    0,
    Math.min(TOPIC_FONT_SIZE_TIERS.length - 1, baseTierIndex + offset)
  );
  return TOPIC_FONT_SIZE_TIERS[effectiveIndex];
}

/**
 * Calculates font size for photo topic caption text based on offset.
 */
export function getPhotoTopicFontSize(offset: number = 0): {
  fontSizeClass: string;
  lineHeightClass: string;
} {
  const baseTierIndex = 1; // text-lg sm:text-xl md:text-2xl lg:text-3xl
  const effectiveIndex = Math.max(
    0,
    Math.min(TOPIC_FONT_SIZE_TIERS.length - 1, baseTierIndex + offset)
  );
  return TOPIC_FONT_SIZE_TIERS[effectiveIndex];
}

/**
 * Reorders an array by moving an item from startIndex to endIndex.
 */
export function reorderList<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

/**
 * Reorders a list of topics and reassigns IDs sequentially (1 to N).
 * The moved item takes the number of its new position, and others shift accordingly.
 */
export function reorderTopics(
  topics: Topic[],
  startIndex: number,
  endIndex: number
): Topic[] {
  const reordered = reorderList(topics, startIndex, endIndex);
  return reordered.map((topic, idx) => ({
    ...topic,
    id: idx + 1,
  }));
}

/**
 * Removes a topic at 1-based topicNumber and renumbers remaining topics to 1..N.
 * Preserves text, imageUrl, and isUsed flags.
 */
export function removeTopicAt(topics: Topic[], topicNumber: number): Topic[] {
  if (topicNumber < 1 || topicNumber > topics.length || topics.length <= 1) {
    return topics;
  }
  const filtered = topics.filter((_, idx) => idx !== topicNumber - 1);
  return filtered.map((t, idx) => ({
    ...t,
    id: idx + 1,
  }));
}

/**
 * Reorders participants list and sequentially reassigns IDs from 1 to N.
 */
export function reorderParticipants(
  participants: Participant[],
  startIndex: number,
  endIndex: number
): Participant[] {
  const reordered = reorderList(participants, startIndex, endIndex);
  return reordered.map((p, idx) => ({
    ...p,
    id: idx + 1,
  }));
}

/**
 * Calculates total score of participating participants with non-empty names.
 */
export function calculateTotalScore(participants: Participant[]): number {
  return participants
    .filter((p) => p.isParticipating && p.name.trim() !== '')
    .reduce((sum, p) => sum + (p.score || 0), 0);
}

/**
 * Returns the list of participants that:
 * 1. Have a non-empty name
 * 2. Have `isParticipating === true`
 * 3. Sorted in the exact order specified by `orderIds`
 */
export function getActiveOrderedParticipants(
  participants: Participant[],
  orderIds: number[]
): Participant[] {
  const activeMap = new Map<number, Participant>();
  for (const p of participants) {
    if (p.name.trim() !== '' && p.isParticipating) {
      activeMap.set(p.id, p);
    }
  }

  const result: Participant[] = [];
  const processedIds = new Set<number>();

  for (const id of orderIds) {
    const p = activeMap.get(id);
    if (p) {
      result.push(p);
      processedIds.add(id);
    }
  }

  for (const p of participants) {
    if (p.name.trim() !== '' && p.isParticipating && !processedIds.has(p.id)) {
      result.push(p);
    }
  }

  return result;
}

/**
 * Validates timer duration and alert threshold inputs.
 * - total: 0m1s to 60m59s
 * - alert: 0m0s to 60m59s, and alert <= total
 */
export function validateTimerInput(
  totalMin: number,
  totalSec: number,
  alertMin: number,
  alertSec: number
): { valid: boolean; error?: string } {
  if (isNaN(totalMin) || isNaN(totalSec) || isNaN(alertMin) || isNaN(alertSec)) {
    return { valid: false, error: '数値で入力してください' };
  }

  if (totalMin < 0 || totalMin > 60 || totalSec < 0 || totalSec > 59) {
    return { valid: false, error: 'タイマーは0分〜60分、0秒〜59秒で設定してください' };
  }

  const totalSeconds = totalMin * 60 + totalSec;
  if (totalSeconds < 1) {
    return { valid: false, error: '最小で0分1秒以上の時間を設定してください' };
  }

  if (alertMin < 0 || alertMin > 60 || alertSec < 0 || alertSec > 59) {
    return { valid: false, error: '色変更時間は0分〜60分、0秒〜59秒で設定してください' };
  }

  const alertSeconds = alertMin * 60 + alertSec;
  if (alertSeconds > totalSeconds) {
    return {
      valid: false,
      error: `色変更時間（${alertMin}分${alertSec}秒）は、元のタイマー時間（${totalMin}分${totalSec}秒）以下で設定してください`,
    };
  }

  return { valid: true };
}

/**
 * Formats seconds into MM:SS format.
 */
export function formatTimeMMSS(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Validates custom score button text.
 * Only allows +, -, *, /, ×, ÷ operators and digits (e.g., '+1', '-2', '+10', '*2').
 * Any other characters are strictly invalid.
 */
export function validateScoreButtonInput(input: string): { valid: boolean; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: '加点ボタンの内容を入力してください' };
  }

  // Regex strictly allows: optional single operator (+, -, *, /, ×, ÷) followed by 1 or more digits
  // or a signed/unsigned integer.
  const regex = /^(\+|\-|\*|\/|×|÷)?\d+$/;
  if (!regex.test(trimmed)) {
    return {
      valid: false,
      error: '足す(+), 引く(-), 掛ける(*, ×), 割る(/, ÷), 数字以外の文字は入力できません',
    };
  }

  return { valid: true };
}

/**
 * Applies score operation on the current score based on button label.
 * e.g. "+3" -> score + 3, "-1" -> score - 1, "*2" -> score * 2, "/2" -> Math.floor(score / 2)
 */
export function applyScoreOperation(currentScore: number, op: string): number {
  const trimmed = op.trim();
  const operator = trimmed[0];
  const operandStr = trimmed.slice(1);

  if (operator === '+') {
    const num = parseInt(operandStr, 10) || 0;
    return currentScore + num;
  } else if (operator === '-') {
    const num = parseInt(operandStr, 10) || 0;
    return currentScore - num;
  } else if (operator === '*' || operator === '×') {
    const num = parseInt(operandStr, 10) || 1;
    return currentScore * num;
  } else if (operator === '/' || operator === '÷') {
    const num = parseInt(operandStr, 10) || 1;
    if (num === 0) return currentScore;
    return Math.floor(currentScore / num);
  } else {
    // Pure integer
    const num = parseInt(trimmed, 10) || 0;
    return currentScore + num;
  }
}

/**
 * Exports topics into a human-readable and re-importable text format.
 * Preserves imageUrl and isUsed flags via embedded backup data.
 */
export function exportTopicsToText(topics: Topic[]): string {
  const readable = topics
    .map((t, idx) => {
      const usedTag = t.isUsed ? ' (使用済み)' : '';
      const imgTag = t.imageUrl ? ' [画像あり]' : '';
      return `[お題 ${idx + 1}]${usedTag}${imgTag}\n${t.text}`;
    })
    .join('\n\n');

  const fullJson = JSON.stringify(topics);
  return `${readable}\n\n# --- FLIP_OGIRI_TOPICS_DATA_START ---\n# ${fullJson}\n# --- FLIP_OGIRI_TOPICS_DATA_END ---`;
}

/**
 * Parses topics from text file format.
 * Restores full topics including imageUrl and isUsed if backup data exists,
 * or parses plain text lines / blocks.
 */
export function parseTopicsFromText(text: string): Topic[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Check if complete embedded data exists
  const jsonMatch = trimmed.match(
    /# --- FLIP_OGIRI_TOPICS_DATA_START ---\n# (.+?)\n# --- FLIP_OGIRI_TOPICS_DATA_END ---/s
  );
  if (jsonMatch && jsonMatch[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          id: idx + 1,
          text: item.text ?? '',
          imageUrl: item.imageUrl,
          isUsed: !!item.isUsed,
        }));
      }
    } catch {
      // fallback
    }
  }

  // Check if formatted with [お題 N] headers
  if (trimmed.includes('[お題')) {
    const blocks = trimmed.split(/\[お題\s*\d+[^\]]*\]\n?/g).filter((b) => b.trim() !== '');
    return blocks.map((block, idx) => {
      // Remove any trailing comment section
      const cleanBlock = block.replace(/# --- FLIP_OGIRI_TOPICS_DATA_START[\s\S]*$/, '').trim();
      return {
        id: idx + 1,
        text: cleanBlock,
        isUsed: false,
      };
    });
  }

  // Otherwise split by lines
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim() !== '' && !l.startsWith('#'));
  return lines.map((line, idx) => ({
    id: idx + 1,
    text: line.trim(),
    isUsed: false,
  }));
}

/**
 * Exports participants to text format.
 * Also includes backup JSON block in comment if avatars exist, so images can be restored!
 */
export function exportParticipantsToText(participants: Participant[]): string {
  // Simple list format
  const listText = participants
    .filter((p) => p.name.trim() !== '')
    .map((p, idx) => `${idx + 1}. ${p.name}${p.score ? ` (得点: ${p.score})` : ''}`)
    .join('\n');

  // JSON payload encoding (preserves avatars and full configuration)
  const fullJson = JSON.stringify(participants);
  return `${listText}\n\n# --- FLIP_OGIRI_PARTICIPANTS_DATA_START ---\n# ${fullJson}\n# --- FLIP_OGIRI_PARTICIPANTS_DATA_END ---`;
}

/**
 * Parses participants from text file format.
 */
export function parseParticipantsFromText(
  text: string
): { name: string; avatarUrl?: string; score?: number; isParticipating?: boolean }[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Check if complete embedded data exists
  const jsonMatch = trimmed.match(
    /# --- FLIP_OGIRI_PARTICIPANTS_DATA_START ---\n# (.+?)\n# --- FLIP_OGIRI_PARTICIPANTS_DATA_END ---/s
  );
  if (jsonMatch && jsonMatch[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Fallback to line-by-line parser
    }
  }

  // Fallback: parse lines (e.g. "1. 回答者1" or "回答者1")
  const lines = trimmed
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '' && !l.startsWith('#'));

  return lines.map((line) => {
    // Strip leading number like "1. " or "1: "
    const cleanName = line.replace(/^\d+[\.\:\s、]\s*/, '').replace(/\s*\(得点.*?\)$/, '').trim();
    return { name: cleanName, score: 0, isParticipating: true };
  });
}

/**
 * Creates default answer log entries (default: 5 empty entries)
 */
export function createDefaultAnswerLogs(count = 5): AnswerLogEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    respondentName: '',
    answerText: '',
  }));
}

/**
 * Creates the initial default state with user-specified defaults.
 * - topics: 1..2 (1: 'ここにお題を入力(k)改行もできます', 2: '')
 * - participants: 1..6 (1..4 have names, 5..6 empty, all isParticipating: false)
 * - titles: 1..4 (1: '（例）第1ブロック', 2..4 empty)
 * - isTitleVisible, isParticipantsVisible, isTopicVisible, isScoringModeEnabled: all false
 * - timer.isEnabled: true (モニター表示 ON)
 */
export function createDefaultOgiriState(): OgiriState {
  const defaultTopics: Topic[] = [
    { id: 1, text: 'ここにお題を入力(k)改行もできます', isUsed: false },
    { id: 2, text: '', isUsed: false },
  ];

  const defaultParticipants: Participant[] = [
    { id: 1, name: '回答者 1', isParticipating: false, score: 0 },
    { id: 2, name: '回答者 2', isParticipating: false, score: 0 },
    { id: 3, name: '回答者 3', isParticipating: false, score: 0 },
    { id: 4, name: '回答者 4', isParticipating: false, score: 0 },
    { id: 5, name: '', isParticipating: false, score: 0 },
    { id: 6, name: '', isParticipating: false, score: 0 },
  ];

  const defaultTitles: TitleItem[] = [
    { id: 1, text: '（例）第1ブロック' },
    { id: 2, text: '' },
    { id: 3, text: '' },
    { id: 4, text: '' },
  ];

  const defaultTimer: TimerState = {
    isEnabled: true, // タイマー設定のモニター表示: ON
    totalMinutes: 3,
    totalSeconds: 0,
    alertMinutes: 0,
    alertSeconds: 30,
    remainingSeconds: 180,
    isRunning: false,
  };

  return {
    topics: defaultTopics,
    selectedTopicNumber: 1,
    isTopicVisible: false, // お題の表示: OFF
    topicFontSizeOffset: 0,
    topicFontFamily: 'gothic',
    isTopicBold: true,
    selectedTitleNumber: 1,
    isTitleVisible: false, // タイトルの表示: OFF
    participants: defaultParticipants,
    isParticipantsVisible: false, // 参加者の表示: OFF
    activeParticipantOrder: [1, 2, 3, 4],
    timer: defaultTimer,
    scoreButtons: ['+1', '+2', '+3', '-1'],
    isScoreHiddenOnMonitor: false,
    isWhaleMode: false,
    colorPalette: 'yellow',
    activeAnsweringParticipantId: null,
    isScoringModeEnabled: false, // 加点モード: OFF
    titles: defaultTitles,
    gameLogs: [],
    answerLogs: createDefaultAnswerLogs(5),
    presets: [createDefaultPresetItem('preset-1')],
    selectedPresetId: null,
    isPresetModeEnabled: false,
    audienceVoting: {
      isQrVisible: false,
      isVotingActive: false,
      maxVotesPerPerson: 1,
      allowMultipleVotesPerParticipant: false,
      sessionCode: 'current',
    },
    audienceVotes: {},
    audienceVoters: [],
    version: 8,
  };
}


/**
 * Resets the entire state to the original default.
 */
export function resetAllToDefault(): OgiriState {
  return createDefaultOgiriState();
}

/**
 * Resets everything to default EXCEPT topics and participants (names, teamNames, avatars, isParticipating).
 * Participant scores are reset to 0, and topics/participants/titles/gameLogs are preserved.
 */
export function resetExceptTopicsAndParticipants(currentState: OgiriState): OgiriState {
  const defaults = createDefaultOgiriState();
  return {
    ...defaults,
    topics: currentState.topics,
    topicFontFamily: currentState.topicFontFamily || 'gothic',
    isTopicBold: currentState.isTopicBold !== undefined ? currentState.isTopicBold : true,
    topicFontSizeOffset: currentState.topicFontSizeOffset || 0,
    participants: currentState.participants.map((p) => ({
      ...p,
      score: 0,
    })),
    activeParticipantOrder: currentState.activeParticipantOrder,
    titles: currentState.titles || defaults.titles,
    gameLogs: currentState.gameLogs || [],
    presets: currentState.presets || defaults.presets,
    selectedPresetId: currentState.selectedPresetId ?? null,
    isPresetModeEnabled: false,
  };
}

/**
 * Converts a 1-based number into circled Japanese number (①..⑳)
 */
export function toCircledNumber(n: number): string {
  const circled = [
    '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
    '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳',
  ];
  if (n >= 1 && n <= 20) {
    return circled[n - 1];
  }
  return `(${n})`;
}

/**
 * Calculates standard competition ranks (1, 2, 2, 4...) for participants based on score.
 * Tied scores receive the same rank.
 */
export function calculateParticipantRanks(
  participants: { id: number; score: number }[]
): Record<number, number> {
  const sorted = [...participants].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const ranks: Record<number, number> = {};
  let curRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && (sorted[i].score ?? 0) < (sorted[i - 1].score ?? 0)) {
      curRank = i + 1;
    }
    ranks[sorted[i].id] = curRank;
  }
  return ranks;
}
