import React, { useRef, useState } from 'react';
import {
  OgiriState,
  Participant,
  TimerState,
  Topic,
  TitleItem,
  GameLogItem,
  PresetItem,
  PresetCustomTimer,
  AudienceVotingConfig,
} from '../types/ogiri';
import { Switch } from './Switch';
import { ParticipantOrderList } from './ParticipantOrderList';
import { TimerControl } from './TimerControl';
import { ScoreBoard } from './ScoreBoard';
import { AudienceVotingControl } from './AudienceVotingControl';
import { ZoomControl } from './ZoomControl';
import { ColorPaletteSelector } from './ColorPaletteSelector';
import { ConfirmModal } from './ConfirmModal';
import { resetVotingData } from '../services/audienceVotingService';
import {
  getActiveOrderedParticipants,
  reorderTopics,
  removeTopicAt,
  reorderParticipants,
  exportTopicsToText,
  parseTopicsFromText,
  exportParticipantsToText,
  parseParticipantsFromText,
  getPaletteTheme,
  exportFullStateToJson,
  parseFullStateFromJson,
  canActivateParticipant,
  MAX_ACTIVE_PARTICIPANTS,
  resetAllToDefault,
  resetExceptTopicsAndParticipants,
  createDefaultAnswerLogs,
  toCircledNumber,
  TOPIC_FONT_OPTIONS,
  createDefaultPresetItem,
  getPresetDisplayName,
  reorderList,
} from '../utils/ogiriLogic';
import {
  Plus,
  Minus,
  Upload,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  Tv,
  HelpCircle,
  Download,
  CheckCircle2,
  CheckSquare,
  GripVertical,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  Settings2,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  AlertTriangle,
  Copy,
  ScrollText,
  Layers,
  EyeOff,
  BookmarkPlus,
  Database,
} from 'lucide-react';
import { RecordsDatabaseView } from './RecordsDatabaseView';

interface ConsoleViewProps {
  state: OgiriState;
  updateState: (updater: OgiriState | ((prev: OgiriState) => OgiriState)) => void;
  onOpenMonitor: () => void;
  onSwitchToMonitorView: () => void;
  onSaveGameLog?: () => void;
}

export const ConsoleView: React.FC<ConsoleViewProps> = ({
  state,
  updateState,
  onOpenMonitor,
  onSwitchToMonitorView,
  onSaveGameLog,
}) => {
  const [zoom, setZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('flip_ogiri_console_zoom');
      return saved ? parseFloat(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    try {
      localStorage.setItem('flip_ogiri_console_zoom', newZoom.toString());
    } catch {}
  };

  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const topicImageInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const topicFileInputRef = useRef<HTMLInputElement | null>(null);
  const participantFileInputRef = useRef<HTMLInputElement | null>(null);
  const fullStateFileInputRef = useRef<HTMLInputElement | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Current active console page: 'records2_db' (記録２：データベース), 'logs' (記録１：試合ログ), 'main' (メイン画面・本番), 'sub1_prep' (サブコンソール１：準備), or 'sub2_preset' (サブコンソール２：プリセット)
  const [currentPage, setCurrentPage] = useState<
    'records2_db' | 'logs' | 'main' | 'sub1_prep' | 'sub2_preset'
  >('main');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // In-app confirmation modal state (replaces window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '確認',
    message: '',
    onConfirm: () => {},
  });

  // Easter egg credits modal state
  const [showEasterEggModal, setShowEasterEggModal] = useState(false);

  // Preset drag-and-drop state
  const [draggedPresetIndex, setDraggedPresetIndex] = useState<number | null>(null);
  const [dragOverPresetIndex, setDragOverPresetIndex] = useState<number | null>(null);

  const handlePresetDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPresetIndex(index);
    e.dataTransfer.setData('text/plain', `preset-${index}`);
  };

  const handlePresetDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverPresetIndex !== index) {
      setDragOverPresetIndex(index);
    }
  };

  const handlePresetDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedPresetIndex !== null && draggedPresetIndex !== dropIndex) {
      updateState((prev) => {
        const list = prev.presets || [];
        return {
          ...prev,
          presets: reorderList(list, draggedPresetIndex, dropIndex),
        };
      });
    }
    setDraggedPresetIndex(null);
    setDragOverPresetIndex(null);
  };

  const handlePresetDragEnd = () => {
    setDraggedPresetIndex(null);
    setDragOverPresetIndex(null);
  };

  // Preset management handlers
  const handleAddPreset = () => {
    updateState((prev) => {
      const list = prev.presets || [];
      const newId = `preset-${Date.now()}`;
      const newPreset = createDefaultPresetItem(newId);
      return {
        ...prev,
        presets: [...list, newPreset],
      };
    });
    showToast(`設定 ${(state.presets?.length || 0) + 1} 番を追加しました`);
  };

  const handleCopyPreset = (index: number) => {
    updateState((prev) => {
      const list = prev.presets || [];
      if (!list[index]) return prev;
      const target = list[index];
      const copied: PresetItem = {
        ...target,
        id: `preset-${Date.now()}`,
        activeParticipantIds: [...(target.activeParticipantIds || [])],
        customTimer: target.customTimer ? { ...target.customTimer } : undefined,
      };
      const newList = [...list];
      newList.splice(index + 1, 0, copied);
      return {
        ...prev,
        presets: newList,
      };
    });
    showToast(`設定 ${index + 1} 番を複製しました`);
  };

  const handleDeletePreset = (index: number) => {
    const list = state.presets || [];
    if (list.length <= 1) {
      setConfirmModal({
        isOpen: true,
        title: 'プリセットの削除',
        message: '最後の1件です。初期状態にリセットしますか？',
        onConfirm: () => {
          updateState((prev) => ({
            ...prev,
            presets: [createDefaultPresetItem(`preset-${Date.now()}`)],
            selectedPresetId: null,
          }));
          showToast('プリセットを初期化しました');
        },
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'プリセットの削除',
      message: `設定 ${index + 1} 番を削除しますか？`,
      onConfirm: () => {
        updateState((prev) => {
          const prevList = prev.presets || [];
          const target = prevList[index];
          const newList = prevList.filter((_, idx) => idx !== index);
          return {
            ...prev,
            presets: newList,
            selectedPresetId: prev.selectedPresetId === target?.id ? null : prev.selectedPresetId,
          };
        });
        showToast(`設定 ${index + 1} 番を削除しました`);
      },
    });
  };

  const handleUpdatePreset = (index: number, updater: (p: PresetItem) => PresetItem) => {
    updateState((prev) => {
      const list = prev.presets || [];
      if (!list[index]) return prev;
      const newList = [...list];
      newList[index] = updater(newList[index]);
      return {
        ...prev,
        presets: newList,
      };
    });
  };

  // Apply a preset to the Main Console
  const handleApplyPreset = (presetId: string) => {
    const presetList = state.presets || [];
    const preset = presetList.find((p) => p.id === presetId);
    if (!preset) return;

    updateState((prev) => {
      // 1. First turn off topic, title, and participants display
      let nextState: OgiriState = {
        ...prev,
        isTopicVisible: false,
        isTitleVisible: false,
        isParticipantsVisible: false,
        selectedPresetId: presetId,
      };

      // 2. Apply Title if enabled
      if (preset.isTitleEnabled && preset.selectedTitleNumber) {
        nextState.selectedTitleNumber = preset.selectedTitleNumber;
      }

      // 3. Apply Topic if enabled
      if (preset.isTopicEnabled && preset.selectedTopicNumber) {
        nextState.selectedTopicNumber = preset.selectedTopicNumber;
      }

      // 4. Apply Participants if enabled
      if (preset.isParticipantsEnabled) {
        const activeIds = preset.activeParticipantIds || [];
        nextState.participants = prev.participants.map((p) => ({
          ...p,
          isParticipating: activeIds.includes(p.id),
        }));
        // Order: prioritize activeIds in the preset, followed by any remaining
        const remaining = prev.activeParticipantOrder.filter((id) => !activeIds.includes(id));
        nextState.activeParticipantOrder = [...activeIds, ...remaining];
      }

      // 5. Apply Custom Timer if enabled
      if (preset.isCustomTimerEnabled && preset.customTimer) {
        const totalSec = preset.customTimer.totalMinutes * 60 + preset.customTimer.totalSeconds;
        nextState.timer = {
          ...prev.timer,
          totalMinutes: preset.customTimer.totalMinutes,
          totalSeconds: preset.customTimer.totalSeconds,
          alertMinutes: preset.customTimer.alertMinutes,
          alertSeconds: preset.customTimer.alertSeconds,
          remainingSeconds: totalSec,
          isRunning: false,
          targetEndTime: undefined,
        };
      }

      return nextState;
    });

    const presetIdx = presetList.findIndex((p) => p.id === presetId);
    const displayName = getPresetDisplayName(preset, presetIdx, state.titles);
    showToast(`プリセット「${displayName}」を適用しました（表示スイッチはOFFにリセットされました）`);
  };

  // Actions for 「開始前後の操作」
  const handleHideAllMainDisplays = () => {
    updateState((prev) => ({
      ...prev,
      isTitleVisible: false,
      isTopicVisible: false,
      isParticipantsVisible: false,
    }));
    showToast('タイトル・お題・参加者を非表示にしました');
  };

  const handleShowTitle = () => {
    updateState((prev) => {
      const next = !prev.isTitleVisible;
      showToast(next ? 'タイトルを表示しました' : 'タイトルを非表示にしました');
      return { ...prev, isTitleVisible: next };
    });
  };

  const handleShowParticipants = () => {
    updateState((prev) => {
      const next = !prev.isParticipantsVisible;
      showToast(next ? '参加者を表示しました' : '参加者を非表示にしました');
      return { ...prev, isParticipantsVisible: next };
    });
  };

  const handleShowTopic = () => {
    updateState((prev) => {
      const next = !prev.isTopicVisible;
      showToast(next ? 'お題を表示しました' : 'お題を非表示にしました');
      return { ...prev, isTopicVisible: next };
    });
  };

  const handleSaveLogClick = () => {
    onSaveGameLog?.();
    showToast(`第 ${(state.gameLogs?.length || 0) + 1} 回の試合ログを記録・保存しました`);
  };

  // Reset handlers (設定のリセット)
  const handleResetAll = () => {
    setConfirmModal({
      isOpen: true,
      title: '設定のリセット',
      message: '全ての設定をリセットしますか？',
      onConfirm: () => {
        updateState(resetAllToDefault());
        showToast('すべての設定を初期化しました');
      },
    });
  };

  const handleResetExceptTopicsAndParticipants = () => {
    setConfirmModal({
      isOpen: true,
      title: '設定のリセット',
      message: 'お代と参加者以外をリセットしますか？',
      onConfirm: () => {
        updateState((prev) => resetExceptTopicsAndParticipants(prev));
        showToast('お題と参加者以外の設定をリセットしました');
      },
    });
  };

  // Answer Log reset handler
  const handleRequestResetAnswerLogs = () => {
    setConfirmModal({
      isOpen: true,
      title: '回答ログのリセット',
      message: 'ログを消去しますか？',
      onConfirm: () => {
        updateState((prev) => ({
          ...prev,
          answerLogs: createDefaultAnswerLogs(5),
        }));
        showToast('回答ログを消去しました');
      },
    });
  };

  // Result Announcement handler (結果発表を行う / リセット)
  const handleToggleResultAnnouncement = () => {
    updateState((prev) => {
      if (prev.resultAnnouncement?.isActive) {
        return {
          ...prev,
          resultAnnouncement: undefined,
        };
      } else {
        return {
          ...prev,
          isParticipantsVisible: true,
          audienceVoting: prev.audienceVoting
            ? { ...prev.audienceVoting, isQrVisible: false }
            : prev.audienceVoting,
          resultAnnouncement: {
            isActive: true,
            startedAt: Date.now(),
            isCompleted: false,
          },
        };
      }
    });
    showToast(
      state.resultAnnouncement?.isActive
        ? '結果発表をリセットしました'
        : '結果発表を開始しました！モニター画面で演出が再生されます'
    );
  };

  // Audience voting handlers
  const handleUpdateAudienceVotingConfig = (
    updater: (prev: AudienceVotingConfig) => AudienceVotingConfig
  ) => {
    updateState((prev) => {
      const currentConfig: AudienceVotingConfig = prev.audienceVoting || {
        isQrVisible: false,
        isVotingActive: false,
        maxVotesPerPerson: 1,
        allowMultipleVotesPerParticipant: false,
        sessionCode: 'current',
      };
      return {
        ...prev,
        audienceVoting: updater(currentConfig),
      };
    });
  };

  const handleResetAudienceVoting = async () => {
    try {
      await resetVotingData();
      updateState((prev) => ({
        ...prev,
        audienceVotes: {},
        audienceVoters: [],
        audienceVoting: prev.audienceVoting
          ? { ...prev.audienceVoting, isVotingActive: false }
          : undefined,
      }));
      showToast('投票データ（集計票数・参加登録者）をリセットしました');
    } catch {
      showToast('投票データのリセットに失敗しました');
    }
  };

  // State to toggle appearance count display in 参加状況設定
  const [showAppearanceCount, setShowAppearanceCount] = useState<boolean>(false);

  // State to toggle collapsing presets in Subconsole 2
  const [collapsedPresetIds, setCollapsedPresetIds] = useState<Set<string>>(new Set());
  const toggleCollapsePreset = (id: string) => {
    setCollapsedPresetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Appearance count calculation based on state.gameLogs
  const appearancesMap = React.useMemo(() => {
    const map: Record<number, number> = {};
    (state.gameLogs || []).forEach((log) => {
      (log.participants || []).forEach((p) => {
        map[p.id] = (map[p.id] || 0) + 1;
      });
    });
    return map;
  }, [state.gameLogs]);

  // Default titles fallback (1..4)
  const defaultTitleList: TitleItem[] = [
    { id: 1, text: '（例）第1ブロック' },
    { id: 2, text: '' },
    { id: 3, text: '' },
    { id: 4, text: '' },
  ];

  // Titles state & handlers (サブコンソール１のタイトル欄)
  const titles: TitleItem[] =
    state.titles && state.titles.length > 0 ? state.titles : defaultTitleList;

  const handleTitleNumberChange = (num: number) => {
    const maxLen = Math.max(1, titles.length);
    const clamped = Math.max(1, Math.min(maxLen, num));
    updateState((prev) => ({
      ...prev,
      selectedTitleNumber: clamped,
    }));
  };

  const handleTitleChange = (id: number, text: string) => {
    updateState((prev) => {
      const currentTitles =
        prev.titles && prev.titles.length > 0 ? [...prev.titles] : [...defaultTitleList];
      const idx = currentTitles.findIndex((t) => t.id === id);
      if (idx !== -1) {
        currentTitles[idx] = { ...currentTitles[idx], text };
      }
      return { ...prev, titles: currentTitles };
    });
  };

  const handleAddTitle = () => {
    updateState((prev) => {
      const current = prev.titles && prev.titles.length > 0 ? prev.titles : defaultTitleList;
      const nextId = current.length + 1;
      return {
        ...prev,
        titles: [...current, { id: nextId, text: '' }],
      };
    });
    showToast('タイトルの項目を追加しました');
  };

  const handleRemoveTitle = () => {
    updateState((prev) => {
      const current = prev.titles && prev.titles.length > 0 ? prev.titles : defaultTitleList;
      if (current.length <= 1) return prev;
      const newTitles = current.slice(0, -1);
      const newSelected = Math.min(prev.selectedTitleNumber || 1, newTitles.length);
      return {
        ...prev,
        titles: newTitles,
        selectedTitleNumber: newSelected,
      };
    });
    showToast('タイトルの項目を減らしました');
  };

  const handleClearTitle = (id: number) => {
    handleTitleChange(id, '');
    showToast(`タイトル #${id} をクリアしました`);
  };

  // Drag and drop for titles
  const [draggedTitleIndex, setDraggedTitleIndex] = useState<number | null>(null);
  const [dragOverTitleIndex, setDragOverTitleIndex] = useState<number | null>(null);

  const handleTitleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedTitleIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${index}`);
  };

  const handleTitleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTitleIndex !== index) {
      setDragOverTitleIndex(index);
    }
  };

  const handleTitleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedTitleIndex === null) return;
    if (draggedTitleIndex !== dropIndex) {
      reorderTitleItems(draggedTitleIndex, dropIndex);
    }
    setDraggedTitleIndex(null);
    setDragOverTitleIndex(null);
  };

  const handleTitleDragEnd = () => {
    setDraggedTitleIndex(null);
    setDragOverTitleIndex(null);
  };

  const reorderTitleItems = (from: number, to: number) => {
    if (from === to) return;
    updateState((prev) => {
      const currentTitles =
        prev.titles && prev.titles.length > 0
          ? [...prev.titles]
          : [...defaultTitleList];
      const [moved] = currentTitles.splice(from, 1);
      currentTitles.splice(to, 0, moved);
      const renumbered = currentTitles.map((t, idx) => ({ ...t, id: idx + 1 }));
      return { ...prev, titles: renumbered };
    });
  };

  // Game logs handlers (記録１：試合ログ)
  const handleCopyAllLogs = () => {
    const logs = state.gameLogs || [];
    if (logs.length === 0) {
      showToast('コピーする試合ログがありません');
      return;
    }
    const formatted = logs
      .map((log) => {
        const circled = toCircledNumber(log.id);
        let text = `【第${log.id}回 ${circled}】(${log.timestamp})\n`;
        if (log.titleText) {
          text += `タイトル: ${log.titleText}\n`;
        }
        text += `お題 #${log.topicNumber}: ${log.topicText}\n`;
        if (log.isScoringMode) {
          const pScores = log.participants
            .map(
              (p, idx) =>
                `  ${toCircledNumber(idx + 1)} ${
                  p.rank ? `[${p.rank}位] ` : ''
                }${p.teamName ? `[${p.teamName}] ` : ''}${p.name}: ${p.score}点`
            )
            .join('\n');
          text += pScores;
          if (log.isWhaleMode && log.totalScore !== undefined) {
            text += `\n  🐋 全員合計: ${log.totalScore}点`;
          }
        } else {
          const pNames = log.participants
            .map(
              (p, idx) =>
                `  ${toCircledNumber(idx + 1)} ${
                  p.rank ? `[${p.rank}位] ` : ''
                }${p.teamName ? `[${p.teamName}] ` : ''}${p.name} (加点OFF)`
            )
            .join('\n');
          text += pNames;
        }

        if (log.answerLogs && log.answerLogs.length > 0) {
          text += '\n  【回答ログ】\n';
          text += log.answerLogs
            .map(
              (a, aIdx) =>
                `    ${aIdx + 1}. ${a.respondentName ? `[${a.respondentName}] ` : ''}${a.answerText}`
            )
            .join('\n');
        }

        return text;
      })
      .join('\n\n---\n\n');

    navigator.clipboard
      .writeText(formatted)
      .then(() => {
        showToast('試合ログをクリップボードにコピーしました！');
      })
      .catch(() => {
        showToast('コピーに失敗しました');
      });
  };

  const handleClearAllLogs = () => {
    setConfirmModal({
      isOpen: true,
      title: '試合ログの消去',
      message: '記録されたすべての試合ログを消去しますか？',
      onConfirm: () => {
        updateState((prev) => ({ ...prev, gameLogs: [] }));
        showToast('試合ログをすべて消去しました');
      },
    });
  };

  const handleDeleteLogItem = (logId: number) => {
    updateState((prev) => {
      const filtered = (prev.gameLogs || []).filter((l) => l.id !== logId);
      const renumbered = filtered.map((l, idx) => ({ ...l, id: idx + 1 }));
      return { ...prev, gameLogs: renumbered };
    });
    showToast('ログを削除しました');
  };

  // Drag and drop state for topics (お題の並び替え)
  const [draggedTopicIndex, setDraggedTopicIndex] = useState<number | null>(null);
  const [dragOverTopicIndex, setDragOverTopicIndex] = useState<number | null>(null);

  const handleTopicDragStart = (e: React.DragEvent, index: number) => {
    setDraggedTopicIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${index}`);
  };

  const handleTopicDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTopicIndex !== index) {
      setDragOverTopicIndex(index);
    }
  };

  const handleTopicDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedTopicIndex === null) return;
    if (draggedTopicIndex !== dropIndex) {
      reorderTopicItems(draggedTopicIndex, dropIndex);
    }
    setDraggedTopicIndex(null);
    setDragOverTopicIndex(null);
  };

  const handleTopicDragEnd = () => {
    setDraggedTopicIndex(null);
    setDragOverTopicIndex(null);
  };

  const reorderTopicItems = (fromIndex: number, toIndex: number) => {
    updateState((prev) => {
      const selectedItem = prev.topics.find((t) => t.id === prev.selectedTopicNumber);
      const reordered = reorderTopics(prev.topics, fromIndex, toIndex);
      let newSelected = prev.selectedTopicNumber;
      if (selectedItem) {
        const foundIdx = reordered.findIndex(
          (t) =>
            t === selectedItem ||
            (t.text === selectedItem.text && t.imageUrl === selectedItem.imageUrl)
        );
        if (foundIdx !== -1) {
          newSelected = foundIdx + 1;
        }
      }
      return {
        ...prev,
        topics: reordered,
        selectedTopicNumber: newSelected,
      };
    });
    showToast(`お題の並び順を更新しました（新 #${toIndex + 1}）`);
  };

  const handleMoveTopicUp = (index: number) => {
    if (index <= 0) return;
    reorderTopicItems(index, index - 1);
  };

  const handleMoveTopicDown = (index: number) => {
    if (index >= state.topics.length - 1) return;
    reorderTopicItems(index, index + 1);
  };

  // State & Handler for 『「何番」のお題を削除する』
  const [topicToDelete, setTopicToDelete] = useState<number>(1);

  const handleDeleteSpecificTopic = () => {
    if (state.topics.length <= 1) {
      alert('お題は最低1つ必要です。');
      return;
    }
    const target = Math.max(1, Math.min(state.topics.length, topicToDelete));
    updateState((prev) => {
      const newTopics = removeTopicAt(prev.topics, target);
      const newSelected = Math.min(prev.selectedTopicNumber, newTopics.length);
      return {
        ...prev,
        topics: newTopics,
        selectedTopicNumber: newSelected,
      };
    });
    showToast(`お題 ${target} を削除しました（以降のお題が1つ繰り上がりました）`);
    setTopicToDelete((prev) => Math.min(prev, Math.max(1, state.topics.length - 1)));
  };

  // Drag and drop state for participants (参加者の並び替え)
  const [draggedParticipantIndex, setDraggedParticipantIndex] = useState<number | null>(null);
  const [dragOverParticipantIndex, setDragOverParticipantIndex] = useState<number | null>(null);

  const handleParticipantDragStart = (e: React.DragEvent, index: number) => {
    setDraggedParticipantIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${index}`);
  };

  const handleParticipantDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverParticipantIndex !== index) {
      setDragOverParticipantIndex(index);
    }
  };

  const handleParticipantDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedParticipantIndex === null) return;
    if (draggedParticipantIndex !== dropIndex) {
      reorderParticipantItems(draggedParticipantIndex, dropIndex);
    }
    setDraggedParticipantIndex(null);
    setDragOverParticipantIndex(null);
  };

  const handleParticipantDragEnd = () => {
    setDraggedParticipantIndex(null);
    setDragOverParticipantIndex(null);
  };

  const reorderParticipantItems = (fromIndex: number, toIndex: number) => {
    updateState((prev) => {
      const reordered = reorderParticipants(prev.participants, fromIndex, toIndex);
      const activeIds = reordered
        .filter((p) => p.isParticipating && p.name.trim() !== '')
        .map((p) => p.id);
      return {
        ...prev,
        participants: reordered,
        activeParticipantOrder: activeIds,
      };
    });
    showToast(`参加者の並び順を更新しました（新 #${toIndex + 1}）`);
  };

  const handleMoveParticipantUp = (index: number) => {
    if (index <= 0) return;
    reorderParticipantItems(index, index - 1);
  };

  const handleMoveParticipantDown = (index: number) => {
    if (index >= state.participants.length - 1) return;
    reorderParticipantItems(index, index + 1);
  };

  // Add / Remove participant slots
  const handleAddParticipant = () => {
    updateState((prev) => {
      const nextId = prev.participants.length + 1;
      const newP: Participant = {
        id: nextId,
        name: '',
        isParticipating: false,
        score: 0,
      };
      return {
        ...prev,
        participants: [...prev.participants, newP],
      };
    });
    showToast('参加者の項目を追加しました');
  };

  const handleRemoveParticipant = () => {
    updateState((prev) => {
      if (prev.participants.length <= 1) return prev;
      const removedId = prev.participants[prev.participants.length - 1].id;
      const newParticipants = prev.participants.slice(0, -1);
      const newOrder = prev.activeParticipantOrder.filter((id) => id !== removedId);
      return {
        ...prev,
        participants: newParticipants,
        activeParticipantOrder: newOrder,
      };
    });
    showToast('参加者の項目を減らしました');
  };

  // Active participants in designated order
  const activeParticipants = getActiveOrderedParticipants(
    state.participants,
    state.activeParticipantOrder
  );

  // Participants who have names entered
  const participantsWithNames = state.participants.filter(
    (p) => p.name.trim() !== ''
  );

  // Current selected topic
  const currentTopic = state.topics.find(
    (t) => t.id === state.selectedTopicNumber
  );

  // Handler for counter
  const handleTopicNumberChange = (num: number) => {
    const validNum = Math.max(1, Math.min(state.topics.length, num));
    updateState((prev) => ({
      ...prev,
      selectedTopicNumber: validNum,
    }));
  };

  // Add topic
  const handleAddTopic = () => {
    updateState((prev) => {
      const nextId = prev.topics.length + 1;
      return {
        ...prev,
        topics: [...prev.topics, { id: nextId, text: '', isUsed: false }],
      };
    });
  };

  // Remove topic (bottom-most)
  const handleRemoveTopic = () => {
    updateState((prev) => {
      if (prev.topics.length <= 1) return prev;
      const newTopics = prev.topics.slice(0, -1);
      const newSelected = Math.min(prev.selectedTopicNumber, newTopics.length);
      return {
        ...prev,
        topics: newTopics,
        selectedTopicNumber: newSelected,
      };
    });
  };

  // Update specific topic text
  const handleTopicTextChange = (id: number, text: string) => {
    updateState((prev) => ({
      ...prev,
      topics: prev.topics.map((t) => (t.id === id ? { ...t, text } : t)),
    }));
  };

  // Toggle topic isUsed (使用済み)
  const handleTopicUsedToggle = (id: number, isUsed: boolean) => {
    updateState((prev) => ({
      ...prev,
      topics: prev.topics.map((t) => (t.id === id ? { ...t, isUsed } : t)),
    }));
  };

  // Upload image for topic (写真で一言)
  const handleTopicImageUpload = (
    id: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      updateState((prev) => ({
        ...prev,
        topics: prev.topics.map((t) =>
          t.id === id ? { ...t, imageUrl: result } : t
        ),
      }));
      showToast(`お題 ${id} に画像を登録しました`);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  // Remove image from topic
  const handleRemoveTopicImage = (id: number) => {
    updateState((prev) => ({
      ...prev,
      topics: prev.topics.map((t) =>
        t.id === id ? { ...t, imageUrl: undefined } : t
      ),
    }));
    showToast(`お題 ${id} の画像を解除しました`);
  };

  // Update participant name
  const handleParticipantNameChange = (id: number, name: string) => {
    updateState((prev) => ({
      ...prev,
      participants: prev.participants.map((p) =>
        p.id === id ? { ...p, name } : p
      ),
    }));
  };

  // Toggle participant participation switch (Max 14 allowed)
  const handleParticipantToggle = (id: number, isParticipating: boolean) => {
    if (isParticipating) {
      const activeCount = state.participants.filter(
        (p) => p.isParticipating && p.id !== id
      ).length;
      if (activeCount >= MAX_ACTIVE_PARTICIPANTS) {
        showToast(
          `※ 同時に参加できるのは最大${MAX_ACTIVE_PARTICIPANTS}名までです（15名以上はオンにできません）`
        );
        return;
      }
    }

    updateState((prev) => {
      const updated = prev.participants.map((p) =>
        p.id === id ? { ...p, isParticipating } : p
      );

      let newOrder = [...prev.activeParticipantOrder];
      if (isParticipating && !newOrder.includes(id)) {
        newOrder.push(id);
      }

      return {
        ...prev,
        participants: updated,
        activeParticipantOrder: newOrder,
      };
    });
  };

  // Update participant team name
  const handleParticipantTeamNameChange = (id: number, teamName: string) => {
    updateState((prev) => ({
      ...prev,
      participants: prev.participants.map((p) =>
        p.id === id ? { ...p, teamName } : p
      ),
    }));
  };

  // Download entire application state as a single JSON file
  const handleDownloadFullState = () => {
    const jsonStr = exportFullStateToJson(state);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    link.href = url;
    link.download = `flip_ogiri_full_backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('全設定ファイルをダウンロードしました');
  };

  // Upload and restore entire application state from JSON file
  const handleUploadFullState = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = parseFullStateFromJson(text);
      if (parsed.success && parsed.state) {
        updateState(parsed.state);
        showToast('全設定（お題・参加者・タイマー等）を正常に復元しました！');
      } else {
        alert(parsed.error || '設定ファイルの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Upload image icon for participant
  const handleImageUpload = (
    id: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      updateState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.id === id ? { ...p, avatarUrl: result } : p
        ),
      }));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  // Remove uploaded image icon
  const handleRemoveImage = (id: number) => {
    updateState((prev) => ({
      ...prev,
      participants: prev.participants.map((p) =>
        p.id === id ? { ...p, avatarUrl: undefined } : p
      ),
    }));
  };

  // Update participant order after drag-and-drop
  const handleOrderChange = (newOrderIds: number[]) => {
    updateState((prev) => ({
      ...prev,
      activeParticipantOrder: newOrderIds,
    }));
  };

  // Timer update handler
  const handleUpdateTimer = (updater: (prev: TimerState) => TimerState) => {
    updateState((prev) => ({
      ...prev,
      timer: updater(prev.timer),
    }));
  };

  // Score buttons config update
  const handleUpdateScoreButtons = (newButtons: string[]) => {
    updateState((prev) => ({
      ...prev,
      scoreButtons: newButtons,
    }));
  };

  // Participant individual score update
  const handleUpdateParticipantScore = (id: number, newScore: number) => {
    updateState((prev) => ({
      ...prev,
      participants: prev.participants.map((p) =>
        p.id === id ? { ...p, score: newScore } : p
      ),
    }));
  };

  // Reset all participants' scores
  const handleResetAllScores = () => {
    updateState((prev) => ({
      ...prev,
      participants: prev.participants.map((p) => ({ ...p, score: 0 })),
    }));
    showToast('全員の得点を0点にリセットしました');
  };

  // Download Topics as .txt file (includes images and isUsed status)
  const handleDownloadTopics = () => {
    const textContent = exportTopicsToText(state.topics);
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ogiri_topics_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('お題データ（写真・使用済み状態含む）をダウンロードしました');
  };

  // Upload Topics from .txt file
  const handleUploadTopics = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const parsed = parseTopicsFromText(content);
      if (parsed.length > 0) {
        updateState((prev) => ({
          ...prev,
          topics: parsed,
          selectedTopicNumber: Math.min(prev.selectedTopicNumber, parsed.length),
        }));
        showToast(`${parsed.length} 件のお題データを読み込みました`);
      } else {
        alert('読み込めるお題が見つかりませんでした。テキスト形式を確認してください。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Download Participants as .txt file
  const handleDownloadParticipants = () => {
    const textContent = exportParticipantsToText(state.participants);
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ogiri_participants_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('参加者データをダウンロードしました（アイコン画像も保持されています）');
  };

  // Upload Participants from .txt file
  const handleUploadParticipants = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const parsed = parseParticipantsFromText(content);
      if (parsed.length > 0) {
        updateState((prev) => {
          const newParticipants = prev.participants.map((orig, idx) => {
            const imp = parsed[idx];
            if (!imp) return orig;
            return {
              ...orig,
              name: imp.name || '',
              avatarUrl: imp.avatarUrl || orig.avatarUrl,
              isParticipating: imp.isParticipating ?? (imp.name.trim() !== ''),
              score: imp.score ?? 0,
            };
          });

          const newOrder = newParticipants
            .filter((p) => p.name.trim() !== '' && p.isParticipating)
            .map((p) => p.id);

          return {
            ...prev,
            participants: newParticipants,
            activeParticipantOrder: newOrder.length > 0 ? newOrder : prev.activeParticipantOrder,
          };
        });
        showToast(`${parsed.length} 名の参加者データを読み込みました`);
      } else {
        alert('参加者データを読み込めませんでした。ファイルを確認してください。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const theme = getPaletteTheme(state.colorPalette);

  return (
    <div
      style={{ zoom, backgroundColor: theme.bgHex }}
      className={`min-h-screen ${theme.textColorClass} font-bold p-2 sm:p-3.5 lg:p-5 transition-colors duration-200`}
    >
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-neutral-950 text-white px-5 py-2.5 rounded-full shadow-2xl border-2 border-amber-400 text-sm font-black flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 画面の最上段: ページ移動ナビゲーション (スライド切り替え) */}
      {/* ======================================================== */}
      <nav
        aria-label="コンソールページ切り替え"
        className="max-w-6xl mx-auto mb-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 border-2 border-neutral-950 shadow-md transition-all sticky top-2 z-40"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Page Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {/* P.00: 記録２：データベース */}
            <button
              type="button"
              onClick={() => setCurrentPage('records2_db')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl font-black text-xs sm:text-sm border-2 transition-all cursor-pointer whitespace-nowrap ${
                currentPage === 'records2_db'
                  ? 'bg-neutral-950 text-indigo-300 border-neutral-950 shadow-md scale-102 ring-2 ring-indigo-400'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300'
              }`}
            >
              <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
              <span>記録２：データベース</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-400 text-neutral-950 font-black">
                P.00
              </span>
            </button>

            {/* P.0: 記録１：試合ログ */}
            <button
              type="button"
              onClick={() => setCurrentPage('logs')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl font-black text-xs sm:text-sm border-2 transition-all cursor-pointer whitespace-nowrap ${
                currentPage === 'logs'
                  ? 'bg-neutral-950 text-emerald-300 border-neutral-950 shadow-md scale-102 ring-2 ring-emerald-400'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
              <span>記録１：試合ログ</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-400 text-neutral-950 font-black">
                P.0
              </span>
            </button>

            {/* P.1: メインコンソール */}
            <button
              type="button"
              onClick={() => setCurrentPage('main')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl font-black text-xs sm:text-sm border-2 transition-all cursor-pointer whitespace-nowrap ${
                currentPage === 'main'
                  ? 'bg-neutral-950 text-amber-300 border-neutral-950 shadow-md scale-102 ring-2 ring-amber-400'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>メインコンソール</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-neutral-950 font-black">
                P.1
              </span>
            </button>

            {/* P.2: サブコンソール１：準備 */}
            <button
              type="button"
              onClick={() => setCurrentPage('sub1_prep')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl font-black text-xs sm:text-sm border-2 transition-all cursor-pointer whitespace-nowrap ${
                currentPage === 'sub1_prep'
                  ? 'bg-neutral-950 text-sky-300 border-neutral-950 shadow-md scale-102 ring-2 ring-sky-400'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
              <span>サブコンソール１：準備</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-400 text-neutral-950 font-black">
                P.2
              </span>
            </button>

            {/* P.3: サブコンソール２：プリセット */}
            <button
              type="button"
              onClick={() => setCurrentPage('sub2_preset')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl font-black text-xs sm:text-sm border-2 transition-all cursor-pointer whitespace-nowrap ${
                currentPage === 'sub2_preset'
                  ? 'bg-neutral-950 text-purple-300 border-neutral-950 shadow-md scale-102 ring-2 ring-purple-400'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
              <span>サブコンソール２：プリセット</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-400 text-neutral-950 font-black">
                P.3
              </span>
            </button>
          </div>

          {/* Slide Arrow Navigation Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {currentPage === 'records2_db' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage('logs')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl font-black text-xs border-2 border-emerald-900 shadow transition cursor-pointer"
                  title="右へスライドして試合ログへ移動"
                >
                  <span>試合ログへ</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('main')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 bg-neutral-950 hover:bg-neutral-800 text-amber-300 px-3.5 py-2 rounded-xl font-black text-xs border-2 border-neutral-950 shadow transition cursor-pointer"
                  title="メインコンソールへ直接移動"
                >
                  <span>メインへ</span>
                </button>
              </div>
            )}

            {currentPage === 'logs' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage('records2_db')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 bg-indigo-700 hover:bg-indigo-800 text-white px-3.5 py-2 rounded-xl font-black text-xs border-2 border-indigo-900 shadow transition cursor-pointer"
                  title="左へスライドしてデータベースへ移動"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>データベースへ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('main')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 bg-neutral-950 hover:bg-neutral-800 text-amber-300 px-3.5 py-2 rounded-xl font-black text-xs border-2 border-neutral-950 shadow transition cursor-pointer"
                  title="右へスライドしてメインコンソールへ移動"
                >
                  <span>メインへ</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {currentPage === 'main' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage('logs')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl font-black text-xs border-2 border-emerald-900 shadow transition cursor-pointer"
                  title="左へスライドして試合ログへ移動"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>試合ログへ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('sub1_prep')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-xl font-black text-xs border-2 border-sky-800 shadow transition cursor-pointer"
                  title="右へスライドして準備ページへ移動"
                >
                  <span>準備ページへ</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {currentPage === 'sub1_prep' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage('main')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 bg-neutral-950 hover:bg-neutral-800 text-amber-300 px-3.5 py-2 rounded-xl font-black text-xs border-2 border-neutral-950 shadow transition cursor-pointer"
                  title="左へスライドしてメインコンソールへ戻る"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>メインへ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('sub2_preset')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl font-black text-xs border-2 border-purple-800 shadow transition cursor-pointer"
                  title="右へスライドしてプリセットページへ移動"
                >
                  <span>プリセットへ</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {currentPage === 'sub2_preset' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage('sub1_prep')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 bg-sky-700 hover:bg-sky-800 text-white px-3.5 py-2 rounded-xl font-black text-xs border-2 border-sky-900 shadow transition cursor-pointer"
                  title="左へスライドして準備ページへ戻る"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>準備ページへ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('main')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 bg-neutral-950 hover:bg-neutral-800 text-amber-300 px-3.5 py-2 rounded-xl font-black text-xs border-2 border-neutral-950 shadow transition cursor-pointer"
                  title="メインコンソールへ直接戻る"
                >
                  <span>メインへ</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Top Header */}
      <header
        className={`max-w-6xl mx-auto mb-3 sm:mb-4 rounded-xl p-3 sm:p-4 border-2 shadow-md transition-colors ${theme.headerBgClass}`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="w-full md:w-auto">
            {/* Top row with Zoom Control and status */}
            <div className="flex flex-wrap items-center justify-between md:justify-start gap-2.5 mb-2">
              {/* Zoom Control at top left */}
              <ZoomControl
                zoom={zoom}
                onZoomChange={handleZoomChange}
                isDark={theme.isDark}
              />
              <div className="flex items-center gap-2">
                <span className="bg-neutral-950 text-[#FEF9C3] px-2.5 py-0.5 rounded text-xs tracking-wider uppercase font-black">
                  CONSOLE
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-100 border border-emerald-600 px-2 py-0.5 rounded-full font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  リアルタイム同期稼働中
                </span>
              </div>
            </div>
            <h1
              className={`text-xl sm:text-2xl font-black tracking-tight ${theme.textColorClass}`}
            >
              フリップ大喜利 コンソール画面 (運営操作用)
            </h1>
            {/* Requested build date below title */}
            <p
              className={`text-[11px] font-mono font-bold tracking-tight ${theme.subTextClass}`}
            >
              build : 2026/10/26
            </p>
            <p className={`text-xs sm:text-sm font-bold mt-1 ${theme.subTextClass}`}>
              お題・タイマー・参加状況・得点を手元でリアルタイム制御し、モニター画面に即時反映します。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={onOpenMonitor}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-[#FEF9C3] px-4 py-2.5 rounded-lg border-2 border-neutral-950 shadow hover:shadow-lg transition cursor-pointer font-black text-sm"
              title="別ウィンドウでモニター画面を開き、拡張ディスプレイに移動させて全画面化してください"
            >
              <ExternalLink className="w-4 h-4" />
              <span>別ウィンドウでモニター画面を開く</span>
            </button>
            <button
              type="button"
              onClick={onSwitchToMonitorView}
              className="inline-flex items-center justify-center gap-1.5 bg-amber-200 hover:bg-amber-300 text-neutral-950 px-3.5 py-2.5 rounded-lg border-2 border-neutral-950 shadow transition cursor-pointer text-sm font-bold"
              title="この画面内でモニター表示を直接確認する"
            >
              <Tv className="w-4 h-4" />
              <span>モニター確認</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto overflow-hidden">
        {/* Animated Sliding Horizontal Container (5 Pages: Records2 DB, Logs, Main, Prep, Preset) */}
        <div
          style={{
            transform:
              currentPage === 'records2_db'
                ? 'translateX(0%)'
                : currentPage === 'logs'
                ? 'translateX(-20%)'
                : currentPage === 'main'
                ? 'translateX(-40%)'
                : currentPage === 'sub1_prep'
                ? 'translateX(-60%)'
                : 'translateX(-80%)',
          }}
          className="flex transition-transform duration-300 ease-in-out w-[500%]"
        >
          {/* ======================================================== */}
          {/* ページ00: 記録２：データベース */}
          {/* ======================================================== */}
          <div className="w-1/5 pr-2 sm:pr-3 flex-shrink-0 space-y-6">
            <RecordsDatabaseView
              gameLogs={state.gameLogs || []}
              participants={state.participants}
              theme={theme}
              onNavigateToLogs={() => setCurrentPage('logs')}
              onNavigateToMain={() => setCurrentPage('main')}
              showToast={showToast}
            />
          </div>

          {/* ======================================================== */}
          {/* ページ0: 記録１：試合ログ */}
          {/* ======================================================== */}
          <div className="w-1/5 px-2 sm:px-3 flex-shrink-0 space-y-6">
            {/* Header Card */}
            <div
              className={`rounded-xl border-2 p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                theme.isDark
                  ? 'bg-emerald-950/40 border-emerald-800'
                  : 'bg-emerald-50 border-emerald-300'
              }`}
            >
              <div>
                <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded font-black">
                  記録１
                </span>
                <h2 className={`text-lg sm:text-xl font-black mt-1 ${theme.textColorClass}`}>
                  【試合ログ】リアルタイム記録
                </h2>
                <p className={`text-xs font-bold mt-0.5 ${theme.subTextClass}`}>
                  モニター画面の「ログを保存」ボタンを押した際のお題・参加者・得点データを記録・蓄積します。
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage('records2_db')}
                  className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg border-2 border-indigo-800 shadow-xs font-black text-xs cursor-pointer transition"
                  title="データベース（記録２）へ移動"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>データベースへ</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAllLogs}
                  disabled={!state.gameLogs || state.gameLogs.length === 0}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg border-2 border-emerald-800 shadow-xs font-black text-xs cursor-pointer disabled:cursor-not-allowed transition"
                  title="保存されている全ログをクリップボードにコピー"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>全ログをコピー</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAllLogs}
                  disabled={!state.gameLogs || state.gameLogs.length === 0}
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-red-50 text-red-700 hover:text-red-800 disabled:opacity-40 px-3 py-1.5 rounded-lg border-2 border-neutral-950 shadow-xs font-black text-xs cursor-pointer disabled:cursor-not-allowed transition"
                  title="保存されている全ログを消去"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>全消去</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage('main')}
                  className="inline-flex items-center gap-1 bg-neutral-950 hover:bg-neutral-800 text-amber-300 px-3 py-1.5 rounded-lg font-black text-xs border-2 border-neutral-950 shadow cursor-pointer transition"
                  title="メインコンソールへ移動"
                >
                  <span>メインへ</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Logs List Container */}
            <section
              className={`rounded-xl border-2 p-4 sm:p-6 shadow-md space-y-4 transition-colors ${theme.sectionBgClass}`}
            >
              <div
                className={`flex items-center justify-between border-b-2 pb-2 ${theme.borderClass}`}
              >
                <div className="flex items-center gap-2">
                  <ScrollText className="w-5 h-5 text-emerald-600" />
                  <h3 className={`text-base sm:text-lg font-black ${theme.textColorClass}`}>
                    保存された試合履歴一覧
                  </h3>
                  <span className="text-xs bg-emerald-100 text-emerald-900 border border-emerald-500 px-2 py-0.5 rounded font-black">
                    合計 {state.gameLogs?.length || 0} 件
                  </span>
                </div>
              </div>

              {!state.gameLogs || state.gameLogs.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-3">
                  <ScrollText className="w-10 h-10 text-neutral-400 mx-auto" />
                  <p className="text-sm font-black text-neutral-700 dark:text-neutral-300">
                    まだ保存された試合ログがありません
                  </p>
                  <p className="text-xs font-bold text-neutral-500 max-w-md mx-auto leading-relaxed">
                    モニター画面（上部ヘッダー）の「ログを保存」ボタンを押すと、その時点のお題・参加者・得点状況がここに①②③…と自動で蓄積されます。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {state.gameLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-white dark:bg-neutral-900 rounded-xl border-2 border-neutral-950 p-4 shadow-md space-y-3"
                    >
                      {/* Log Card Header */}
                      <div className="flex items-center justify-between border-b pb-2 border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center border border-neutral-900 shadow-xs">
                            {toCircledNumber(log.id)}
                          </span>
                          <span className="font-black text-sm text-neutral-950 dark:text-neutral-100">
                            第{log.id}回 記録
                          </span>
                          <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                            {log.timestamp}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteLogItem(log.id)}
                          className="text-neutral-400 hover:text-red-600 p-1 rounded transition cursor-pointer"
                          title="このログを削除"
                          aria-label={`第${log.id}回のログを削除`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Title Display if present (表示順序: お題・参加者より手前) */}
                      {log.titleText && (
                        <div className="bg-sky-50 dark:bg-sky-950/40 p-2.5 rounded-lg border border-sky-300 dark:border-sky-800 text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-start gap-2">
                          <span className="bg-sky-700 text-white px-1.5 py-0.5 rounded text-[10px] font-black flex-shrink-0">
                            タイトル
                          </span>
                          <span className="flex-1 break-words font-black">
                            {log.titleText}
                          </span>
                        </div>
                      )}

                      {/* Topic Display */}
                      <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-300 dark:border-amber-800 text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-start gap-2">
                        <span className="bg-neutral-950 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-black flex-shrink-0">
                          お題 #{log.topicNumber}
                        </span>
                        <span className="flex-1 break-words">
                          {log.topicText || '（お題テキスト未入力）'}
                        </span>
                      </div>

                      {/* Participants & Scores Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {log.participants.map((p, pIdx) => (
                          <div
                            key={p.id}
                            className="bg-neutral-50 dark:bg-neutral-800/80 p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="text-[11px] text-neutral-600 dark:text-neutral-400 font-bold truncate flex-1 min-w-0">
                                <span className="font-black mr-1 text-neutral-900 dark:text-neutral-200">
                                  {toCircledNumber(pIdx + 1)}
                                </span>
                                {p.teamName ? (
                                  <span className="text-neutral-500 font-normal mr-1">
                                    [{p.teamName}]
                                  </span>
                                ) : null}
                                <span className="text-neutral-950 dark:text-neutral-100 font-bold">
                                  {p.name}
                                </span>
                              </div>
                              {p.rank !== undefined && (
                                <span
                                  className={`text-[10px] font-black px-1.5 py-0.2 rounded border flex-shrink-0 ${
                                    p.rank === 1
                                      ? 'bg-amber-300 text-neutral-950 border-amber-500 shadow-xs'
                                      : p.rank === 2
                                      ? 'bg-slate-200 text-neutral-900 border-slate-400'
                                      : p.rank === 3
                                      ? 'bg-amber-700/20 text-amber-900 dark:text-amber-200 border-amber-600/40'
                                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border-neutral-400'
                                  }`}
                                >
                                  {p.rank === 1 ? '👑 1位' : `${p.rank}位`}
                                </span>
                              )}
                            </div>
                            {log.isScoringMode ? (
                              <div className="text-right font-black text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                                {p.score} <span className="text-[10px]">点</span>
                              </div>
                            ) : (
                              <div className="text-right text-[10px] text-neutral-400 font-bold mt-1">
                                加点OFF
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Whale Mode Total if applicable */}
                      {log.isWhaleMode && log.isScoringMode && log.totalScore !== undefined && (
                        <div className="bg-sky-100 dark:bg-sky-950/50 p-2 rounded-lg border border-sky-400 dark:border-sky-700 flex items-center justify-between text-xs font-black text-sky-900 dark:text-sky-200">
                          <span className="flex items-center gap-1.5">
                            <span>🐋 ホエールモード</span>
                            <span className="text-[10px] font-normal text-sky-700 dark:text-sky-300">
                              全員合計得点
                            </span>
                          </span>
                          <span className="text-sm font-black text-sky-950 dark:text-sky-100">
                            {log.totalScore} 点
                          </span>
                        </div>
                      )}

                      {/* Answer Logs Display if present (表示順序: 参加者の下部、カラーパレットの色を背景・フォントに適用) */}
                      {log.answerLogs && log.answerLogs.length > 0 && (
                        <div
                          className={`p-3 rounded-lg border-2 space-y-2 ${
                            theme.isDark
                              ? 'bg-neutral-900/90 border-neutral-700'
                              : 'bg-neutral-50 border-neutral-300'
                          }`}
                        >
                          <div className={`flex items-center gap-1.5 text-xs font-black ${theme.textColorClass}`}>
                            <ScrollText className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                            <span>回答ログ ({log.answerLogs.length}件)</span>
                          </div>
                          <div className="space-y-1.5">
                            {log.answerLogs.map((aLog, aIdx) => {
                              const itemPalette = log.colorPalette || state.colorPalette || 'yellow';
                              const itemTheme = getPaletteTheme(itemPalette);
                              return (
                                <div
                                  key={aLog.id || aIdx}
                                  style={{
                                    backgroundColor: itemTheme.bgHex,
                                    color: itemTheme.isDark ? '#F9FAFB' : '#0A0A0A',
                                    borderColor: itemTheme.isDark ? '#525252' : '#0A0A0A',
                                  }}
                                  className="px-3 py-2 rounded-lg border-2 text-xs flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-2 shadow-xs transition-colors"
                                >
                                  <span className="text-[10px] font-black bg-amber-200 text-neutral-900 px-1.5 py-0.5 rounded border border-neutral-900 flex-shrink-0">
                                    #{aIdx + 1}
                                  </span>
                                  {aLog.respondentName && (
                                    <span
                                      className={`font-black px-1.5 py-0.5 rounded text-[11px] border flex-shrink-0 ${
                                        itemTheme.isDark
                                          ? 'bg-neutral-800 text-amber-300 border-neutral-600'
                                          : 'bg-amber-100 text-neutral-950 border-neutral-900'
                                      }`}
                                    >
                                      {aLog.respondentName}
                                    </span>
                                  )}
                                  <span className="font-bold flex-1 break-words leading-relaxed">
                                    {aLog.answerText}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Page 0 Bottom Navigation */}
            <div className="pt-2 pb-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentPage('records2_db')}
                className="inline-flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-3 rounded-xl font-black text-sm cursor-pointer shadow-lg border-2 border-indigo-900 transition hover:scale-102"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>記録２：データベース へ移動</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage('main')}
                className="inline-flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-amber-300 px-6 py-3 rounded-xl font-black text-sm cursor-pointer shadow-lg border-2 border-neutral-950 transition hover:scale-102"
              >
                <SlidersHorizontal className="w-5 h-5" />
                <span>メインコンソール（本番進行）へ移動</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* ページ1: メインコンソール (本番進行・リアルタイム操作) */}
          {/* ======================================================== */}
          <div className="w-1/5 px-2 sm:px-3 flex-shrink-0 space-y-6">
            {/* 最上段: 【リアルタイムコントロール】 (現在モニター表示中の時間, テキストの表示, コントロールパネル) */}
            <section
              className={`rounded-xl border-2 p-4 sm:p-6 shadow-md space-y-5 transition-colors ${theme.sectionBgClass}`}
            >
          <div
            className={`border-b-2 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${theme.borderClass}`}
          >
            <div>
              <span className="text-xs bg-amber-400 text-neutral-950 px-2 py-0.5 rounded border border-neutral-900 font-black">
                最重要・高頻度操作
              </span>
              <h2 className="text-lg sm:text-xl font-black mt-1">
                【リアルタイムコントロール】
              </h2>
              <p className={`text-xs font-bold mt-0.5 ${theme.subTextClass}`}>
                本番中に多用する「タイマー時間」「テキスト（お題）の表示」「回答者の得点状況」を集中配置しています。
              </p>
            </div>

            {/* 全設定ダウンロード & アップロード ボタン */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fullStateFileInputRef}
                accept=".json,application/json"
                onChange={handleUploadFullState}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleDownloadFullState}
                className="inline-flex items-center gap-1.5 bg-amber-200 hover:bg-amber-300 text-neutral-950 px-3 py-1.5 rounded-lg border-2 border-neutral-950 shadow-xs font-black text-xs cursor-pointer transition"
                title="現在設定されている全項目（お題画像・参加者・タイマー等）を1つのJSONファイルとして保存します"
              >
                <Download className="w-3.5 h-3.5" />
                <span>全設定をダウンロード</span>
              </button>

              <button
                type="button"
                onClick={() => fullStateFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-neutral-100 text-neutral-950 px-3 py-1.5 rounded-lg border-2 border-neutral-950 shadow-xs font-black text-xs cursor-pointer transition"
                title="保存した全設定JSONファイルを読み込んで一括復元します"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>全設定をアップロード</span>
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* プリセットの読み込み (Subconsole 2 で作成した設定の呼び出し) */}
          {/* ======================================================== */}
          <div className="bg-white p-4 sm:p-5 rounded-lg border-2 border-neutral-950 shadow-sm space-y-3 text-neutral-950">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                <h3 className="text-base sm:text-lg font-black text-neutral-950">
                  プリセットの読み込み
                </h3>
                <span className="text-xs bg-purple-100 text-purple-900 px-2 py-0.5 rounded font-bold border border-purple-400">
                  P.3連動
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm font-bold text-neutral-700">
                  プリセットを使用する:
                </span>
                <Switch
                  id="main-preset-mode-switch"
                  checked={!!state.isPresetModeEnabled}
                  onChange={(checked) =>
                    updateState((prev) => ({
                      ...prev,
                      isPresetModeEnabled: checked,
                    }))
                  }
                  size="md"
                />
              </div>
            </div>

            {state.isPresetModeEnabled && (
              <div className="pt-2 space-y-3 border-t border-purple-200 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <label htmlFor="preset-select" className="text-xs font-black text-neutral-900 flex-shrink-0">
                    適用するプリセット:
                  </label>
                  <select
                    id="preset-select"
                    value={state.selectedPresetId || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleApplyPreset(e.target.value);
                      } else {
                        updateState((prev) => ({ ...prev, selectedPresetId: null }));
                      }
                    }}
                    className="flex-1 bg-white text-neutral-950 font-bold px-3 py-2 rounded-lg border-2 border-neutral-950 shadow-xs focus:ring-2 focus:ring-purple-500 text-xs sm:text-sm cursor-pointer"
                  >
                    <option value="">-- プリセットを選択してください --</option>
                    {(state.presets || []).map((preset, idx) => (
                      <option key={preset.id} value={preset.id}>
                        {getPresetDisplayName(preset, idx, state.titles)}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setCurrentPage('sub2_preset')}
                    className="inline-flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-bold text-xs border border-purple-900 shadow-xs transition cursor-pointer flex-shrink-0"
                    title="サブコンソール２：プリセット へ移動して編集"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>プリセット一覧・編集 (P.3)</span>
                  </button>
                </div>

                {state.selectedPresetId && (() => {
                  const currentPreset = (state.presets || []).find((p) => p.id === state.selectedPresetId);
                  if (!currentPreset) return null;
                  const idx = (state.presets || []).findIndex((p) => p.id === state.selectedPresetId);
                  const titleObj = currentPreset.selectedTitleNumber ? state.titles?.[currentPreset.selectedTitleNumber - 1] : undefined;
                  const topicObj = currentPreset.selectedTopicNumber ? state.topics?.[currentPreset.selectedTopicNumber - 1] : undefined;
                  return (
                    <div className="p-2.5 bg-purple-50/80 rounded-md border-2 border-purple-300 text-xs space-y-1 text-neutral-950">
                      <div className="font-black text-purple-950">
                        選択中: {getPresetDisplayName(currentPreset, idx, state.titles)}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-neutral-700">
                        <span>
                          タイトル: {currentPreset.isTitleEnabled ? (titleObj?.text ? `「${titleObj.text}」` : `#${currentPreset.selectedTitleNumber}`) : '（設定なし）'}
                        </span>
                        <span>
                          お題: {currentPreset.isTopicEnabled ? (topicObj?.text ? `「${topicObj.text.slice(0, 15)}...」` : `#${currentPreset.selectedTopicNumber}`) : '（設定なし）'}
                        </span>
                        <span>
                          参加者: {currentPreset.isParticipantsEnabled ? `${currentPreset.activeParticipantIds?.length || 0}名` : '（設定なし）'}
                        </span>
                        <span>
                          タイマー: {currentPreset.isCustomTimerEnabled && currentPreset.customTimer ? `${currentPreset.customTimer.totalMinutes}分${currentPreset.customTimer.totalSeconds}秒` : '（現在の設定を維持）'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* 開始前後の操作 (左・中央・右の3分割ワンタッチコントロール) */}
          {/* ======================================================== */}
          <div className="bg-neutral-100 dark:bg-neutral-900/80 p-4 sm:p-5 rounded-lg border-2 border-neutral-950 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950 px-2 py-0.5 rounded font-black">
                  ワンタッチ進行
                </span>
                <h3 className="text-base sm:text-lg font-black text-neutral-950 dark:text-neutral-100">
                  開始前後の操作
                </h3>
              </div>
              <span className={`text-xs font-bold ${theme.subTextClass} hidden sm:inline`}>
                試合前後の表示切り替え・ログ記録をワンタップで実行
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
              {/* 左側: タイトル・お題・参加者を隠す */}
              <button
                type="button"
                onClick={handleHideAllMainDisplays}
                className="bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl border-2 border-neutral-950 p-3.5 shadow flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer active:scale-98 min-h-[96px]"
                title="タイトル・お題・参加者の表示スイッチを3つ同時にOFFにします"
              >
                <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center">
                  <EyeOff className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-amber-300">
                    タイトル・お題・参加者を隠す
                  </div>
                  <div className="text-[10px] text-neutral-300 font-bold mt-0.5">
                    3つの表示スイッチを一括OFF
                  </div>
                </div>
              </button>

              {/* 中央: 縦並び上から「タイトルの表示」「参加者の表示」「お題の表示」 */}
              <div className="flex flex-col gap-2 justify-between">
                {/* 1. タイトルの表示 */}
                <button
                  type="button"
                  onClick={handleShowTitle}
                  className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg border-2 border-neutral-950 font-black text-xs transition cursor-pointer shadow-xs active:scale-98 ${
                    state.isTitleVisible
                      ? 'bg-sky-500 text-white ring-2 ring-sky-300'
                      : 'bg-white hover:bg-sky-50 text-neutral-950 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                  title="「タイトルを表示する」スイッチをONにします"
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        state.isTitleVisible ? 'bg-white animate-pulse' : 'bg-neutral-400'
                      }`}
                    />
                    <span>タイトルの表示</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-neutral-950/20">
                    {state.isTitleVisible ? '表示中(ON)' : 'OFF'}
                  </span>
                </button>

                {/* 2. 参加者の表示 */}
                <button
                  type="button"
                  onClick={handleShowParticipants}
                  className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg border-2 border-neutral-950 font-black text-xs transition cursor-pointer shadow-xs active:scale-98 ${
                    state.isParticipantsVisible
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                      : 'bg-white hover:bg-emerald-50 text-neutral-950 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                  title="「参加者表示」スイッチをONにします"
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        state.isParticipantsVisible ? 'bg-white animate-pulse' : 'bg-neutral-400'
                      }`}
                    />
                    <span>参加者の表示</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-neutral-950/20">
                    {state.isParticipantsVisible ? '表示中(ON)' : 'OFF'}
                  </span>
                </button>

                {/* 3. お題の表示 */}
                <button
                  type="button"
                  onClick={handleShowTopic}
                  className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg border-2 border-neutral-950 font-black text-xs transition cursor-pointer shadow-xs active:scale-98 ${
                    state.isTopicVisible
                      ? 'bg-amber-400 text-neutral-950 ring-2 ring-amber-300'
                      : 'bg-white hover:bg-amber-50 text-neutral-950 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                  title="「お題の表示」スイッチをONにします"
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        state.isTopicVisible ? 'bg-neutral-950 animate-pulse' : 'bg-neutral-400'
                      }`}
                    />
                    <span>お題の表示</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-neutral-950/20">
                    {state.isTopicVisible ? '表示中(ON)' : 'OFF'}
                  </span>
                </button>
              </div>

              {/* 右側: ログの保存 */}
              <button
                type="button"
                onClick={handleSaveLogClick}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl border-2 border-neutral-950 p-3.5 shadow flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer active:scale-98 min-h-[96px]"
                title="現在のタイトル・お題・参加者・得点を試合ログに保存します"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center">
                  <BookmarkPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-white">
                    ログの保存
                  </div>
                  <div className="text-[10px] text-emerald-100 font-bold mt-0.5">
                    現在の試合状況を記録１に保存
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 1. 「現在モニター表示中の時間」のボックス */}
          <TimerControl
            timer={state.timer}
            onUpdateTimer={handleUpdateTimer}
            mode="display_only"
          />

          {/* 2. 「お題・タイトルの表示」のボックス */}
          <div className="bg-[#FFFDE7] p-3.5 sm:p-4 rounded-lg border-2 border-neutral-950 shadow-sm space-y-3.5">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-neutral-300 pb-2">
              <span className="w-3 h-3 rounded-full bg-neutral-950" />
              <h3 className="text-base sm:text-lg font-black text-neutral-950">
                お題・タイトルの表示
              </h3>
            </div>

            {/* お題の表示エリア */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-amber-400 text-neutral-950 px-2 py-0.5 rounded font-black border border-neutral-900">
                    お題
                  </span>
                  <span className="text-xs sm:text-sm font-black text-neutral-900">
                    お題の表示設定
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Topic Font Size adjustment */}
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border-2 border-neutral-950 shadow-xs">
                    <span className="text-xs font-bold text-neutral-700">
                      フォントサイズ:
                    </span>
                    <button
                      type="button"
                      aria-label="お題のフォントサイズを小さくする"
                      disabled={(state.topicFontSizeOffset ?? 0) <= -4}
                      onClick={() =>
                        updateState((prev) => ({
                          ...prev,
                          topicFontSizeOffset: (prev.topicFontSizeOffset ?? 0) - 1,
                        }))
                      }
                      className="w-7 h-7 rounded border border-neutral-950 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 disabled:opacity-30 disabled:hover:bg-amber-100 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed font-black"
                    >
                      <Minus className="w-3.5 h-3.5 text-neutral-950" />
                    </button>
                    <span className="w-8 text-center text-xs font-black text-neutral-950 select-none">
                      {(state.topicFontSizeOffset ?? 0) === 0
                        ? '標準'
                        : (state.topicFontSizeOffset ?? 0) > 0
                        ? `+${state.topicFontSizeOffset}`
                        : `${state.topicFontSizeOffset}`}
                    </span>
                    <button
                      type="button"
                      aria-label="お題のフォントサイズを大きくする"
                      disabled={(state.topicFontSizeOffset ?? 0) >= 8}
                      onClick={() =>
                        updateState((prev) => ({
                          ...prev,
                          topicFontSizeOffset: (prev.topicFontSizeOffset ?? 0) + 1,
                        }))
                      }
                      className="w-7 h-7 rounded border border-neutral-950 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 disabled:opacity-30 disabled:hover:bg-amber-100 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed font-black"
                    >
                      <Plus className="w-3.5 h-3.5 text-neutral-950" />
                    </button>
                  </div>

                  {/* Topic Number Counter */}
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border-2 border-neutral-950 shadow-xs">
                    <span className="text-xs font-bold text-neutral-700">
                      お題番号:
                    </span>
                    <button
                      type="button"
                      aria-label="お題番号を減らす"
                      disabled={state.selectedTopicNumber <= 1}
                      onClick={() =>
                        handleTopicNumberChange(state.selectedTopicNumber - 1)
                      }
                      className="w-7 h-7 rounded border border-neutral-950 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 disabled:opacity-30 disabled:hover:bg-amber-100 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Minus className="w-3.5 h-3.5 text-neutral-950" />
                    </button>

                    <input
                      type="number"
                      min={1}
                      max={state.topics.length}
                      value={state.selectedTopicNumber}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          handleTopicNumberChange(val);
                        }
                      }}
                      className="w-12 h-7 text-center text-sm font-black border-2 border-neutral-950 rounded bg-white text-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />

                    <button
                      type="button"
                      aria-label="お題番号を増やす"
                      disabled={state.selectedTopicNumber >= state.topics.length}
                      onClick={() =>
                        handleTopicNumberChange(state.selectedTopicNumber + 1)
                      }
                      className="w-7 h-7 rounded border border-neutral-950 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 disabled:opacity-30 disabled:hover:bg-amber-100 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5 text-neutral-950" />
                    </button>

                    <span className="text-xs text-neutral-600 font-bold ml-0.5">
                      / {state.topics.length}
                    </span>
                  </div>

                  {/* Topic Display Switch */}
                  <div className="bg-white px-2.5 py-1 rounded-lg border-2 border-neutral-950 shadow-xs">
                    <Switch
                      checked={state.isTopicVisible}
                      onChange={(checked) =>
                        updateState((prev) => ({
                          ...prev,
                          isTopicVisible: checked,
                        }))
                      }
                      onLabel="表示する"
                      offLabel="隠す"
                      label="お題:"
                    />
                  </div>
                </div>
              </div>

              {/* Current topic preview */}
              <div className="bg-white p-2.5 rounded border border-neutral-900/60 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs px-2 py-0.5 bg-neutral-950 text-white rounded font-black">
                    選択中 [#{state.selectedTopicNumber}]
                  </span>
                  {currentTopic?.isUsed && (
                    <span className="text-xs px-1.5 py-0.5 bg-neutral-400 text-neutral-950 rounded font-black border border-neutral-700">
                      使用済み
                    </span>
                  )}
                  {currentTopic?.imageUrl && (
                    <span className="text-xs px-1.5 py-0.5 bg-amber-300 text-neutral-950 rounded font-black border border-neutral-900">
                      写真付き
                    </span>
                  )}
                </div>

                {currentTopic?.imageUrl && (
                  <div className="w-9 h-9 rounded border border-neutral-900 overflow-hidden bg-neutral-100 flex-shrink-0">
                    <img
                      src={currentTopic.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <p className="text-xs sm:text-sm font-bold text-neutral-900 truncate flex-1">
                  {currentTopic?.text ? (
                    currentTopic.text
                  ) : currentTopic?.imageUrl ? (
                    <span className="text-neutral-600">（写真のみのお題です）</span>
                  ) : (
                    <span className="text-neutral-400 italic">
                      (お題のテキスト・写真が未設定です)
                    </span>
                  )}
                </p>

                {!state.isTopicVisible && (
                  <span className="text-[11px] bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded border border-neutral-400 font-bold flex-shrink-0">
                    ※ モニターには「now loading...」が表示されます
                  </span>
                )}
              </div>
            </div>

            {/* Divider between topic and title */}
            <div className="border-t-2 border-dashed border-neutral-300" />

            {/* タイトルの表示エリア */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-sky-500 text-white px-2 py-0.5 rounded font-black border border-neutral-900">
                    タイトル
                  </span>
                  <span className="text-xs sm:text-sm font-black text-neutral-900">
                    タイトルの表示設定
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Title Number Counter */}
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border-2 border-neutral-950 shadow-xs">
                    <span className="text-xs font-bold text-neutral-700">
                      タイトル番号:
                    </span>
                    <button
                      type="button"
                      aria-label="タイトル番号を減らす"
                      disabled={(state.selectedTitleNumber || 1) <= 1}
                      onClick={() =>
                        handleTitleNumberChange((state.selectedTitleNumber || 1) - 1)
                      }
                      className="w-7 h-7 rounded border border-neutral-950 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 disabled:opacity-30 disabled:hover:bg-amber-100 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Minus className="w-3.5 h-3.5 text-neutral-950" />
                    </button>

                    <input
                      type="number"
                      min={1}
                      max={titles.length || 1}
                      value={state.selectedTitleNumber || 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          handleTitleNumberChange(val);
                        }
                      }}
                      className="w-12 h-7 text-center text-sm font-black border-2 border-neutral-950 rounded bg-white text-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />

                    <button
                      type="button"
                      aria-label="タイトル番号を増やす"
                      disabled={(state.selectedTitleNumber || 1) >= (titles.length || 1)}
                      onClick={() =>
                        handleTitleNumberChange((state.selectedTitleNumber || 1) + 1)
                      }
                      className="w-7 h-7 rounded border border-neutral-950 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 disabled:opacity-30 disabled:hover:bg-amber-100 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5 text-neutral-950" />
                    </button>

                    <span className="text-xs text-neutral-600 font-bold ml-0.5">
                      / {titles.length || 1}
                    </span>
                  </div>

                  {/* Title Display Switch */}
                  <div className="bg-white px-2.5 py-1 rounded-lg border-2 border-neutral-950 shadow-xs">
                    <Switch
                      checked={!!state.isTitleVisible}
                      onChange={(checked) =>
                        updateState((prev) => ({
                          ...prev,
                          isTitleVisible: checked,
                        }))
                      }
                      onLabel="表示する"
                      offLabel="隠す"
                      label="タイトル:"
                    />
                  </div>
                </div>
              </div>

              {/* Current title text preview */}
              <div className="bg-white p-2.5 rounded border border-neutral-900/60 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs px-2 py-0.5 bg-sky-900 text-white rounded font-black">
                    選択中 [#{state.selectedTitleNumber || 1}]
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-bold text-neutral-900 truncate flex-1">
                  {titles.find((t) => t.id === (state.selectedTitleNumber || 1))?.text ? (
                    titles.find((t) => t.id === (state.selectedTitleNumber || 1))?.text
                  ) : (
                    <span className="text-neutral-400 italic">
                      (サブコンソール１でタイトル #{state.selectedTitleNumber || 1} が未入力です)
                    </span>
                  )}
                </p>

                {!state.isTitleVisible && (
                  <span className="text-[11px] bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded border border-neutral-400 font-bold flex-shrink-0">
                    ※ スイッチOFF時はモニターに表示されません
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. 「参加状況設定」（コントロールパネルの上に移動・参加回数表示スイッチ付き） */}
          <div className="bg-[#FFFDE7] p-3.5 sm:p-4 rounded-lg border-2 border-neutral-950 shadow-sm space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-300 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-neutral-950" />
                <h3 className="text-base sm:text-lg font-black text-neutral-950">
                  参加状況設定
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="bg-white px-2.5 py-1 rounded-lg border-2 border-neutral-950 shadow-xs">
                  <Switch
                    checked={state.isParticipantsVisible}
                    onChange={(checked) =>
                      updateState((prev) => ({
                        ...prev,
                        isParticipantsVisible: checked,
                      }))
                    }
                    onLabel="参加者を表示する"
                    offLabel="隠す"
                    label="参加者表示:"
                  />
                </div>

                <div className="bg-white px-2.5 py-1 rounded-lg border-2 border-neutral-950 shadow-xs">
                  <Switch
                    checked={showAppearanceCount}
                    onChange={(checked) => setShowAppearanceCount(checked)}
                    onLabel="ON"
                    offLabel="OFF"
                    label="参加回数を表示する:"
                  />
                </div>
              </div>
            </div>

            {/* Participant toggles */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-neutral-700 flex flex-wrap items-center justify-between gap-2">
                <span>
                  ▼ 登録済みの参加者ごとの参加定義（最大14名まで同時に参加可能）
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded font-black border text-xs ${
                      activeParticipants.length >= 14
                        ? 'bg-amber-100 text-amber-900 border-amber-600 font-extrabold'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-600'
                    }`}
                  >
                    参加中: {activeParticipants.length} / 14名
                  </span>
                  <span className="text-neutral-900 font-black">
                    入力済み: {participantsWithNames.length} 名
                  </span>
                </div>
              </div>

              {participantsWithNames.length === 0 ? (
                <div className="p-3 bg-amber-50 rounded border border-neutral-300 text-xs text-neutral-600 font-bold">
                  下部の「参加者」欄に名前を入力すると、ここに「参加中／不参加」の切り替えスイッチが現れます。
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {participantsWithNames.map((p) => {
                    const appearanceCount = appearancesMap[p.id] || 0;
                    return (
                      <div
                        key={p.id}
                        className="bg-white p-2 rounded-lg border border-neutral-950 flex items-center justify-between shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 mr-2">
                          <div className="w-7 h-7 rounded-full border border-neutral-900 overflow-hidden bg-amber-100 flex-shrink-0 flex items-center justify-center">
                            {p.avatarUrl ? (
                              <img
                                src={p.avatarUrl}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-black text-neutral-800">
                                #{p.id}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span
                              className="text-xs sm:text-sm font-bold text-neutral-950 truncate"
                              title={p.name}
                            >
                              {p.name}
                            </span>
                            {showAppearanceCount && (
                              <span className="text-[10px] font-black text-neutral-600">
                                出場 {appearanceCount}回
                              </span>
                            )}
                          </div>
                        </div>

                        <Switch
                          size="sm"
                          checked={p.isParticipating}
                          onChange={(checked) =>
                            handleParticipantToggle(p.id, checked)
                          }
                          onLabel="参加中"
                          offLabel="不参加"
                          ariaLabel={`${p.name}の参加設定`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 3. 「観覧者スマートフォン投票」（QRコード表示・投票受付・リアルタイム状況） */}
          <AudienceVotingControl
            config={
              state.audienceVoting || {
                isQrVisible: false,
                isVotingActive: false,
                maxVotesPerPerson: 1,
                allowMultipleVotesPerParticipant: false,
                sessionCode: 'current',
              }
            }
            votes={state.audienceVotes || {}}
            voters={state.audienceVoters || []}
            participants={activeParticipants}
            onUpdateConfig={handleUpdateAudienceVotingConfig}
            onResetVotes={handleResetAudienceVoting}
            isResultAnnouncementActive={!!state.resultAnnouncement?.isActive}
            onToggleResultAnnouncement={handleToggleResultAnnouncement}
            isScoringModeEnabled={state.isScoringModeEnabled ?? true}
            onRequestOpenConfirm={(title, message, onConfirm) =>
              setConfirmModal({
                isOpen: true,
                title,
                message,
                onConfirm,
              })
            }
            showToast={showToast}
          />

          {/* 4. 「コントロールパネル」（得点・回答中・回答ログ・加点モード設定） */}
          <ScoreBoard
            participants={activeParticipants}
            scoreButtons={state.scoreButtons}
            onUpdateScoreButtons={handleUpdateScoreButtons}
            onUpdateParticipantScore={handleUpdateParticipantScore}
            onResetAllScores={handleResetAllScores}
            mode="scores_only"
            isScoreHiddenOnMonitor={state.isScoreHiddenOnMonitor}
            onToggleScoreHiddenOnMonitor={(hidden) =>
              updateState((prev) => ({ ...prev, isScoreHiddenOnMonitor: hidden }))
            }
            isWhaleMode={state.isWhaleMode}
            onToggleWhaleMode={(whale) =>
              updateState((prev) => ({ ...prev, isWhaleMode: whale }))
            }
            activeAnsweringParticipantId={state.activeAnsweringParticipantId}
            onToggleAnsweringParticipant={(id) =>
              updateState((prev) => ({
                ...prev,
                activeAnsweringParticipantId:
                  prev.activeAnsweringParticipantId === id ? null : id,
              }))
            }
            isScoringModeEnabled={state.isScoringModeEnabled ?? true}
            onToggleScoringMode={(enabled) =>
              updateState((prev) => ({
                ...prev,
                isScoringModeEnabled: enabled,
              }))
            }
            answerLogs={state.answerLogs || []}
            onUpdateAnswerLogs={(logs) =>
              updateState((prev) => ({ ...prev, answerLogs: logs }))
            }
            onRequestConfirmResetLogs={handleRequestResetAnswerLogs}
            colorPalette={state.colorPalette}
            isResultAnnouncementActive={!!state.resultAnnouncement?.isActive}
            onToggleResultAnnouncement={handleToggleResultAnnouncement}
            onReorderParticipants={handleOrderChange}
            audienceVotes={state.audienceVotes || {}}
          />
        </section>

        {/* ======================================================== */}
        {/* 【各種設定コントロール】 (タイマー設定, 参加状況設定, 加点ボタンの設定) */}
        {/* ======================================================== */}
        <section
          className={`rounded-xl border-2 p-4 sm:p-6 shadow-md space-y-5 transition-colors ${theme.sectionBgClass}`}
        >
          <div className={`border-b-2 pb-2 ${theme.borderClass}`}>
            <span className="text-xs bg-amber-300 text-neutral-950 px-2 py-0.5 rounded border border-neutral-900 font-black">
              各種構成・事前設定
            </span>
            <h2 className="text-lg sm:text-xl font-black mt-1">
              【各種設定コントロール】
            </h2>
            <p className={`text-xs font-bold mt-0.5 ${theme.subTextClass}`}>
              タイマー設定、回答者の参加状況・座席順、加点ボタンの計算式を設定します。
            </p>
          </div>

          {/* 1. タイマー設定 */}
          <TimerControl
            timer={state.timer}
            onUpdateTimer={handleUpdateTimer}
            mode="settings_only"
          />

          {/* 2. 加点ボタンの設定 */}
          <ScoreBoard
            participants={activeParticipants}
            scoreButtons={state.scoreButtons}
            onUpdateScoreButtons={handleUpdateScoreButtons}
            onUpdateParticipantScore={handleUpdateParticipantScore}
            onResetAllScores={handleResetAllScores}
            mode="config_only"
          />
        </section>

        {/* ======================================================== */}
        {/* 【設定のリセット】 (全て初期化 / お題・参加者以外初期化) */}
        {/* ======================================================== */}
        <section
          className={`rounded-xl border-2 p-4 sm:p-6 shadow-md space-y-4 transition-colors ${theme.sectionBgClass}`}
        >
          <div className={`border-b-2 pb-2 ${theme.borderClass}`}>
            <span className="text-xs bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-200 border border-red-500 px-2 py-0.5 rounded font-black">
              システム設定
            </span>
            <h2 className={`text-base sm:text-lg font-black mt-1 flex items-center gap-2 ${theme.textColorClass}`}>
              <RotateCcw className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>設定のリセット</span>
            </h2>
            <p className={`text-xs font-bold mt-0.5 ${theme.subTextClass}`}>
              ゲーム終了時や新規イベント開始時に、設定や進行状況をリセットできます。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleResetExceptTopicsAndParticipants}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-neutral-950 font-black px-4 py-3 rounded-xl border-2 border-neutral-950 shadow transition cursor-pointer text-xs sm:text-sm"
              title="入力されているお題一覧・参加者設定（名前・画像・チーム名）は保持し、タイマーや得点などの進行状態をリセットします"
            >
              <RotateCcw className="w-4 h-4" />
              <span>お題と参加者以外をリセット</span>
            </button>

            <button
              type="button"
              onClick={handleResetAll}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black px-4 py-3 rounded-xl border-2 border-neutral-950 shadow transition cursor-pointer text-xs sm:text-sm"
              title="すべてのお題・参加者・タイマー・得点・カラーパレット等の全設定を工場出荷時の初期状態に戻します"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>全ての設定をリセット</span>
            </button>
          </div>
        </section>

        {/* Page 1 Quick Jump Guide Banner to Subconsole 1 */}
        <div
          className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
            theme.isDark
              ? 'bg-neutral-900/60 border-neutral-700'
              : 'bg-amber-50/70 border-amber-300'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div>
              <h3 className="font-black text-sm flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                お題の登録・参加者設定・カラーパレットはこちら
              </h3>
              <p className={`text-xs mt-0.5 ${theme.subTextClass}`}>
                「テキスト（お題）」「参加者（名前・チーム名・アイコン）」「カラーパレット」の設定は、右にスライドした「サブコンソール１：準備」に配置されています。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage('sub1_prep')}
              className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm border-2 border-sky-800 shadow cursor-pointer transition"
            >
              <span>サブコンソール１：準備 へ進む</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ページ2: サブコンソール１：準備 */}
      {/* ======================================================== */}
      <div className="w-1/5 px-2 sm:px-3 flex-shrink-0 space-y-6">
        {/* Subconsole 1 Top Header Card */}
        <div
          className={`rounded-xl border-2 p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
            theme.isDark
              ? 'bg-sky-950/40 border-sky-800'
              : 'bg-sky-50 border-sky-300'
          }`}
        >
          <div>
            <span className="text-xs bg-sky-500 text-white px-2 py-0.5 rounded font-black">
              サブコンソール１
            </span>
            <h2 className={`text-lg sm:text-xl font-black mt-1 ${theme.textColorClass}`}>
              【準備】テキスト・参加者・カラーパレット設定
            </h2>
            <p className={`text-xs font-bold mt-0.5 ${theme.subTextClass}`}>
              事前にお題の作成（画像含む）、参加者の入力（アイコン・チーム名）、背景カラーパレットを構成します。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage('main')}
            className="inline-flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 text-amber-300 px-4 py-2 rounded-xl font-black text-xs border-2 border-neutral-950 shadow cursor-pointer transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>← メインコンソール（本番操作）に戻る</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* SECTION: テキスト (お題一覧 1〜10+) & 写真で一言 & 使用済みチェック */}
        {/* ======================================================== */}
        <section
          className={`rounded-xl border-2 p-4 sm:p-6 shadow-md space-y-4 transition-colors ${theme.sectionBgClass}`}
        >
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 pb-2 ${theme.borderClass}`}
          >
            <div>
              <h2 className={`text-lg sm:text-xl font-black ${theme.textColorClass}`}>
                テキスト（お題）
              </h2>
              <p className={`text-xs font-bold flex items-center gap-1 mt-0.5 ${theme.subTextClass}`}>
                <HelpCircle className="w-3.5 h-3.5 text-amber-700 inline flex-shrink-0" />
                ドラッグ＆ドロップまたは上下矢印でお題の順序を変更できます（番号は並び順に合わせて自動更新されます）。文章内に <code className="bg-amber-200 px-1 py-0.5 rounded border border-neutral-900 text-neutral-950 font-black">(k)</code> と入れると改行になります。右横から「写真で一言」用の画像をアップロード可能です。
              </p>
            </div>

            {/* Download & Upload buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={topicFileInputRef}
                accept=".txt,text/plain"
                onChange={handleUploadTopics}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => topicFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-neutral-100 text-neutral-950 px-3 py-1.5 rounded-lg border-2 border-neutral-950 shadow-xs font-black text-xs cursor-pointer transition"
                title="テキストファイル（.txt）からお題（画像データ含む）を読み込む"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>テキストをアップロードする</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTopics}
                className="inline-flex items-center gap-1.5 bg-amber-200 hover:bg-amber-300 text-neutral-950 px-3 py-1.5 rounded-lg border-2 border-neutral-950 shadow-xs font-black text-xs cursor-pointer transition"
                title="入力されているお題（画像データ含む）をtxtファイルで保存する"
              >
                <Download className="w-3.5 h-3.5" />
                <span>テキストでダウンロードする</span>
              </button>
            </div>
          </div>

          {/* 表示するお題のフォント選択 & ボールド設定（テキスト（お題）の最上部と1番目のお題の間） */}
          <div className="bg-[#FFFDE7] border-2 border-neutral-950 rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-xs font-black text-neutral-950 bg-amber-300 px-2.5 py-1 rounded border border-neutral-900 shadow-xs flex-shrink-0 flex items-center gap-1.5">
                <span>🔤</span>
                <span>お題のフォント選択:</span>
              </span>

              {/* 5 Font Options */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {TOPIC_FONT_OPTIONS.map((f) => {
                  const isSelected = (state.topicFontFamily || 'gothic') === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        updateState((prev) => ({
                          ...prev,
                          topicFontFamily: f.id,
                        }))
                      }
                      style={{ fontFamily: f.fontFamily }}
                      className={`px-3 py-1.5 rounded-lg border-2 text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-neutral-950 text-amber-300 border-neutral-950 shadow-md ring-2 ring-amber-400 scale-102 font-black'
                          : 'bg-white text-neutral-900 border-neutral-800 hover:bg-neutral-100 font-bold'
                      }`}
                      title={`${f.label}（${f.category}）をお題のフォントとして選択`}
                    >
                      <span>{f.label}</span>
                      <span
                        className={`text-[10px] px-1 py-0.5 rounded font-normal ${
                          isSelected
                            ? 'bg-neutral-800 text-neutral-300'
                            : 'bg-neutral-200 text-neutral-700'
                        }`}
                      >
                        {f.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ボールド ON / OFF スイッチ */}
            <div className="flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-lg border-2 border-neutral-950 shadow-xs flex-shrink-0 self-start md:self-auto">
              <span className="text-xs sm:text-sm font-black text-neutral-900">
                太字 (ボールド):
              </span>
              <Switch
                size="sm"
                checked={state.isTopicBold ?? true}
                onChange={(checked) =>
                  updateState((prev) => ({
                    ...prev,
                    isTopicBold: checked,
                  }))
                }
                onLabel="ON"
                offLabel="OFF"
                ariaLabel="お題フォントのボールド設定"
              />
            </div>
          </div>

          {/* List of Topic Rows */}
          <div className="space-y-2.5">
            {state.topics.map((t, idx) => {
              const isCurrent = t.id === state.selectedTopicNumber;
              const isUsed = !!t.isUsed;
              const isDragging = draggedTopicIndex === idx;
              const isOver = dragOverTopicIndex === idx;

              return (
                <div
                  key={t.id}
                  onDragOver={(e) => handleTopicDragOver(e, idx)}
                  onDrop={(e) => handleTopicDrop(e, idx)}
                  className={`flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 p-2.5 rounded-lg border-2 transition-all ${
                    isDragging
                      ? 'opacity-40 scale-[0.99] border-amber-600 bg-amber-50'
                      : isOver
                      ? 'border-blue-600 ring-2 ring-blue-400 bg-blue-50/60'
                      : isUsed
                      ? 'bg-neutral-200 text-neutral-500 border-neutral-400 opacity-65'
                      : isCurrent
                      ? 'border-neutral-950 bg-amber-100/90 shadow-sm ring-2 ring-neutral-900'
                      : 'border-neutral-400 bg-white hover:border-neutral-800'
                  }`}
                >
                  {/* Drag Handle & Up/Down Arrows */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div
                      draggable
                      onDragStart={(e) => handleTopicDragStart(e, idx)}
                      onDragEnd={handleTopicDragEnd}
                      className="p-1 text-neutral-400 hover:text-neutral-950 cursor-grab active:cursor-grabbing rounded hover:bg-neutral-200 transition"
                      title="ドラッグしてお題の並び順を変更（番号は移動先のものに自動調整されます）"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        aria-label={`お題 ${idx + 1} を1つ上へ移動`}
                        disabled={idx === 0}
                        onClick={() => handleMoveTopicUp(idx)}
                        className="w-5 h-3.5 bg-neutral-100 hover:bg-amber-200 disabled:opacity-20 disabled:hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                        title="1つ上へ移動"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        aria-label={`お題 ${idx + 1} を1つ下へ移動`}
                        disabled={idx === state.topics.length - 1}
                        onClick={() => handleMoveTopicDown(idx)}
                        className="w-5 h-3.5 bg-neutral-100 hover:bg-amber-200 disabled:opacity-20 disabled:hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                        title="1つ下へ移動"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Left: isUsed Checkbox */}
                  <div
                    className="flex items-center gap-1 flex-shrink-0"
                    title="使用済みとしてチェック（行が灰色になります）"
                  >
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isUsed}
                        onChange={(e) => handleTopicUsedToggle(t.id, e.target.checked)}
                        className="w-4 h-4 accent-neutral-950 cursor-pointer rounded"
                      />
                      <span className="text-[10px] font-bold text-neutral-600 hidden xs:inline">
                        使用済
                      </span>
                    </label>
                  </div>

                  {/* Topic Number Button */}
                  <button
                    type="button"
                    onClick={() => handleTopicNumberChange(t.id)}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-xs sm:text-sm border-2 cursor-pointer transition ${
                      isCurrent
                        ? 'bg-neutral-950 text-[#FEF9C3] border-neutral-950'
                        : isUsed
                        ? 'bg-neutral-300 text-neutral-700 border-neutral-400 hover:bg-neutral-400'
                        : 'bg-amber-200 text-neutral-950 border-neutral-950 hover:bg-amber-300'
                    }`}
                    title="このお題を選択する"
                  >
                    {idx + 1}
                  </button>

                  {/* Topic Text Input */}
                  <input
                    type="text"
                    aria-label={`お題 ${idx + 1}`}
                    value={t.text}
                    onChange={(e) => handleTopicTextChange(t.id, e.target.value)}
                    placeholder={`お題 ${idx + 1} を入力...（改行は (k) を使用。写真のみの場合は空欄でも可）`}
                    className={`flex-1 min-w-[180px] px-3 py-1.5 text-xs sm:text-sm font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-950 ${
                      isUsed
                        ? 'bg-neutral-100 border-neutral-400 text-neutral-600'
                        : 'bg-white border-neutral-900 text-neutral-950'
                    }`}
                  />

                  {/* Image Preview & Upload for Topic (写真で一言) */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={(el) => {
                        topicImageInputRefs.current[t.id] = el;
                      }}
                      accept="image/*"
                      onChange={(e) => handleTopicImageUpload(t.id, e)}
                      className="hidden"
                    />

                    {/* Image Thumbnail Preview */}
                    {t.imageUrl ? (
                      <div className="relative group w-9 h-9 rounded-lg border-2 border-neutral-950 overflow-hidden bg-white shadow-xs">
                        <img
                          src={t.imageUrl}
                          alt={`お題 ${t.id} の写真`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveTopicImage(t.id)}
                          aria-label={`お題 ${t.id} の写真を削除`}
                          className="absolute inset-0 bg-red-950/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="写真を削除"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-200" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="w-9 h-9 rounded-lg border border-dashed border-neutral-400 bg-neutral-50 flex items-center justify-center text-neutral-400"
                        title="写真未設定"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}

                    {/* Upload / Delete Button */}
                    {t.imageUrl ? (
                      <button
                        type="button"
                        aria-label={`お題 ${idx + 1} の画像を削除`}
                        onClick={() => handleRemoveTopicImage(t.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border-2 border-red-600 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black cursor-pointer transition shadow-xs"
                        title="画像を削除して画像なしの状態に戻す"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">画像削除</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={`お題 ${idx + 1} の画像をアップロード`}
                        onClick={() => topicImageInputRefs.current[t.id]?.click()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-900 bg-white hover:bg-neutral-100 text-neutral-950 text-xs font-bold cursor-pointer transition shadow-xs"
                        title="写真で一言用のお題画像をアップロード"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">画像アップロード</span>
                      </button>
                    )}
                  </div>

                  {isCurrent && (
                    <span className="text-[11px] bg-neutral-950 text-white px-2 py-0.5 rounded font-black flex-shrink-0">
                      選択中
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add / Remove / Specific Delete controls below topic list */}
          <div className="pt-3 border-t border-neutral-300 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Increase / Decrease boxes */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleAddTopic}
                className="inline-flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 text-[#FEF9C3] px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow hover:shadow-md cursor-pointer font-black text-xs sm:text-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>テキストボックスを増やす</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveTopic}
                disabled={state.topics.length <= 1}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-red-50 text-red-700 hover:text-red-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-red-700 px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow cursor-pointer disabled:cursor-not-allowed font-black text-xs sm:text-sm transition"
              >
                <Minus className="w-4 h-4" />
                <span>末尾のお題を減らす</span>
              </button>
            </div>

            {/* 『「何番」のお題を削除する』ボックス */}
            <div className="flex flex-wrap items-center gap-2 bg-[#FFFDE7] p-2 sm:p-2.5 rounded-lg border-2 border-neutral-950 shadow-xs">
              <span className="text-xs sm:text-sm font-black text-neutral-900">
                指定番号のお題を削除:
              </span>

              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border-2 border-neutral-950">
                <button
                  type="button"
                  aria-label="削除対象の番号を減らす"
                  disabled={topicToDelete <= 1}
                  onClick={() => setTopicToDelete((prev) => Math.max(1, prev - 1))}
                  className="w-7 h-7 bg-amber-100 hover:bg-amber-200 disabled:opacity-30 rounded border border-neutral-950 flex items-center justify-center font-black cursor-pointer disabled:cursor-not-allowed"
                >
                  <Minus className="w-3.5 h-3.5 text-neutral-950" />
                </button>

                <input
                  type="number"
                  min={1}
                  max={state.topics.length}
                  value={topicToDelete}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setTopicToDelete(Math.max(1, Math.min(state.topics.length, val)));
                    }
                  }}
                  className="w-12 h-7 text-center font-black text-sm border border-neutral-400 rounded bg-white text-neutral-950 focus:outline-none focus:ring-1 focus:ring-neutral-950"
                />

                <button
                  type="button"
                  aria-label="削除対象の番号を増やす"
                  disabled={topicToDelete >= state.topics.length}
                  onClick={() => setTopicToDelete((prev) => Math.min(state.topics.length, prev + 1))}
                  className="w-7 h-7 bg-amber-100 hover:bg-amber-200 disabled:opacity-30 rounded border border-neutral-950 flex items-center justify-center font-black cursor-pointer disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5 text-neutral-950" />
                </button>
                <span className="text-xs font-black text-neutral-800 ml-0.5">番</span>
              </div>

              <button
                type="button"
                onClick={handleDeleteSpecificTopic}
                disabled={state.topics.length <= 1}
                className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white px-3 py-1.5 rounded-lg border-2 border-neutral-950 shadow font-black text-xs sm:text-sm cursor-pointer disabled:cursor-not-allowed transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>削除を実行</span>
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION: 参加者 (名前入力, アイコン画像, 並び替え, 人数増減) */}
        {/* ======================================================== */}
        <section
          className={`rounded-xl border-2 p-4 sm:p-6 shadow-md space-y-4 transition-colors ${theme.sectionBgClass}`}
        >
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 pb-2 ${theme.borderClass}`}
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-lg sm:text-xl font-black ${theme.textColorClass}`}>
                  参加者
                </h2>
                <span className="text-xs bg-amber-300 text-neutral-950 font-black px-2 py-0.5 rounded border border-neutral-950">
                  全 {state.participants.length} 名
                </span>
              </div>
              <p className={`text-xs font-bold mt-0.5 ${theme.subTextClass}`}>
                参加者の名前を入力し、横のボタンから任意でアイコン画像をアップロードできます。ドラッグ＆ドロップまたは上下矢印で並び順の入れ替えが可能です。下部のボタンで人数の追加・削減ができます。
              </p>
            </div>

            {/* Download & Upload buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={participantFileInputRef}
                accept=".txt,text/plain"
                onChange={handleUploadParticipants}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => participantFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-neutral-100 text-neutral-950 px-3 py-1.5 rounded-lg border-2 border-neutral-950 shadow-xs font-black text-xs cursor-pointer transition"
                title="保存した参加者テキストファイルを読み込む"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>テキストをアップロードする</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadParticipants}
                className="inline-flex items-center gap-1.5 bg-amber-200 hover:bg-amber-300 text-neutral-950 px-3 py-1.5 rounded-lg border-2 border-neutral-950 shadow-xs font-black text-xs cursor-pointer transition"
                title="参加者一覧（アイコン画像データ含む）をtxtファイルで保存する"
              >
                <Download className="w-3.5 h-3.5" />
                <span>テキストでダウンロードする</span>
              </button>
            </div>
          </div>

          {/* 2-column grid of participant text boxes with DnD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {state.participants.map((p, index) => {
              const isDragging = draggedParticipantIndex === index;
              const isOver = dragOverParticipantIndex === index;

              return (
                <div
                  key={p.id}
                  onDragOver={(e) => handleParticipantDragOver(e, index)}
                  onDrop={(e) => handleParticipantDrop(e, index)}
                  className={`p-2.5 rounded-lg border-2 flex items-center gap-2 sm:gap-2.5 shadow-xs transition-all ${
                    isDragging
                      ? 'opacity-40 scale-[0.99] border-amber-600 bg-amber-100'
                      : isOver
                      ? 'border-blue-600 ring-2 ring-blue-400 bg-blue-50'
                      : 'bg-[#FFFDE7] border-neutral-950'
                  }`}
                >
                  {/* Drag Handle & Up/Down Arrows */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <div
                      draggable
                      onDragStart={(e) => handleParticipantDragStart(e, index)}
                      onDragEnd={handleParticipantDragEnd}
                      className="p-1 text-neutral-400 hover:text-neutral-950 cursor-grab active:cursor-grabbing rounded hover:bg-amber-200 transition"
                      title="ドラッグして参加者の並び順を変更（番号は移動先のものに自動調整されます）"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        aria-label={`参加者 ${index + 1} を1つ上へ移動`}
                        disabled={index === 0}
                        onClick={() => handleMoveParticipantUp(index)}
                        className="w-4 h-3 bg-white hover:bg-amber-200 disabled:opacity-20 text-neutral-800 border border-neutral-300 rounded flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                        title="1つ上へ移動"
                      >
                        <ChevronUp className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`参加者 ${index + 1} を1つ下へ移動`}
                        disabled={index === state.participants.length - 1}
                        onClick={() => handleMoveParticipantDown(index)}
                        className="w-4 h-3 bg-white hover:bg-amber-200 disabled:opacity-20 text-neutral-800 border border-neutral-300 rounded flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                        title="1つ下へ移動"
                      >
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  {/* Number Badge */}
                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-amber-200 border border-neutral-900 flex items-center justify-center font-black text-xs sm:text-sm text-neutral-950 flex-shrink-0">
                    {index + 1}
                  </span>

                  {/* Participant Name Input */}
                  <input
                    type="text"
                    aria-label={`参加者 ${index + 1} の名前`}
                    value={p.name}
                    onChange={(e) =>
                      handleParticipantNameChange(p.id, e.target.value)
                    }
                    placeholder={`参加者 ${index + 1} の名前`}
                    className="flex-1 min-w-0 max-w-[190px] sm:max-w-[220px] px-3 py-1.5 text-xs sm:text-sm font-bold text-neutral-950 bg-white border-2 border-neutral-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-950"
                  />

                  {/* Image Icon Preview or Placeholder */}
                  <div className="w-9 h-9 rounded-full border-2 border-neutral-900 bg-white overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner">
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>

                  {/* Upload Image Button */}
                  <input
                    type="file"
                    ref={(el) => {
                      fileInputRefs.current[p.id] = el;
                    }}
                    accept="image/*"
                    onChange={(e) => handleImageUpload(p.id, e)}
                    className="hidden"
                  />

                  <button
                    type="button"
                    aria-label={`参加者 ${index + 1} の画像アップロード`}
                    onClick={() => fileInputRefs.current[p.id]?.click()}
                    className="inline-flex items-center gap-1 bg-white hover:bg-amber-100 text-neutral-950 px-2 sm:px-2.5 py-1.5 rounded border border-neutral-900 text-xs font-bold cursor-pointer transition shadow-xs flex-shrink-0"
                    title="アイコン画像をアップロード"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">画像</span>
                  </button>

                  {/* Team Name Input */}
                  <input
                    type="text"
                    aria-label={`参加者 ${index + 1} のチーム名`}
                    value={p.teamName || ''}
                    onChange={(e) =>
                      handleParticipantTeamNameChange(p.id, e.target.value)
                    }
                    placeholder="チーム名"
                    className="w-18 sm:w-24 px-2 py-1.5 text-xs font-bold text-neutral-950 bg-white border-2 border-neutral-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-950 shadow-xs flex-shrink-0"
                    title="チーム名（任意入力・今後使用）"
                  />

                  {/* Remove image button if present */}
                  {p.avatarUrl && (
                    <button
                      type="button"
                      aria-label={`参加者 ${index + 1} の画像を削除`}
                      onClick={() => handleRemoveImage(p.id)}
                      className="p-1.5 text-neutral-600 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer transition flex-shrink-0"
                      title="画像を削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add / Remove buttons for participants */}
          <div className="pt-3 border-t border-neutral-300 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleAddParticipant}
              className="inline-flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 text-[#FEF9C3] px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow hover:shadow-md cursor-pointer font-black text-xs sm:text-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>参加者の項目を追加する</span>
            </button>

            <button
              type="button"
              onClick={handleRemoveParticipant}
              disabled={state.participants.length <= 1}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-red-50 text-red-700 hover:text-red-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-red-700 px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow cursor-pointer disabled:cursor-not-allowed font-black text-xs sm:text-sm transition"
            >
              <Minus className="w-4 h-4" />
              <span>参加者の項目を減らす</span>
            </button>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION: タイトル (1〜20のテキストボックス・DnD入替・個別クリア) */}
        {/* ======================================================== */}
        <section
          className={`rounded-xl border-2 p-4 sm:p-6 shadow-md space-y-4 transition-colors ${theme.sectionBgClass}`}
        >
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 pb-2 ${theme.borderClass}`}
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-lg sm:text-xl font-black ${theme.textColorClass}`}>
                  タイトル
                </h2>
                <span className="text-xs bg-amber-300 text-neutral-950 font-black px-2 py-0.5 rounded border border-neutral-950">
                  全 {titles.length} 項目
                </span>
              </div>
              <p className={`text-xs font-bold mt-0.5 ${theme.subTextClass}`}>
                タイトルを設定できます。ドラッグ＆ドロップまたは上下矢印で並び替え、右端のゴミ箱ボタンで個別にクリアできます。
              </p>
            </div>
          </div>

          {/* 2-column grid of title text boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {titles.map((t, index) => {
              const isDragging = draggedTitleIndex === index;
              const isOver = dragOverTitleIndex === index;

              return (
                <div
                  key={t.id}
                  onDragOver={(e) => handleTitleDragOver(e, index)}
                  onDrop={(e) => handleTitleDrop(e, index)}
                  className={`p-2.5 rounded-lg border-2 flex items-center gap-2 sm:gap-2.5 shadow-xs transition-all ${
                    isDragging
                      ? 'opacity-40 scale-[0.99] border-amber-600 bg-amber-100'
                      : isOver
                      ? 'border-blue-600 ring-2 ring-blue-400 bg-blue-50'
                      : 'bg-[#FFFDE7] border-neutral-950'
                  }`}
                >
                  {/* Drag Handle & Up/Down Arrows */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <div
                      draggable
                      onDragStart={(e) => handleTitleDragStart(e, index)}
                      onDragEnd={handleTitleDragEnd}
                      className="p-1 text-neutral-400 hover:text-neutral-950 cursor-grab active:cursor-grabbing rounded hover:bg-amber-200 transition"
                      title="ドラッグしてタイトルの並び順を変更"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        aria-label={`タイトル ${index + 1} を1つ上へ移動`}
                        disabled={index === 0}
                        onClick={() => {
                          if (index > 0) reorderTitleItems(index, index - 1);
                        }}
                        className="w-4 h-3 bg-white hover:bg-amber-200 disabled:opacity-20 text-neutral-800 border border-neutral-300 rounded flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                        title="1つ上へ移動"
                      >
                        <ChevronUp className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`タイトル ${index + 1} を1つ下へ移動`}
                        disabled={index === titles.length - 1}
                        onClick={() => {
                          if (index < titles.length - 1) reorderTitleItems(index, index + 1);
                        }}
                        className="w-4 h-3 bg-white hover:bg-amber-200 disabled:opacity-20 text-neutral-800 border border-neutral-300 rounded flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                        title="1つ下へ移動"
                      >
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  {/* Number Badge */}
                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-amber-200 border border-neutral-900 flex items-center justify-center font-black text-xs sm:text-sm text-neutral-950 flex-shrink-0">
                    {index + 1}
                  </span>

                  {/* Title Text Input */}
                  <input
                    type="text"
                    aria-label={`タイトル ${index + 1}`}
                    value={t.text}
                    onChange={(e) => handleTitleChange(t.id, e.target.value)}
                    placeholder={`タイトル ${index + 1} を入力...`}
                    className="flex-1 min-w-0 px-3 py-1.5 text-xs sm:text-sm font-bold text-neutral-950 bg-white border-2 border-neutral-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-950"
                  />

                  {/* Delete / Clear Button */}
                  <button
                    type="button"
                    aria-label={`タイトル ${index + 1} を消去`}
                    onClick={() => handleClearTitle(t.id)}
                    disabled={!t.text}
                    className="p-1.5 text-neutral-400 hover:text-red-700 disabled:opacity-30 disabled:hover:text-neutral-400 hover:bg-red-50 rounded cursor-pointer disabled:cursor-not-allowed transition flex-shrink-0"
                    title="このタイトルをクリア"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add / Remove buttons for titles */}
          <div className="pt-3 border-t border-neutral-300 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleAddTitle}
              className="inline-flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 text-[#FEF9C3] px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow hover:shadow-md cursor-pointer font-black text-xs sm:text-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>タイトルの項目を追加する</span>
            </button>

            <button
              type="button"
              onClick={handleRemoveTitle}
              disabled={titles.length <= 1}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-red-50 text-red-700 hover:text-red-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-red-700 px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow cursor-pointer disabled:cursor-not-allowed font-black text-xs sm:text-sm transition"
            >
              <Minus className="w-4 h-4" />
              <span>タイトルの項目を減らす</span>
            </button>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 【カラーパレット】 (背景色選択・ダークモード対応) */}
        {/* ======================================================== */}
        <ColorPaletteSelector
          selectedPalette={state.colorPalette || 'yellow'}
          onSelectPalette={(palette) =>
            updateState((prev) => ({ ...prev, colorPalette: palette }))
          }
          isDark={theme.isDark}
        />

        {/* Subconsole 1 Bottom Navigation */}
        <div className="pt-2 pb-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentPage('main')}
            className="inline-flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-amber-300 px-6 py-3 rounded-xl font-black text-sm cursor-pointer shadow-lg border-2 border-neutral-950 transition hover:scale-102"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>メインコンソール（本番進行）に戻る</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage('sub2_preset')}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-black text-sm cursor-pointer shadow-lg border-2 border-purple-900 transition hover:scale-102"
          >
            <span>サブコンソール２：プリセット へ進む</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ページ3: サブコンソール２：プリセット */}
      {/* ======================================================== */}
      <div className="w-1/5 pl-3 sm:pl-4 flex-shrink-0 space-y-6">
        {/* Subconsole 2 Top Header Card */}
        <div
          className={`rounded-xl border-2 p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
            theme.isDark
              ? 'bg-purple-950/40 border-purple-800'
              : 'bg-purple-50 border-purple-300'
          }`}
        >
          <div>
            <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded font-black">
              サブコンソール２
            </span>
            <h2 className={`text-lg sm:text-xl font-black mt-1 ${theme.textColorClass}`}>
              【プリセット】お題・参加者・タイマー等の事前登録
            </h2>
            <p className={`text-xs font-bold mt-0.5 ${theme.subTextClass}`}>
              試合・コーナーごとの設定をあらかじめ保存し、メインコンソールから瞬時に呼び出せます。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage('main')}
              className="inline-flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 text-amber-300 px-4 py-2 rounded-xl font-black text-xs border-2 border-neutral-950 shadow cursor-pointer transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>メインコンソールへ戻る</span>
            </button>
          </div>
        </div>

        {/* Preset Cards List */}
        <div className="space-y-5">
          {(!state.presets || state.presets.length === 0) ? (
            <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 space-y-3">
              <p className="text-sm font-bold text-neutral-500">プリセットが登録されていません</p>
              <button
                type="button"
                onClick={handleAddPreset}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-black text-xs"
              >
                設定1番を作成する
              </button>
            </div>
          ) : (
            state.presets.map((preset, idx) => {
              const displayName = getPresetDisplayName(preset, idx, state.titles);
              const isDragTarget = dragOverPresetIndex === idx;

              return (
                <div
                  key={preset.id}
                  draggable
                  onDragStart={(e) => handlePresetDragStart(e, idx)}
                  onDragOver={(e) => handlePresetDragOver(e, idx)}
                  onDrop={(e) => handlePresetDrop(e, idx)}
                  onDragEnd={handlePresetDragEnd}
                  className={`bg-white dark:bg-neutral-900/90 rounded-2xl border-2 shadow-md p-4 sm:p-5 space-y-4 transition-all ${
                    isDragTarget
                      ? 'border-purple-500 ring-2 ring-purple-400 scale-[1.01]'
                      : 'border-neutral-950'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 pb-3 border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                        title="ドラッグして並び替え"
                      >
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 px-2 py-0.5 rounded font-black border border-purple-300 dark:border-purple-700">
                            設定 {idx + 1} 番
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-neutral-950 dark:text-neutral-100">
                            {displayName}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* 表示を畳む スイッチ */}
                      <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 shadow-2xs">
                        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          表示を畳む:
                        </span>
                        <Switch
                          id={`preset-collapse-${preset.id}`}
                          size="sm"
                          checked={collapsedPresetIds.has(preset.id)}
                          onChange={() => toggleCollapsePreset(preset.id)}
                          ariaLabel="プリセット表示の折りたたみ"
                        />
                      </div>

                      {/* Status badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                        <span className={`px-2 py-0.5 rounded border ${preset.isTitleEnabled ? 'bg-sky-100 text-sky-900 border-sky-400' : 'bg-neutral-100 text-neutral-500 border-neutral-300'}`}>
                          タイトル: {preset.isTitleEnabled ? 'ON' : 'OFF'}
                        </span>
                        <span className={`px-2 py-0.5 rounded border ${preset.isTopicEnabled ? 'bg-amber-100 text-amber-900 border-amber-400' : 'bg-neutral-100 text-neutral-500 border-neutral-300'}`}>
                          お題: {preset.isTopicEnabled ? 'ON' : 'OFF'}
                        </span>
                        <span className={`px-2 py-0.5 rounded border ${preset.isParticipantsEnabled ? 'bg-emerald-100 text-emerald-900 border-emerald-400' : 'bg-neutral-100 text-neutral-500 border-neutral-300'}`}>
                          参加者: {preset.isParticipantsEnabled ? `${preset.activeParticipantIds?.length || 0}名` : 'OFF'}
                        </span>
                        <span className={`px-2 py-0.5 rounded border ${preset.isCustomTimerEnabled ? 'bg-purple-100 text-purple-900 border-purple-400' : 'bg-neutral-100 text-neutral-500 border-neutral-300'}`}>
                          タイマー: {preset.isCustomTimerEnabled ? '独自設定' : '現在維持'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!collapsedPresetIds.has(preset.id) && (
                    <>
                  {/* 1. タイトル設定 */}
                  <div className="bg-white p-3.5 sm:p-4 rounded-xl border-2 border-sky-400 shadow-xs space-y-2.5 text-neutral-950">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                        <span className="text-xs sm:text-sm font-black text-neutral-950">
                          タイトルを設定する
                        </span>
                      </div>
                      <Switch
                        id={`preset-title-switch-${preset.id}`}
                        size="sm"
                        checked={preset.isTitleEnabled}
                        onChange={(checked) =>
                          handleUpdatePreset(idx, (p) => ({
                            ...p,
                            isTitleEnabled: checked,
                            selectedTitleNumber: p.selectedTitleNumber || 1,
                          }))
                        }
                      />
                    </div>

                    {preset.isTitleEnabled && (
                      <div className="pt-1.5 space-y-1.5 animate-in fade-in duration-150">
                        <label htmlFor={`preset-title-select-${preset.id}`} className="text-xs font-bold text-neutral-700">
                          選択するタイトル番号（サブコンソール１の登録内容より）:
                        </label>
                        <select
                          id={`preset-title-select-${preset.id}`}
                          value={preset.selectedTitleNumber || 1}
                          onChange={(e) =>
                            handleUpdatePreset(idx, (p) => ({
                              ...p,
                              selectedTitleNumber: Number(e.target.value),
                            }))
                          }
                          className="w-full bg-white text-neutral-950 font-bold px-3 py-2 rounded-lg border-2 border-neutral-950 text-xs sm:text-sm cursor-pointer shadow-xs focus:ring-2 focus:ring-sky-500"
                        >
                          {titles.map((t) => (
                            <option key={t.id} value={t.id}>
                              #{t.id}: {t.text ? t.text : '（未入力）'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* 2. お題設定 */}
                  <div className="bg-white p-3.5 sm:p-4 rounded-xl border-2 border-amber-400 shadow-xs space-y-2.5 text-neutral-950">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-xs sm:text-sm font-black text-neutral-950">
                          お題を設定する
                        </span>
                      </div>
                      <Switch
                        id={`preset-topic-switch-${preset.id}`}
                        size="sm"
                        checked={preset.isTopicEnabled}
                        onChange={(checked) =>
                          handleUpdatePreset(idx, (p) => ({
                            ...p,
                            isTopicEnabled: checked,
                            selectedTopicNumber: p.selectedTopicNumber || 1,
                          }))
                        }
                      />
                    </div>

                    {preset.isTopicEnabled && (
                      <div className="pt-1.5 space-y-1.5 animate-in fade-in duration-150">
                        <label htmlFor={`preset-topic-select-${preset.id}`} className="text-xs font-bold text-neutral-700">
                          選択するお題番号（サブコンソール１の登録内容より）:
                        </label>
                        <select
                          id={`preset-topic-select-${preset.id}`}
                          value={preset.selectedTopicNumber || 1}
                          onChange={(e) =>
                            handleUpdatePreset(idx, (p) => ({
                              ...p,
                              selectedTopicNumber: Number(e.target.value),
                            }))
                          }
                          className="w-full bg-white text-neutral-950 font-bold px-3 py-2 rounded-lg border-2 border-neutral-950 text-xs sm:text-sm cursor-pointer shadow-xs focus:ring-2 focus:ring-amber-500"
                        >
                          {state.topics.map((t, tIdx) => (
                            <option key={t.id} value={t.id}>
                              #{tIdx + 1}: {t.text ? (t.text.length > 40 ? t.text.slice(0, 40) + '...' : t.text) : '（未入力）'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* 3. 参加者設定 */}
                  <div className="bg-white p-3.5 sm:p-4 rounded-xl border-2 border-emerald-400 shadow-xs space-y-2.5 text-neutral-950">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-xs sm:text-sm font-black text-neutral-950">
                          参加者を設定する
                        </span>
                      </div>
                      <Switch
                        id={`preset-participants-switch-${preset.id}`}
                        size="sm"
                        checked={preset.isParticipantsEnabled}
                        onChange={(checked) =>
                          handleUpdatePreset(idx, (p) => ({
                            ...p,
                            isParticipantsEnabled: checked,
                            activeParticipantIds: p.activeParticipantIds ?? [],
                          }))
                        }
                      />
                    </div>

                    {preset.isParticipantsEnabled && (
                      <div className="pt-1.5 space-y-2.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-neutral-700">
                            ▼ プリセット用参加定義（最大14名まで同時に参加可能 / 初期値は全員OFF）
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded font-black border text-xs ${
                                (preset.activeParticipantIds || []).length >= 14
                                  ? 'bg-amber-100 text-amber-900 border-amber-600 font-extrabold'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-600'
                              }`}
                            >
                              参加中: {(preset.activeParticipantIds || []).length} / 14名
                            </span>
                            {(preset.activeParticipantIds || []).length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdatePreset(idx, (p) => ({
                                    ...p,
                                    activeParticipantIds: [],
                                  }))
                                }
                                className="text-[10px] bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-950 px-2 py-0.5 rounded cursor-pointer font-bold shadow-2xs"
                              >
                                全員オフ
                              </button>
                            )}
                          </div>
                        </div>

                        {participantsWithNames.length === 0 ? (
                          <div className="p-2.5 bg-amber-50 rounded border border-neutral-300 text-xs text-neutral-600 font-bold">
                            ※ サブコンソール１で参加者の名前を入力すると、ここに切り替えスイッチが表示されます。
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {participantsWithNames.map((p) => {
                              const isSelected = (preset.activeParticipantIds || []).includes(p.id);
                              return (
                                <div
                                  key={p.id}
                                  className="bg-white text-neutral-950 p-2 rounded-lg border-2 border-neutral-950 flex items-center justify-between shadow-2xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0 mr-2">
                                    <div className="w-6 h-6 rounded-full border border-neutral-900 overflow-hidden bg-amber-100 flex-shrink-0 flex items-center justify-center">
                                      {p.avatarUrl ? (
                                        <img
                                          src={p.avatarUrl}
                                          alt={p.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <span className="text-[9px] font-black text-neutral-800">
                                          #{p.id}
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className="text-xs font-bold text-neutral-950 truncate"
                                      title={p.name}
                                    >
                                      {p.name}
                                    </span>
                                  </div>

                                  <Switch
                                    size="sm"
                                    checked={isSelected}
                                    onChange={(checked) => {
                                      if (checked) {
                                        const current = preset.activeParticipantIds || [];
                                        if (current.length >= 14) {
                                          showToast('※ 同時に参加できるのは最大14名までです');
                                          return;
                                        }
                                        handleUpdatePreset(idx, (prevP) => ({
                                          ...prevP,
                                          activeParticipantIds: [...(prevP.activeParticipantIds || []), p.id],
                                        }));
                                      } else {
                                        handleUpdatePreset(idx, (prevP) => ({
                                          ...prevP,
                                          activeParticipantIds: (prevP.activeParticipantIds || []).filter(
                                            (id) => id !== p.id
                                          ),
                                        }));
                                      }
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. タイマーの設定 */}
                  <div className="bg-white p-3.5 sm:p-4 rounded-xl border-2 border-purple-400 shadow-xs space-y-2.5 text-neutral-950">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                        <span className="text-xs sm:text-sm font-black text-neutral-950">
                          タイマーの設定
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-700">
                          独自の時間を設定する:
                        </span>
                        <Switch
                          id={`preset-timer-switch-${preset.id}`}
                          size="sm"
                          checked={!!preset.isCustomTimerEnabled}
                          onChange={(checked) =>
                            handleUpdatePreset(idx, (p) => ({
                              ...p,
                              isCustomTimerEnabled: checked,
                              customTimer:
                                p.customTimer || {
                                  totalMinutes: state.timer.totalMinutes,
                                  totalSeconds: state.timer.totalSeconds,
                                  alertMinutes: state.timer.alertMinutes,
                                  alertSeconds: state.timer.alertSeconds,
                                },
                            }))
                          }
                        />
                      </div>
                    </div>

                    {preset.isCustomTimerEnabled && (
                      <div className="pt-2 space-y-3 animate-in fade-in duration-150 border-t border-purple-200">
                        {/* Quick preset buttons */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-neutral-700 mr-1">
                            クイック設定:
                          </span>
                          {[1, 2, 3, 4, 5, 10].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() =>
                                handleUpdatePreset(idx, (p) => ({
                                  ...p,
                                  customTimer: {
                                    totalMinutes: mins,
                                    totalSeconds: 0,
                                    alertMinutes: mins > 1 ? 0 : 0,
                                    alertSeconds: 30,
                                  },
                                }))
                              }
                              className="px-2.5 py-1 text-xs font-black bg-white hover:bg-purple-100 text-neutral-950 border-2 border-neutral-950 rounded cursor-pointer shadow-2xs"
                            >
                              {mins}分
                            </button>
                          ))}
                        </div>

                        {/* Total & Alert input boxes (NO "モニター表示" switch) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* トータル時間 */}
                          <div className="p-2.5 bg-white rounded-lg border-2 border-neutral-950 space-y-1">
                            <span className="text-xs font-black text-neutral-900">
                              トータル時間:
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="99"
                                  value={preset.customTimer?.totalMinutes ?? 3}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(99, parseInt(e.target.value) || 0));
                                    handleUpdatePreset(idx, (p) => ({
                                      ...p,
                                      customTimer: {
                                        totalMinutes: val,
                                        totalSeconds: p.customTimer?.totalSeconds ?? 0,
                                        alertMinutes: p.customTimer?.alertMinutes ?? 0,
                                        alertSeconds: p.customTimer?.alertSeconds ?? 30,
                                      },
                                    }));
                                  }}
                                  className="w-16 px-2 py-1 text-sm font-black border-2 border-neutral-950 rounded bg-white text-neutral-950 text-center"
                                />
                                <span className="text-xs font-bold text-neutral-950">分</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={preset.customTimer?.totalSeconds ?? 0}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                                    handleUpdatePreset(idx, (p) => ({
                                      ...p,
                                      customTimer: {
                                        totalMinutes: p.customTimer?.totalMinutes ?? 3,
                                        totalSeconds: val,
                                        alertMinutes: p.customTimer?.alertMinutes ?? 0,
                                        alertSeconds: p.customTimer?.alertSeconds ?? 30,
                                      },
                                    }));
                                  }}
                                  className="w-16 px-2 py-1 text-sm font-black border-2 border-neutral-950 rounded bg-white text-neutral-950 text-center"
                                />
                                <span className="text-xs font-bold text-neutral-950">秒</span>
                              </div>
                            </div>
                          </div>

                          {/* 警告時間 */}
                          <div className="p-2.5 bg-white rounded-lg border-2 border-neutral-950 space-y-1">
                            <span className="text-xs font-black text-amber-700">
                              警告時間（文字が赤点滅）:
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="99"
                                  value={preset.customTimer?.alertMinutes ?? 0}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(99, parseInt(e.target.value) || 0));
                                    handleUpdatePreset(idx, (p) => ({
                                      ...p,
                                      customTimer: {
                                        totalMinutes: p.customTimer?.totalMinutes ?? 3,
                                        totalSeconds: p.customTimer?.totalSeconds ?? 0,
                                        alertMinutes: val,
                                        alertSeconds: p.customTimer?.alertSeconds ?? 30,
                                      },
                                    }));
                                  }}
                                  className="w-16 px-2 py-1 text-sm font-black border-2 border-neutral-950 rounded bg-white text-neutral-950 text-center"
                                />
                                <span className="text-xs font-bold text-neutral-950">分</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={preset.customTimer?.alertSeconds ?? 30}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                                    handleUpdatePreset(idx, (p) => ({
                                      ...p,
                                      customTimer: {
                                        totalMinutes: p.customTimer?.totalMinutes ?? 3,
                                        totalSeconds: p.customTimer?.totalSeconds ?? 0,
                                        alertMinutes: p.customTimer?.alertMinutes ?? 0,
                                        alertSeconds: val,
                                      },
                                    }));
                                  }}
                                  className="w-16 px-2 py-1 text-sm font-black border-2 border-neutral-950 rounded bg-white text-neutral-950 text-center"
                                />
                                <span className="text-xs font-bold text-neutral-950">秒</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

                  {/* Card Bottom Actions (Right: コピー & ゴミ箱) */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
                    <span className="text-[11px] font-bold text-neutral-500">
                      ドラッグで上下並び替え可能
                    </span>

                    <div className="flex items-center gap-2">
                      {/* コピー ボタン */}
                      <button
                        type="button"
                        onClick={() => handleCopyPreset(idx)}
                        className="inline-flex items-center gap-1 bg-white hover:bg-neutral-100 text-neutral-950 px-3 py-1.5 rounded-lg border-2 border-neutral-950 text-xs font-bold cursor-pointer transition shadow-2xs"
                        title="この設定の欄を直下に複製します"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>コピー</span>
                      </button>

                      {/* ゴミ箱 ボタン */}
                      <button
                        type="button"
                        onClick={() => handleDeletePreset(idx)}
                        className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg border-2 border-red-700 text-xs font-bold cursor-pointer transition shadow-2xs"
                        title="この設定の欄を削除します"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>削除</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 設定を増やす ボタン */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleAddPreset}
            className="w-full py-4 rounded-xl border-2 border-dashed border-purple-500 hover:border-purple-600 bg-purple-50/70 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/40 text-purple-950 dark:text-purple-200 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm cursor-pointer transition hover:scale-[1.01] active:scale-99"
          >
            <Plus className="w-5 h-5 text-purple-700 dark:text-purple-300" />
            <span>設定を増やす（設定 {(state.presets?.length || 0) + 1} 番を作成）</span>
          </button>
        </div>

        {/* Subconsole 2 Bottom Navigation */}
        <div className="pt-4 pb-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentPage('sub1_prep')}
            className="inline-flex items-center gap-2 bg-sky-700 hover:bg-sky-800 text-white px-5 py-3 rounded-xl font-black text-sm cursor-pointer shadow-lg border-2 border-sky-900 transition hover:scale-102"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>サブコンソール１：準備 に戻る</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage('main')}
            className="inline-flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-amber-300 px-6 py-3 rounded-xl font-black text-sm cursor-pointer shadow-lg border-2 border-neutral-950 transition hover:scale-102"
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>メインコンソール（本番進行）へ移動</span>
          </button>
        </div>
      </div>
    </div>
  </main>

  {/* Easter Egg Trigger (コンソール画面の全ての欄よりも下、左下) */}
  <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-6 pt-2 flex justify-start">
    <button
      type="button"
      onClick={() => setShowEasterEggModal(true)}
      aria-label="クレジット"
      className="text-base sm:text-lg opacity-40 hover:opacity-100 transition-opacity cursor-pointer p-1 select-none hover:scale-110 active:scale-95"
      title="クレジット"
    >
      ❤️
    </button>
  </footer>

  {/* Easter Egg Modal */}
  {showEasterEggModal && (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => setShowEasterEggModal(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 cursor-pointer animate-in fade-in duration-150"
    >
      <div
        onClick={() => setShowEasterEggModal(false)}
        className="bg-neutral-900 border-2 border-amber-400 text-neutral-100 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 cursor-pointer select-none"
      >
        <div className="whitespace-pre-line text-sm sm:text-base font-bold leading-relaxed tracking-wide text-neutral-200">
{`生大喜利会用コンソールシステム（仮）2026/10/28版
made with : google AI Studio / Gemini Flash 3.8

参考にさせていただいた方々
中木光（イチゴ大戦争／イチゴ小戦争のシステム）
ボケルバ（ボケルバのシステム）
ここあぱうだ（大喜利こなまみれのシステム）
その他、いろんな番組とかライブとかの演出など`}
        </div>
        <div className="pt-2 text-right">
          <span className="text-xs text-neutral-400">（画面をクリックすると閉じます）</span>
        </div>
      </div>
    </div>
  )}

  {/* In-app Confirmation Modal (replaces browser window.confirm) */}
  <ConfirmModal
    isOpen={confirmModal.isOpen}
    title={confirmModal.title}
    message={confirmModal.message}
    confirmLabel="はい"
    cancelLabel="いいえ"
    onConfirm={() => {
      confirmModal.onConfirm();
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }}
    onCancel={() => {
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }}
  />
</div>
);
};
