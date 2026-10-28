import { useEffect, useState } from 'react';
import { useOgiriSync } from './hooks/useOgiriSync';
import { ConsoleView } from './components/ConsoleView';
import { MonitorView } from './components/MonitorView';
import { AudienceVoteView } from './components/AudienceVoteView';
import { Columns2, Monitor, SlidersHorizontal, Vote } from 'lucide-react';
import { getActiveOrderedParticipants, calculateParticipantRanks } from './utils/ogiriLogic';
import { GameLogItem } from './types/ogiri';
import {
  subscribeToVotersAndVotes,
  updateVotingSession,
} from './services/audienceVotingService';

export default function App() {
  const { state, updateState } = useOgiriSync();

  // Detect mode from query parameter
  const [viewMode, setViewMode] = useState<'console' | 'monitor' | 'split' | 'vote'>(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || params.get('view');
    if (mode === 'vote') return 'vote';
    if (mode === 'monitor') return 'monitor';
    if (mode === 'split') return 'split';
    return 'console';
  });

  // Listen to popstate in case URL changes
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode') || params.get('view');
      if (mode === 'vote') {
        setViewMode('vote');
      } else if (mode === 'monitor') {
        setViewMode('monitor');
      } else if (mode === 'split') {
        setViewMode('split');
      } else {
        setViewMode('console');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync state to Firebase Voting Session when in console/monitor mode
  useEffect(() => {
    if (viewMode === 'vote') return;

    const activeList = getActiveOrderedParticipants(
      state.participants,
      state.activeParticipantOrder
    );
    const selectedTopic = state.topics.find((t) => t.id === state.selectedTopicNumber);

    updateVotingSession({
      isQrVisible: !!state.audienceVoting?.isQrVisible,
      isVotingActive: !!state.audienceVoting?.isVotingActive,
      maxVotesPerPerson: state.audienceVoting?.maxVotesPerPerson || 1,
      allowMultipleVotesPerParticipant:
        !!state.audienceVoting?.allowMultipleVotesPerParticipant,
      topicText: selectedTopic?.text || '',
      activeParticipants: activeList.map((p) => ({
        id: p.id,
        name: p.name,
        teamName: p.teamName,
        avatarUrl: p.avatarUrl,
      })),
    }).catch(() => {});
  }, [
    viewMode,
    state.audienceVoting?.isQrVisible,
    state.audienceVoting?.isVotingActive,
    state.audienceVoting?.maxVotesPerPerson,
    state.audienceVoting?.allowMultipleVotesPerParticipant,
    state.selectedTopicNumber,
    state.topics,
    state.participants,
    state.activeParticipantOrder,
  ]);

  // Subscribe to incoming audience voters and votes from Firestore
  useEffect(() => {
    if (viewMode === 'vote') return;

    const unsubscribe = subscribeToVotersAndVotes(({ voters, votes }) => {
      updateState((prev) => {
        const prevVotes = prev.audienceVotes || {};
        const prevVoters = prev.audienceVoters || [];

        const votesChanged = JSON.stringify(prevVotes) !== JSON.stringify(votes);
        const votersChanged =
          prevVoters.length !== voters.length ||
          JSON.stringify(prevVoters.map((v) => `${v.id}_${v.hasVoted}`)) !==
            JSON.stringify(voters.map((v) => `${v.id}_${v.hasVoted}`));

        if (!votesChanged && !votersChanged) return prev;

        return {
          ...prev,
          audienceVotes: votes,
          audienceVoters: voters,
        };
      });
    });

    return () => unsubscribe();
  }, [viewMode, updateState]);

  const handleSaveGameLog = () => {
    updateState((prev) => {
      const selectedTopic = prev.topics.find((t) => t.id === prev.selectedTopicNumber);
      const isScoring = prev.isScoringModeEnabled !== false;
      const isWhale = !!prev.isWhaleMode;

      const activeList = getActiveOrderedParticipants(
        prev.participants,
        prev.activeParticipantOrder
      );

      // In audience voting mode without scoring mode, use audience votes as the score
      const audienceVotesMap = prev.audienceVotes || {};
      const participantScores = activeList.map((p) => ({
        id: p.id,
        name: p.name,
        teamName: p.teamName,
        score: isScoring ? (p.score ?? 0) : (audienceVotesMap[p.id] ?? 0),
      }));

      const totalScore =
        isWhale && isScoring
          ? participantScores.reduce((sum, p) => sum + p.score, 0)
          : undefined;

      // If result announcement was run, calculate and record ranks for each participant
      const isAnnouncementActive =
        !!prev.resultAnnouncement?.isActive || !!prev.resultAnnouncement?.isCompleted;
      const ranks = isAnnouncementActive
        ? calculateParticipantRanks(participantScores)
        : {};

      const participantScoresWithRank = participantScores.map((p) => ({
        ...p,
        rank: isAnnouncementActive ? ranks[p.id] : undefined,
      }));

      const existingLogs = prev.gameLogs || [];
      const newLogId = existingLogs.length + 1;

      const now = new Date();
      const timeStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      // Check if title is visible and non-empty
      const activeTitle = (prev.titles || []).find(
        (t) => t.id === (prev.selectedTitleNumber || 1)
      );
      const titleText =
        prev.isTitleVisible && activeTitle?.text?.trim()
          ? activeTitle.text.trim()
          : undefined;

      // Filter non-empty answer logs (where respondent or text has content)
      const nonNullAnswerLogs = (prev.answerLogs || []).filter(
        (l) => l.respondentName.trim() !== '' || l.answerText.trim() !== ''
      );

      const newLog: GameLogItem = {
        id: newLogId,
        timestamp: timeStr,
        titleText,
        topicNumber: prev.selectedTopicNumber,
        topicText: selectedTopic?.text || '（お題なし）',
        isScoringMode: isScoring,
        isWhaleMode: isWhale,
        totalScore,
        participants: participantScoresWithRank,
        answerLogs: nonNullAnswerLogs.length > 0 ? nonNullAnswerLogs : undefined,
        colorPalette: prev.colorPalette || 'yellow',
      };

      return {
        ...prev,
        gameLogs: [...existingLogs, newLog],
      };
    });
  };

  const openMonitorWindow = () => {
    const monitorUrl = `${window.location.origin}${window.location.pathname}?mode=monitor`;
    const newWin = window.open(
      monitorUrl,
      'ogiri_monitor_window',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
    if (!newWin) {
      alert(
        'ポップアップがブロックされました。ブラウザのポップアップ許可を設定するか、新しいタブで開いてください。'
      );
    }
  };

  // Switch views
  const handleSwitchMode = (mode: 'console' | 'monitor' | 'split' | 'vote') => {
    setViewMode(mode);
    const url = new URL(window.location.href);
    if (mode === 'monitor' || mode === 'split' || mode === 'vote') {
      url.searchParams.set('mode', mode);
    } else {
      url.searchParams.delete('mode');
    }
    window.history.replaceState({}, '', url.toString());
  };

  // Dedicated Audience Vote Screen
  if (viewMode === 'vote') {
    return <AudienceVoteView />;
  }

  if (viewMode === 'monitor') {
    return (
      <MonitorView
        state={state}
        onSwitchToConsoleView={() => handleSwitchMode('console')}
        onSaveGameLog={handleSaveGameLog}
      />
    );
  }


  if (viewMode === 'split') {
    return (
      <div className="min-h-screen bg-[#FEF9C3] flex flex-col">
        {/* Split view top bar */}
        <header className="bg-neutral-950 text-white px-4 py-2 flex items-center justify-between text-xs font-bold border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-neutral-950 px-2 py-0.5 rounded text-[11px] font-black">
              2画面プレビューモード
            </span>
            <span>左：操作コンソール ｜ 右：プロジェクター用モニター</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSwitchMode('console')}
              className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 rounded cursor-pointer"
            >
              コンソール画面のみ
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('monitor')}
              className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 rounded cursor-pointer"
            >
              モニター画面のみ
            </button>
            <button
              type="button"
              onClick={openMonitorWindow}
              className="bg-amber-400 hover:bg-amber-300 text-neutral-950 px-3 py-1 rounded cursor-pointer font-black"
            >
              別ウィンドウで開く
            </button>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x-4 divide-neutral-950 h-full overflow-hidden">
          <div className="overflow-y-auto max-h-[calc(100vh-42px)]">
            <ConsoleView
              state={state}
              updateState={updateState}
              onOpenMonitor={openMonitorWindow}
              onSwitchToMonitorView={() => handleSwitchMode('monitor')}
              onSaveGameLog={handleSaveGameLog}
            />
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-42px)] relative border-l-2 border-neutral-950 shadow-inner">
            <div className="absolute top-2 left-2 z-20 bg-neutral-950 text-white text-[10px] px-2 py-0.5 rounded font-black opacity-75">
              拡張画面プレビュー
            </div>
            <MonitorView
              state={state}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Floating fast mode switcher */}
      <div className="fixed bottom-4 right-4 z-40 bg-neutral-950/90 text-white p-1.5 rounded-xl border border-neutral-700 shadow-xl flex items-center gap-1 text-xs backdrop-blur">
        <button
          type="button"
          onClick={() => handleSwitchMode('console')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer bg-amber-400 text-neutral-950"
          title="コンソール画面"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>コンソール</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchMode('monitor')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer hover:bg-neutral-800 text-neutral-300"
          title="モニター画面"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>モニター</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchMode('split')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer hover:bg-neutral-800 text-neutral-300"
          title="1画面内で両方を分割確認"
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span>分割</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchMode('vote')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer bg-neutral-800 hover:bg-amber-400 hover:text-neutral-950 text-amber-300 border border-neutral-700"
          title="観覧者スマートフォン投票画面（スマホ用）"
        >
          <Vote className="w-3.5 h-3.5" />
          <span>投票画面</span>
        </button>
      </div>

      <ConsoleView
        state={state}
        updateState={updateState}
        onOpenMonitor={openMonitorWindow}
        onSwitchToMonitorView={() => handleSwitchMode('monitor')}
        onSaveGameLog={handleSaveGameLog}
      />
    </div>
  );
}
