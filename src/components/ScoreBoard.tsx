import React, { useState } from 'react';
import { Participant, AnswerLogEntry, ColorPalette } from '../types/ogiri';
import { Switch } from './Switch';
import {
  applyScoreOperation,
  reorderList,
  validateScoreButtonInput,
  calculateTotalScore,
  getPaletteTheme,
} from '../utils/ogiriLogic';
import {
  RotateCcw,
  Plus,
  Trash2,
  GripVertical,
  User,
  AlertTriangle,
  EyeOff,
  ScrollText,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ScoreBoardProps {
  participants: Participant[];
  scoreButtons: string[];
  onUpdateScoreButtons: (newButtons: string[]) => void;
  onUpdateParticipantScore: (id: number, newScore: number) => void;
  onResetAllScores: () => void;
  mode?: 'full' | 'scores_only' | 'config_only';
  isScoreHiddenOnMonitor?: boolean;
  onToggleScoreHiddenOnMonitor?: (hidden: boolean) => void;
  isWhaleMode?: boolean;
  onToggleWhaleMode?: (enabled: boolean) => void;
  activeAnsweringParticipantId?: number | null;
  onToggleAnsweringParticipant?: (id: number) => void;
  isScoringModeEnabled?: boolean;
  onToggleScoringMode?: (enabled: boolean) => void;
  answerLogs?: AnswerLogEntry[];
  onUpdateAnswerLogs?: (logs: AnswerLogEntry[]) => void;
  onRequestConfirmResetLogs?: () => void;
  colorPalette?: ColorPalette;
  isResultAnnouncementActive?: boolean;
  onToggleResultAnnouncement?: () => void;
  onReorderParticipants?: (newOrderIds: number[]) => void;
  audienceVotes?: Record<number, number>;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  participants,
  scoreButtons,
  onUpdateScoreButtons,
  onUpdateParticipantScore,
  onResetAllScores,
  mode = 'full',
  isScoreHiddenOnMonitor = false,
  onToggleScoreHiddenOnMonitor,
  isWhaleMode = false,
  onToggleWhaleMode,
  activeAnsweringParticipantId = null,
  onToggleAnsweringParticipant,
  isScoringModeEnabled = true,
  onToggleScoringMode,
  answerLogs = [],
  onUpdateAnswerLogs,
  onRequestConfirmResetLogs,
  colorPalette = 'yellow',
  isResultAnnouncementActive = false,
  onToggleResultAnnouncement,
  onReorderParticipants,
  audienceVotes = {},
}) => {
  const paletteTheme = getPaletteTheme(colorPalette);

  // Collapsed answer log IDs
  const [collapsedAnswerLogIds, setCollapsedAnswerLogIds] = useState<Set<number>>(new Set());

  // Participant card reordering state (ドラッグ＆ドロップで横並び順序を入れ替え)
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [dragOverCardIndex, setDragOverCardIndex] = useState<number | null>(null);

  const handleCardDragStart = (
    e: React.DragEvent,
    index: number,
    participant: Participant
  ) => {
    setDraggedCardIndex(index);
    e.dataTransfer.setData('text/plain', participant.name);
    e.dataTransfer.setData('application/flip-participant-name', participant.name);
    e.dataTransfer.setData('application/flip-card-index', `${index}`);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleCardDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverCardIndex !== index) {
      setDragOverCardIndex(index);
    }
  };

  const handleCardDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const sourceIdxStr = e.dataTransfer.getData('application/flip-card-index');
    const sourceIdx =
      sourceIdxStr !== '' ? parseInt(sourceIdxStr, 10) : draggedCardIndex;

    if (sourceIdx !== null && !isNaN(sourceIdx) && sourceIdx !== dropIndex) {
      const currentIds = participants.map((p) => p.id);
      const newIds = reorderList(currentIds, sourceIdx, dropIndex);
      onReorderParticipants?.(newIds);
    }
    setDraggedCardIndex(null);
    setDragOverCardIndex(null);
  };

  const handleCardDragEnd = () => {
    setDraggedCardIndex(null);
    setDragOverCardIndex(null);
  };

  const moveCardLeft = (index: number) => {
    if (index > 0) {
      const currentIds = participants.map((p) => p.id);
      const newIds = reorderList(currentIds, index, index - 1);
      onReorderParticipants?.(newIds);
    }
  };

  const moveCardRight = (index: number) => {
    if (index < participants.length - 1) {
      const currentIds = participants.map((p) => p.id);
      const newIds = reorderList(currentIds, index, index + 1);
      onReorderParticipants?.(newIds);
    }
  };

  // Selection state for score button config checkboxes
  const [selectedButtonIndices, setSelectedButtonIndices] = useState<number[]>([]);
  const [draggedBtnIndex, setDraggedBtnIndex] = useState<number | null>(null);
  const [dragOverBtnIndex, setDragOverBtnIndex] = useState<number | null>(null);
  const [buttonInputErrors, setButtonInputErrors] = useState<{ [index: number]: string }>({});

  // Drag and drop handler for score buttons
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedBtnIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverBtnIndex !== index) {
      setDragOverBtnIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedBtnIndex === null) return;
    if (draggedBtnIndex !== dropIndex) {
      const newOrder = reorderList(scoreButtons, draggedBtnIndex, dropIndex);
      onUpdateScoreButtons(newOrder);
    }
    setDraggedBtnIndex(null);
    setDragOverBtnIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedBtnIndex(null);
    setDragOverBtnIndex(null);
  };

  // Click on a score button for a participant
  const handleScoreButtonClick = (participant: Participant, btnText: string) => {
    const updated = applyScoreOperation(participant.score || 0, btnText);
    onUpdateParticipantScore(participant.id, updated);
  };

  // Add new score button box
  const handleAddScoreButton = () => {
    if (scoreButtons.length >= 7) return;
    const nextVal = `+${(scoreButtons.length + 1) * 2}`;
    onUpdateScoreButtons([...scoreButtons, nextVal]);
  };

  // Remove selected score button boxes
  const handleRemoveSelectedButtons = () => {
    if (selectedButtonIndices.length === 0) return;
    const filtered = scoreButtons.filter(
      (_, idx) => !selectedButtonIndices.includes(idx)
    );
    // Keep at least 1 button
    const finalList = filtered.length > 0 ? filtered : ['+1'];
    onUpdateScoreButtons(finalList);
    setSelectedButtonIndices([]);
    setButtonInputErrors({});
  };

  // Change score button text in configuration
  const handleScoreButtonTextChange = (index: number, val: string) => {
    const check = validateScoreButtonInput(val);
    if (!check.valid) {
      setButtonInputErrors((prev) => ({ ...prev, [index]: check.error || '無効な入力です' }));
    } else {
      setButtonInputErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }

    const updated = [...scoreButtons];
    updated[index] = val;
    onUpdateScoreButtons(updated);
  };

  // Answer logs handlers (回答ログ)
  const handleSetRespondent = (logId: number, respondentName: string) => {
    if (!onUpdateAnswerLogs) return;
    const next = answerLogs.map((l) =>
      l.id === logId ? { ...l, respondentName } : l
    );
    onUpdateAnswerLogs(next);
  };

  const handleAnswerTextChange = (logId: number, answerText: string) => {
    if (!onUpdateAnswerLogs) return;
    const next = answerLogs.map((l) =>
      l.id === logId ? { ...l, answerText } : l
    );
    onUpdateAnswerLogs(next);
  };

  const handleDeleteAnswerLog = (logId: number) => {
    if (!onUpdateAnswerLogs) return;
    setCollapsedAnswerLogIds((prev) => {
      const next = new Set(prev);
      next.delete(logId);
      return next;
    });
    if (answerLogs.length <= 1) {
      onUpdateAnswerLogs([{ id: 1, respondentName: '', answerText: '' }]);
      return;
    }
    const filtered = answerLogs.filter((l) => l.id !== logId);
    const renumbered = filtered.map((l, idx) => ({ ...l, id: idx + 1 }));
    onUpdateAnswerLogs(renumbered);
  };

  const handleAddAnswerLogRow = () => {
    if (!onUpdateAnswerLogs) return;
    const nextId = answerLogs.length + 1;
    onUpdateAnswerLogs([
      ...answerLogs,
      { id: nextId, respondentName: '', answerText: '' },
    ]);
  };

  // Toggle checkbox for removing button
  const toggleCheckbox = (index: number) => {
    setSelectedButtonIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  if (participants.length === 0 && mode !== 'config_only') {
    if (mode === 'scores_only') {
      return (
        <div className="bg-[#FFFDE7] p-4 sm:p-5 rounded-lg border-2 border-neutral-950 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black bg-amber-300 text-neutral-950 px-2 py-0.5 rounded border border-neutral-900">
              リアルタイム操作
            </span>
            <h3 className="text-base sm:text-lg font-black text-neutral-950">
              コントロールパネル
            </h3>
          </div>
          <div className="p-4 bg-white rounded-lg border border-neutral-400 text-xs sm:text-sm text-neutral-700 font-bold">
            ※ 参加中の参加者がいません。直上の「参加状況設定」またはサブコンソール１で名前を入力し、参加スイッチをONにしてください。
          </div>
        </div>
      );
    }
    return null;
  }

  const scoreCardsSection = (
    <div
      className={
        mode === 'scores_only'
          ? 'bg-[#FFFDE7] p-4 sm:p-5 rounded-lg border-2 border-neutral-950 shadow-sm space-y-4'
          : 'space-y-5'
      }
    >
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-black bg-amber-300 text-neutral-950 px-2 py-0.5 rounded border border-neutral-900">
            リアルタイム操作
          </span>
          <h3 className="text-base sm:text-lg font-black text-neutral-950 mt-1">
            コントロールパネル
          </h3>
          <p className="text-xs text-neutral-700 font-bold">
            モニター表示順に各回答者を管理します。「回答中」を押すとモニター側で対象回答者が強調されます。
          </p>
          {isScoringModeEnabled && isScoreHiddenOnMonitor && (
            <div className="inline-flex items-center gap-1.5 mt-1 text-xs bg-purple-100 text-purple-950 border border-purple-600 px-2.5 py-0.5 rounded-full font-black animate-pulse">
              <EyeOff className="w-3.5 h-3.5 text-purple-700" />
              <span>モニター画面では得点が「???」と隠されています</span>
            </div>
          )}
        </div>

        {/* Buttons / Switches */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Switch: 加点モード (ON/OFF) - デフォルトON */}
          {onToggleScoringMode && (
            <div className="bg-white px-3 py-1.5 rounded-lg border-2 border-neutral-950 shadow-sm flex items-center">
              <Switch
                checked={isScoringModeEnabled !== false}
                onChange={onToggleScoringMode}
                onLabel="ON"
                offLabel="OFF"
                label="加点モード:"
              />
            </div>
          )}

          {/* Switch: モニターで得点を隠す／表示する (加点モードON時のみ) */}
          {isScoringModeEnabled !== false && onToggleScoreHiddenOnMonitor && (
            <div className="bg-white px-3 py-1.5 rounded-lg border-2 border-neutral-950 shadow-sm flex items-center">
              <Switch
                checked={isScoreHiddenOnMonitor}
                onChange={onToggleScoreHiddenOnMonitor}
                onLabel="得点を隠す (???)"
                offLabel="表示する"
                label="モニター得点:"
              />
            </div>
          )}

          {/* 結果発表を行う button (加点モードON時) */}
          {isScoringModeEnabled !== false && onToggleResultAnnouncement && (
            <button
              type="button"
              onClick={onToggleResultAnnouncement}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow cursor-pointer font-black text-xs sm:text-sm transition flex-shrink-0 ${
                isResultAnnouncementActive
                  ? 'bg-amber-400 hover:bg-amber-500 text-neutral-950 ring-2 ring-amber-400 animate-pulse'
                  : 'bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-200 hover:from-amber-400 hover:to-yellow-300 text-neutral-950 hover:shadow-md'
              }`}
              title="モニター画面でドラマチックな結果発表アニメーションを開始します"
            >
              <Trophy className="w-4 h-4 text-amber-800" />
              <span>{isResultAnnouncementActive ? '結果発表中 (中止/リセット)' : '結果発表を行う'}</span>
            </button>
          )}

          {/* 全得点をリセットする button (加点モードON時のみ) */}
          {isScoringModeEnabled !== false && (
            <button
              type="button"
              onClick={onResetAllScores}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-red-50 text-red-700 hover:text-red-800 px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow cursor-pointer font-black text-xs sm:text-sm transition flex-shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>全得点をリセットする</span>
            </button>
          )}
        </div>
      </div>

      {/* Reorder guidance note */}
      <div className="flex items-center justify-between px-1 text-[11px] text-neutral-600 font-bold">
        <span>※ 回答者枠をドラッグ＆ドロップまたは＜ ＞ボタンでモニター表示順を直接入れ替えできます</span>
        <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded border border-neutral-950">
          全 {participants.length} 名
        </span>
      </div>

      {/* Participants with score and vertical score buttons */}
      <div className="flex items-stretch gap-3 overflow-x-auto pb-4 pt-1 px-1 scrollbar-thin">
        {participants.map((p, pIdx) => {
          const isCardDragging = draggedCardIndex === pIdx;
          const isCardOver = dragOverCardIndex === pIdx;

          return (
            <div
              key={p.id}
              draggable
              onDragStart={(e) => handleCardDragStart(e, pIdx, p)}
              onDragOver={(e) => handleCardDragOver(e, pIdx)}
              onDrop={(e) => handleCardDrop(e, pIdx)}
              onDragEnd={handleCardDragEnd}
              className={`flex-shrink-0 flex flex-col items-center w-36 sm:w-40 p-3 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing ${
                isCardOver && !isCardDragging
                  ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-400 scale-102 z-10'
                  : isCardDragging
                  ? 'opacity-40 border-dashed border-neutral-400 bg-neutral-100'
                  : 'border-neutral-950 bg-white shadow-md hover:border-amber-500'
              }`}
              title="ドラッグ＆ドロップで左右の並び順を入れ替えできます（下の回答ログへもドロップ可能）"
            >
              {/* Order number & Left/Right reorder arrows */}
              <div className="w-full flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-neutral-900 bg-amber-200 border border-neutral-900 rounded-full w-5 h-5 flex items-center justify-center">
                    {pIdx + 1}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-bold">
                    #{p.id}
                  </span>
                </div>

                {onReorderParticipants && participants.length > 1 && (
                  <div
                    className="flex items-center gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      disabled={pIdx === 0}
                      onClick={() => moveCardLeft(pIdx)}
                      className="p-0.5 rounded hover:bg-neutral-200 disabled:opacity-20 text-neutral-700 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                      title="左へ移動"
                      aria-label="左へ移動"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <GripVertical className="w-3 h-3 text-neutral-400" />
                    <button
                      type="button"
                      disabled={pIdx === participants.length - 1}
                      onClick={() => moveCardRight(pIdx)}
                      className="p-0.5 rounded hover:bg-neutral-200 disabled:opacity-20 text-neutral-700 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                      title="右へ移動"
                      aria-label="右へ移動"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* 回答中 ボタン (①②の番号と、アイコン画像の間の位置) */}
              <div className="w-full my-1 flex justify-center">
                <button
                  type="button"
                  onClick={() => onToggleAnsweringParticipant?.(p.id)}
                  className={`w-full py-1 px-1.5 rounded-lg text-xs font-black border-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeAnsweringParticipantId === p.id
                      ? 'bg-rose-600 text-white border-rose-800 shadow-md ring-2 ring-rose-400 animate-pulse'
                      : 'bg-neutral-100 hover:bg-rose-50 text-neutral-700 hover:text-rose-700 border-neutral-300'
                  }`}
                  title={
                    activeAnsweringParticipantId === p.id
                      ? '回答中を解除する'
                      : 'この回答者を「回答中」としてモニター画面で強調表示する'
                  }
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeAnsweringParticipantId === p.id
                        ? 'bg-white animate-ping'
                        : 'bg-neutral-400'
                    }`}
                  />
                  <span>回答中</span>
                </button>
              </div>

              {/* Avatar Icon */}
              <div className="w-12 h-12 rounded-full border-2 border-neutral-900 overflow-hidden flex items-center justify-center bg-amber-100 mb-1 flex-shrink-0 shadow-inner">
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
                className="text-center font-bold text-xs sm:text-sm text-neutral-950 w-full truncate px-1 mb-2"
                title={p.name}
              >
                {p.name}
              </div>

              {/* Current Score Display (加点モードON時) または 観覧者投票数 (加点モードOFF時) */}
              {isScoringModeEnabled !== false ? (
                <div className="w-full text-center py-1.5 px-2 bg-amber-100/80 rounded-lg border-2 border-neutral-900 mb-3 shadow-inner">
                  <span className="text-[10px] text-neutral-600 font-black block">
                    現在の得点
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-neutral-950">
                    <span className="font-mono">{p.score || 0}</span>
                    <span className="text-xs ml-1 font-bold">点</span>
                  </span>
                </div>
              ) : (
                <div className="w-full text-center py-1.5 px-2 bg-emerald-50 rounded-lg border-2 border-neutral-900 mb-3 shadow-inner">
                  <span className="text-[10px] text-neutral-600 font-black block">
                    観覧者投票数
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-950">
                    <span className="font-mono">{audienceVotes[p.id] || 0}</span>
                    <span className="text-xs ml-1 font-bold text-neutral-700">票</span>
                  </span>
                </div>
              )}

              {/* Vertically aligned score buttons (加点モードON時のみ表示) */}
              {isScoringModeEnabled !== false && (
                <div className="w-full space-y-1.5">
                  {scoreButtons.map((btnText, bIdx) => {
                    const isDragging = draggedBtnIndex === bIdx;
                    const isOver = dragOverBtnIndex === bIdx;

                    return (
                      <div
                        key={bIdx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, bIdx)}
                        onDragOver={(e) => handleDragOver(e, bIdx)}
                        onDrop={(e) => handleDrop(e, bIdx)}
                        onDragEnd={handleDragEnd}
                        className={`relative flex items-center rounded-lg border border-neutral-950 transition-all ${
                          isDragging
                            ? 'opacity-40 scale-95 border-amber-600'
                            : isOver
                            ? 'border-blue-600 ring-2 ring-blue-400'
                            : 'hover:border-neutral-900'
                        }`}
                      >
                        {/* Drag handle */}
                        <div
                          className="px-1 text-neutral-400 hover:text-neutral-900 cursor-grab active:cursor-grabbing flex items-center justify-center"
                          title="ドラッグで全参加者のボタン順序を一括並び替え"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>

                        {/* Clickable score button */}
                        <button
                          type="button"
                          onClick={() => handleScoreButtonClick(p, btnText)}
                          className={`flex-1 py-1.5 text-xs sm:text-sm font-black rounded-r-lg transition cursor-pointer text-center ${
                            btnText.startsWith('-')
                              ? 'bg-rose-100 hover:bg-rose-200 text-rose-950'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950'
                          }`}
                        >
                          {btnText}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 回答ログ (Answer Logs): 1〜5+ テキストボックス & 回答者枠ドラッグ＆ドロップ */}
      {/* ======================================================== */}
      <div className="pt-3 border-t-2 border-neutral-900/30 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-300 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-950" />
            <h4 className="text-sm sm:text-base font-black text-neutral-950 flex items-center gap-1.5">
              <ScrollText className="w-4 h-4 text-neutral-800" />
              <span>回答ログ</span>
            </h4>
            <span className="text-xs bg-amber-200 text-neutral-950 font-black px-2 py-0.5 rounded border border-neutral-900">
              {answerLogs.length} 件
            </span>
          </div>
          <p className="text-xs text-neutral-600 font-bold">
            上の各回答者の枠を「回答者」欄にドラッグ＆ドロップすると名前が設定されます。
          </p>
        </div>

        {/* List of Answer Log rows: Uncollapsed rows at top, collapsed rows at bottom */}
        {(() => {
          const uncollapsedLogs = answerLogs.filter(
            (log) => !collapsedAnswerLogIds.has(log.id)
          );
          const collapsedLogs = answerLogs.filter((log) =>
            collapsedAnswerLogIds.has(log.id)
          );

          return (
            <div className="space-y-2">
              {/* 1. Uncollapsed (Active & Blank) rows */}
              {uncollapsedLogs.map((log) => {
                const origIndex = answerLogs.findIndex((l) => l.id === log.id);
                const origNumber = origIndex !== -1 ? origIndex + 1 : log.id;

                return (
                  <div
                    key={log.id}
                    style={{
                      backgroundColor: paletteTheme.bgHex,
                      color: paletteTheme.isDark ? '#F9FAFB' : '#0A0A0A',
                      borderColor: paletteTheme.isDark ? '#525252' : '#0A0A0A',
                    }}
                    className="p-2 sm:p-2.5 rounded-lg border-2 flex flex-wrap sm:flex-nowrap items-center gap-2 shadow-xs transition-colors hover:border-neutral-800"
                  >
                    {/* Order number badge (Original number preserved) */}
                    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-amber-200 border border-neutral-900 flex items-center justify-center font-black text-xs sm:text-sm text-neutral-950 flex-shrink-0">
                      {origNumber}
                    </span>

                    {/* 回答者枠 (Drop Target) */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const name =
                          e.dataTransfer.getData('application/flip-participant-name') ||
                          e.dataTransfer.getData('text/plain');
                        if (name) {
                          handleSetRespondent(log.id, name);
                        }
                      }}
                      className={`h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg border-2 flex items-center justify-between gap-1 min-w-[120px] sm:min-w-[140px] flex-shrink-0 transition-all ${
                        log.respondentName
                          ? 'bg-amber-100 border-neutral-950 text-neutral-950 font-black'
                          : paletteTheme.isDark
                          ? 'bg-neutral-800 border-dashed border-neutral-600 text-neutral-400 hover:border-amber-400'
                          : 'bg-white border-dashed border-neutral-400 text-neutral-400 hover:border-amber-600'
                      }`}
                      title="上の回答者枠をここにドラッグ＆ドロップしてください"
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <User className="w-3.5 h-3.5 flex-shrink-0 text-neutral-500" />
                        <span className="truncate text-xs font-bold">
                          {log.respondentName || '回答者をドロップ'}
                        </span>
                      </div>
                      {log.respondentName && (
                        <button
                          type="button"
                          onClick={() => handleSetRespondent(log.id, '')}
                          className="text-neutral-400 hover:text-red-700 p-0.5 text-xs font-black cursor-pointer rounded"
                          title="回答者をクリア"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Textbox for answer log */}
                    <input
                      type="text"
                      value={log.answerText}
                      onChange={(e) => handleAnswerTextChange(log.id, e.target.value)}
                      placeholder={`回答ログ ${origNumber} を入力...`}
                      style={{
                        backgroundColor: paletteTheme.isDark ? '#262626' : '#FFFFFF',
                        color: paletteTheme.isDark ? '#F9FAFB' : '#0A0A0A',
                        borderColor: paletteTheme.isDark ? '#525252' : '#171717',
                      }}
                      className="flex-1 min-w-[160px] px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />

                    {/* 畳むボタン */}
                    <button
                      type="button"
                      onClick={() => {
                        setCollapsedAnswerLogIds((prev) => {
                          const next = new Set(prev);
                          next.add(log.id);
                          return next;
                        });
                      }}
                      className="px-2.5 py-1.5 text-xs font-black bg-white hover:bg-neutral-100 text-neutral-950 border-2 border-neutral-950 rounded-lg cursor-pointer transition flex-shrink-0 shadow-2xs"
                      title="この行を畳んで最下段に移動します（番号・ログ内容は保持されます）"
                    >
                      畳む
                    </button>

                    {/* Delete / Clear button */}
                    <button
                      type="button"
                      aria-label={`回答ログ ${origNumber} を削除`}
                      onClick={() => handleDeleteAnswerLog(log.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer transition flex-shrink-0"
                      title="この行を削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              {uncollapsedLogs.length === 0 && (
                <div className="p-3 bg-neutral-100 dark:bg-neutral-800/80 rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-700 text-center text-xs font-bold text-neutral-600 dark:text-neutral-400">
                  すべての回答ログが畳まれています。「ログを増やす」を押して新規行を追加するか、「畳んだログを全て再表示する」を押してください。
                </div>
              )}

              {/* 2. Collapsed rows at the bottom (below all blank & active textboxes) */}
              {collapsedLogs.length > 0 && (
                <div className="pt-2 space-y-1.5 border-t border-dashed border-neutral-300 dark:border-neutral-700">
                  <div className="flex items-center justify-between text-[11px] font-bold text-neutral-500 dark:text-neutral-400 px-1">
                    <span>▼ 畳まれた回答ログ（最下段へ移動中 / 元の番号を保持）:</span>
                    <span className="text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1.5 py-0.2 rounded font-black">
                      {collapsedLogs.length}件
                    </span>
                  </div>

                  {collapsedLogs.map((log) => {
                    const origIndex = answerLogs.findIndex((l) => l.id === log.id);
                    const origNumber = origIndex !== -1 ? origIndex + 1 : log.id;

                    return (
                      <div
                        key={log.id}
                        style={{
                          backgroundColor: paletteTheme.bgHex,
                          color: paletteTheme.isDark ? '#F9FAFB' : '#0A0A0A',
                          borderColor: paletteTheme.isDark ? '#525252' : '#0A0A0A',
                        }}
                        className="py-1 px-2.5 rounded-lg border-2 flex items-center justify-between gap-2 shadow-2xs opacity-85 hover:opacity-100 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded bg-amber-200 border border-neutral-900 flex items-center justify-center font-black text-[10px] text-neutral-950 flex-shrink-0">
                            {origNumber}
                          </span>
                          {log.respondentName && (
                            <span className="text-[10px] font-black bg-amber-100 text-neutral-950 px-1.5 py-0.2 rounded border border-neutral-900 flex-shrink-0 truncate max-w-[120px]">
                              {log.respondentName}
                            </span>
                          )}
                          <span className="text-xs truncate flex-1 text-neutral-600 dark:text-neutral-300 font-bold">
                            {log.answerText || '（テキスト未入力）'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setCollapsedAnswerLogIds((prev) => {
                                const next = new Set(prev);
                                next.delete(log.id);
                                return next;
                              });
                            }}
                            className="px-2 py-0.5 text-[10px] font-black bg-white hover:bg-neutral-100 text-neutral-950 border border-neutral-900 rounded cursor-pointer shadow-2xs transition"
                            title="この行を元の位置に再表示する"
                          >
                            開く
                          </button>
                          <button
                            type="button"
                            aria-label={`回答ログ ${origNumber} を削除`}
                            onClick={() => handleDeleteAnswerLog(log.id)}
                            className="p-1 text-neutral-400 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer transition flex-shrink-0"
                            title="この行を削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Action Buttons: ログを増やす / ログをリセット / 畳んだログを全て再表示する */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleAddAnswerLogRow}
            className="inline-flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 text-[#FEF9C3] px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow hover:shadow-md cursor-pointer font-black text-xs sm:text-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>ログを増やす</span>
          </button>

          <button
            type="button"
            onClick={onRequestConfirmResetLogs}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-red-50 text-red-700 hover:text-red-800 px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow cursor-pointer font-black text-xs sm:text-sm transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ログをリセット</span>
          </button>

          <button
            type="button"
            onClick={() => setCollapsedAnswerLogIds(new Set())}
            disabled={collapsedAnswerLogIds.size === 0}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-neutral-100 disabled:opacity-40 text-neutral-950 disabled:text-neutral-400 px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow cursor-pointer disabled:cursor-not-allowed font-black text-xs sm:text-sm transition"
            title="畳まれている回答ログをすべて元のサイズに再表示します"
          >
            <span>畳んだログを全て再表示する</span>
            {collapsedAnswerLogIds.size > 0 && (
              <span className="bg-amber-300 text-neutral-950 px-1.5 py-0.2 rounded text-[10px] font-black">
                {collapsedAnswerLogIds.size}件
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ホエールモード: 全回答者の得点合計 (加点モードON時のみ表示) */}
      {isScoringModeEnabled !== false && onToggleWhaleMode && (
        <div className="pt-3 border-t-2 border-neutral-900/30 flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-neutral-950 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label="whale">
              🐋
            </span>
            <Switch
              checked={isWhaleMode}
              onChange={onToggleWhaleMode}
              onLabel="ON"
              offLabel="OFF"
              label="ホエールモード:"
            />
            <span className="text-xs text-neutral-600 font-bold hidden sm:inline">
              (全員の得点を合計して表示)
            </span>
          </div>

          {isWhaleMode && (
            <div className="flex items-center gap-2 bg-sky-100 border-2 border-sky-950 px-3 py-1.5 rounded-lg shadow-xs">
              <span className="text-xs sm:text-sm font-black text-sky-950">
                全員の得点合計:
              </span>
              <span className="font-mono text-xl sm:text-2xl font-black text-sky-950">
                {calculateTotalScore(participants)}
              </span>
              <span className="text-xs sm:text-sm font-black text-sky-950">点</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const configSection = (
    <div className="bg-[#FFFDE7] p-4 rounded-xl border-2 border-neutral-950 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-300 pb-2">
          <div>
            <h4 className="text-sm sm:text-base font-black text-neutral-950">
              加点ボタンの設定
            </h4>
            <p className="text-xs text-neutral-700 font-bold">
              足す(+), 引く(-), 掛ける(*), 割る(/)と数字を入力できます（最大7つ）。チェックを入れて選択したボタンを削除できます。
            </p>
          </div>
          <span className="text-xs font-black bg-white px-2 py-0.5 rounded border border-neutral-950">
            現在 {scoreButtons.length} / 7 個
          </span>
        </div>

        {/* Input errors if any */}
        {Object.keys(buttonInputErrors).length > 0 && (
          <div className="flex items-center gap-2 bg-red-100 text-red-900 border-2 border-red-500 p-2 rounded-lg text-xs font-black">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>
              {Object.values(buttonInputErrors)[0]}
            </span>
          </div>
        )}

        {/* Button definition boxes */}
        <div className="flex flex-wrap items-center gap-2.5">
          {scoreButtons.map((btnText, idx) => {
            const isChecked = selectedButtonIndices.includes(idx);
            const hasError = !!buttonInputErrors[idx];

            return (
              <div
                key={idx}
                className={`flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border-2 shadow-xs transition ${
                  hasError
                    ? 'border-red-600 ring-2 ring-red-400'
                    : isChecked
                    ? 'border-amber-600 bg-amber-50'
                    : 'border-neutral-950'
                }`}
              >
                {/* Checkbox to select for removal */}
                <input
                  type="checkbox"
                  aria-label={`ボタン ${idx + 1} を選択`}
                  checked={isChecked}
                  onChange={() => toggleCheckbox(idx)}
                  className="w-4 h-4 accent-neutral-950 cursor-pointer rounded"
                />

                {/* Score button value input */}
                <input
                  type="text"
                  aria-label={`加点ボタン ${idx + 1} の値`}
                  value={btnText}
                  onChange={(e) => handleScoreButtonTextChange(idx, e.target.value)}
                  className="w-14 text-center font-black text-sm border border-neutral-400 rounded px-1 py-0.5 bg-white text-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-950"
                />
              </div>
            );
          })}
        </div>

        {/* Add / Remove buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleAddScoreButton}
            disabled={scoreButtons.length >= 7}
            className="inline-flex items-center gap-1 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-950 text-white px-3 py-1.5 rounded-lg border-2 border-neutral-950 shadow font-black text-xs cursor-pointer disabled:cursor-not-allowed transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ボックスを増やす</span>
          </button>

          <button
            type="button"
            onClick={handleRemoveSelectedButtons}
            disabled={selectedButtonIndices.length === 0}
            className="inline-flex items-center gap-1 bg-white hover:bg-red-50 text-red-700 hover:text-red-800 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-red-700 px-3 py-1.5 rounded-lg border-2 border-neutral-950 shadow font-black text-xs cursor-pointer disabled:cursor-not-allowed transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>選択したボックスを減らす</span>
          </button>
        </div>
      </div>
  );

  if (mode === 'scores_only') {
    return scoreCardsSection;
  }

  if (mode === 'config_only') {
    return configSection;
  }

  return (
    <div className="space-y-5 pt-3 border-t-2 border-neutral-950">
      {scoreCardsSection}
      {configSection}
    </div>
  );
};
