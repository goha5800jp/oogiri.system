import React, { useEffect, useRef, useState } from 'react';
import { OgiriState, Participant } from '../types/ogiri';
import {
  parseTopicLines,
  getTopicFontSize,
  getPhotoTopicFontSize,
  getActiveOrderedParticipants,
  formatTimeMMSS,
  getPaletteTheme,
  parseParticipantName,
  getParticipantNameFontSize,
  TOPIC_FONT_OPTIONS,
} from '../utils/ogiriLogic';
import { ZoomControl } from './ZoomControl';
import { Maximize2, Minimize2, Settings, User, BookmarkPlus, CheckCircle2, Trophy, Vote, QrCode as QrIcon } from 'lucide-react';
import QRCode from 'qrcode';

interface MonitorViewProps {
  state: OgiriState;
  onSwitchToConsoleView?: () => void;
  onSaveGameLog?: () => void;
}

export const MonitorView: React.FC<MonitorViewProps> = ({
  state,
  onSwitchToConsoleView,
  onSaveGameLog,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('flip_ogiri_monitor_zoom');
      return saved ? parseFloat(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });

  // Track animating score changes for each participant
  const [animatingScores, setAnimatingScores] = useState<Record<number, 'inc' | 'dec'>>({});
  const [showSaveLogToast, setShowSaveLogToast] = useState(false);
  const prevScoresRef = useRef<Record<number, number>>({});
  const animTimersRef = useRef<Record<number, NodeJS.Timeout>>({});

  // Cleanup all animation timers on unmount
  useEffect(() => {
    return () => {
      Object.values(animTimersRef.current).forEach((t) => clearTimeout(t));
      animTimersRef.current = {};
    };
  }, []);

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    try {
      localStorage.setItem('flip_ogiri_monitor_zoom', newZoom.toString());
    } catch {}
  };

  // Generate QR code for mobile audience voting
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  useEffect(() => {
    if (!state.audienceVoting?.isQrVisible) return;
    const voteUrl = `${window.location.origin}${window.location.pathname}?mode=vote`;
    QRCode.toDataURL(voteUrl, {
      width: 340,
      margin: 1.5,
      color: {
        dark: '#0a0a0a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.warn('QR code generation failed:', err));
  }, [state.audienceVoting?.isQrVisible]);

  // Monitor fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  // Theme configuration based on state.colorPalette
  const theme = getPaletteTheme(state.colorPalette);

  // Find the selected topic
  const selectedTopic = state.topics.find(
    (t) => t.id === state.selectedTopicNumber
  );

  // Parse lines with (k) replacement
  const rawTopicText = selectedTopic?.text || '';
  const lines = parseTopicLines(rawTopicText);
  const hasText = lines.length > 0 && lines.some((l) => l.trim() !== '');
  const hasImage = !!selectedTopic?.imageUrl;
  const topicOffset = state.topicFontSizeOffset ?? 0;
  const { fontSizeClass, lineHeightClass } = getTopicFontSize(lines, topicOffset);
  const { fontSizeClass: photoFontSizeClass, lineHeightClass: photoLineHeightClass } =
    getPhotoTopicFontSize(topicOffset);

  // Font family and weight styling
  const currentFontFamily =
    TOPIC_FONT_OPTIONS.find((f) => f.id === state.topicFontFamily)?.fontFamily ||
    "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif";
  const isBold = state.isTopicBold ?? true;

  // Get active participants in ordered sequence (max 14 on monitor)
  const allOrderedParticipants = getActiveOrderedParticipants(
    state.participants,
    state.activeParticipantOrder
  );
  const orderedParticipants = allOrderedParticipants.slice(0, 14);
  const isCompact = orderedParticipants.length >= 8;

  // Result Announcement ceremony state & elapsed tracking
  const ceremonyActive = !!state.resultAnnouncement?.isActive;
  const [ceremonyElapsedMs, setCeremonyElapsedMs] = useState(0);

  useEffect(() => {
    if (!state.resultAnnouncement?.isActive) {
      setCeremonyElapsedMs(0);
      return;
    }
    const startedAt = state.resultAnnouncement.startedAt;
    const updateElapsed = () => {
      setCeremonyElapsedMs(Date.now() - startedAt);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 50);
    return () => clearInterval(interval);
  }, [state.resultAnnouncement?.isActive, state.resultAnnouncement?.startedAt]);

  // Compute reveal schedule and ranks for ceremony
  const ceremonySchedule = React.useMemo(() => {
    if (!ceremonyActive || orderedParticipants.length === 0) {
      return {
        ranks: {} as Record<number, number>,
        revealTimes: {} as Record<number, number>,
        isTied: {} as Record<number, boolean>,
        totalDurationMs: 0,
      };
    }

    const isScoring = state.isScoringModeEnabled !== false;
    const getEffectiveScore = (p: Participant) =>
      isScoring ? (p.score ?? 0) : (state.audienceVotes?.[p.id] ?? 0);

    // Calculate standard competition ranks
    const sortedDesc = [...orderedParticipants].sort(
      (a, b) => getEffectiveScore(b) - getEffectiveScore(a)
    );
    const ranks: Record<number, number> = {};
    let curRank = 1;
    for (let i = 0; i < sortedDesc.length; i++) {
      if (
        i > 0 &&
        getEffectiveScore(sortedDesc[i]) < getEffectiveScore(sortedDesc[i - 1])
      ) {
        curRank = i + 1;
      }
      ranks[sortedDesc[i].id] = curRank;
    }

    // Count participants per rank to determine ties
    const rankCounts: Record<number, number> = {};
    Object.values(ranks).forEach((r) => {
      rankCounts[r] = (rankCounts[r] || 0) + 1;
    });
    const isTied: Record<number, boolean> = {};
    Object.entries(ranks).forEach(([idStr, r]) => {
      isTied[Number(idStr)] = (rankCounts[r] || 0) > 1;
    });

    // Group participants by distinct score, ascending (lowest score first)
    const uniqueScoresAsc = Array.from(
      new Set(orderedParticipants.map((p) => getEffectiveScore(p)))
    ).sort((a, b) => a - b);

    const revealTimes: Record<number, number> = {};
    let curTime = 4000; // First 4 seconds: all participants shake asynchronously

    // Reveal groups below 2nd place (rank > 2) one by one, 1s apart
    const nonFinalistScores = uniqueScoresAsc.filter((score) => {
      const match = orderedParticipants.filter((p) => getEffectiveScore(p) === score);
      return match.length > 0 && ranks[match[0].id] > 2;
    });

    nonFinalistScores.forEach((score) => {
      const matching = orderedParticipants.filter((p) => getEffectiveScore(p) === score);
      matching.forEach((p) => {
        revealTimes[p.id] = curTime;
      });
      curTime += 1000;
    });

    // Finalists (1st & 2nd place contenders):
    // "残りが2名（1位と2位が1人ずつ、または1位が同点で2名）あるいは残りが1位が1名で2位に2名以上の同点が居る場合のみ、アイコンや枠が揺れる時間を5秒ほど取って（結果発表をじらす時間）"
    const tPreFinal = curTime;
    const tFinal = tPreFinal + 5000; // 5 seconds suspense wobble

    const secondPlace = orderedParticipants.filter((p) => ranks[p.id] === 2);
    const firstPlace = orderedParticipants.filter((p) => ranks[p.id] === 1);

    if (secondPlace.length > 0) {
      secondPlace.forEach((p) => {
        revealTimes[p.id] = tFinal;
      });
      firstPlace.forEach((p) => {
        revealTimes[p.id] = tFinal + 1000; // 1st place revealed after 2nd place
      });
    } else {
      // All finalists are tied for 1st place
      firstPlace.forEach((p) => {
        revealTimes[p.id] = tFinal;
      });
    }

    const maxReveal = Math.max(...Object.values(revealTimes), tFinal + 1000);
    return {
      ranks,
      revealTimes,
      isTied,
      totalDurationMs: maxReveal + 1000,
    };
  }, [ceremonyActive, orderedParticipants, state.isScoringModeEnabled, state.audienceVotes]);

  // Score change animation trigger (triggers when scores change, reverts reliably after 700ms)
  useEffect(() => {
    state.participants.forEach((p) => {
      const prev = prevScoresRef.current[p.id];
      if (prev !== undefined && prev !== p.score) {
        const type = p.score > prev ? 'inc' : 'dec';
        if (animTimersRef.current[p.id]) {
          clearTimeout(animTimersRef.current[p.id]);
        }
        setAnimatingScores((curr) => ({ ...curr, [p.id]: type }));
        animTimersRef.current[p.id] = setTimeout(() => {
          setAnimatingScores((curr) => {
            const next = { ...curr };
            delete next[p.id];
            return next;
          });
          delete animTimersRef.current[p.id];
        }, 700);
      }
      prevScoresRef.current[p.id] = p.score;
    });
  }, [state.participants]);

  // Timer alert logic
  const timer = state.timer;
  const alertThresholdSeconds =
    (timer?.alertMinutes || 0) * 60 + (timer?.alertSeconds || 0);
  const isAlertState =
    timer &&
    timer.remainingSeconds > 0 &&
    timer.remainingSeconds <= alertThresholdSeconds;
  const isTimeUp = timer && timer.remainingSeconds <= 0;

  // Responsive image maximum height classes based on surrounding content
  const getImageMaxHeightClass = () => {
    if (state.isParticipantsVisible) {
      if (isCompact) {
        // 2-row compact participants mode: keep image slightly smaller
        return hasText
          ? 'max-h-[22vh] sm:max-h-[25vh] md:max-h-[28vh]'
          : 'max-h-[36vh] sm:max-h-[40vh]';
      }
      // 1-row normal participants mode
      return hasText
        ? 'max-h-[26vh] sm:max-h-[30vh] md:max-h-[34vh]'
        : 'max-h-[44vh] sm:max-h-[48vh]';
    } else {
      if (hasText) {
        return 'max-h-[46vh] sm:max-h-[52vh]';
      }
      return 'max-h-[64vh] sm:max-h-[70vh]';
    }
  };

  // Render a single participant box
  const renderParticipantCard = (p: Participant, idx: number) => {
    const { hasBreak, lines: nameLines } = parseParticipantName(p.name);
    const fontSize = getParticipantNameFontSize(nameLines, isCompact);
    const anim = animatingScores[p.id];
    const isAnswering = state.activeAnsweringParticipantId === p.id;
    const isScoring = state.isScoringModeEnabled !== false;

    // Result announcement status for this participant
    const revealTime = ceremonySchedule.revealTimes[p.id] ?? 0;
    const isRevealed = !ceremonyActive || ceremonyElapsedMs >= revealTime;
    const pRank = ceremonySchedule.ranks[p.id];
    const isTied = ceremonySchedule.isTied[p.id];
    const isFirstPlace = pRank === 1;
    const isRedFlashing =
      ceremonyActive && isRevealed && !isFirstPlace && ceremonyElapsedMs - revealTime < 950;

    // Compute animation style for card
    let cardAnimation = 'none';
    if (ceremonyActive) {
      if (!isRevealed) {
        // Wobble & jitter asynchronously before revealed
        const duration = 0.33 + ((idx * 0.08) % 0.22);
        const delay = (idx * 0.16) % 0.45;
        cardAnimation = `result-wobble ${duration}s ease-in-out infinite ${delay}s`;
      } else if (isFirstPlace) {
        // 1st place burst and slow rainbow pulse!
        cardAnimation =
          'first-place-burst 0.75s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, rainbow-pulse 4s linear infinite 0.75s';
      } else if (isRedFlashing) {
        // Red flash upon revealing lower rank
        cardAnimation = 'result-red-flash 0.9s ease-out forwards';
      }
    }

    return (
      <div
        key={p.id}
        style={{
          animation: cardAnimation !== 'none' ? cardAnimation : undefined,
        }}
        className={`relative flex-shrink-0 flex flex-col items-center justify-between rounded-2xl border-2 sm:border-3 shadow-md transform transition-all duration-300 ease-in-out ${
          isAnswering
            ? 'w-32 xs:w-36 sm:w-40 md:w-44 lg:w-[184px] xl:w-[194px] scale-105 z-30 bg-rose-100/95 dark:bg-rose-950/90 border-rose-500 ring-4 ring-rose-400/50 shadow-xl shadow-rose-500/30 animate-pulse text-neutral-950 dark:text-white'
            : isFirstPlace && ceremonyActive && isRevealed
            ? `${theme.monitorCardClass} w-32 xs:w-36 sm:w-40 md:w-44 lg:w-[184px] xl:w-[192px] scale-108 z-30 shadow-2xl ring-4 ring-amber-400`
            : `${theme.monitorCardClass} w-28 xs:w-32 sm:w-36 md:w-40 lg:w-[162px] xl:w-[170px] hover:scale-102`
        } ${
          isCompact
            ? isAnswering
              ? 'pt-4 sm:pt-5 pb-1 px-1 min-h-[92px] sm:min-h-[100px]'
              : 'pt-4 sm:pt-5 pb-1 px-1 min-h-[86px] sm:min-h-[94px]'
            : isAnswering
            ? 'pt-8 sm:pt-9 pb-2.5 sm:pb-3 px-2 min-h-[165px] sm:min-h-[185px] md:min-h-[200px]'
            : 'pt-8 sm:pt-9 pb-2 sm:pb-2.5 px-2 min-h-[155px] sm:min-h-[175px] md:min-h-[190px]'
        }`}
      >
        {/* Rank Badge during Result Announcement (displayed above card) */}
        {ceremonyActive && isRevealed && pRank !== undefined && (
          <div className="absolute -top-9 sm:-top-10 left-1/2 -translate-x-1/2 z-35 pointer-events-none flex items-center justify-center whitespace-nowrap animate-in zoom-in-75 duration-200">
            {isFirstPlace ? (
              <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-neutral-950 font-black text-xs sm:text-sm px-3.5 py-1 rounded-full border-2 border-neutral-950 shadow-lg shadow-amber-500/50 flex items-center gap-1.5 animate-bounce">
                <span>👑</span>
                <span>第1位{isTied ? ' (同点)' : ''}</span>
              </span>
            ) : (
              <span className="bg-neutral-900 text-white font-black text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full border-2 border-neutral-700 shadow-md flex items-center gap-1">
                <span>第{pRank}位{isTied ? ' (同点)' : ''}</span>
              </span>
            )}
          </div>
        )}

        {/* Top overlapping square avatar & number badge (縦横200%に拡大) */}
        <div
          className={`absolute -top-6 sm:-top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 pointer-events-none ${
            ceremonyActive && isRevealed && pRank !== undefined ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {/* Number circle badge */}
          <span
            className={`text-xs sm:text-sm font-black ${theme.badgeClass} w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border shadow-sm flex-shrink-0`}
          >
            {idx + 1}
          </span>

          {/* Square avatar icon overlapping card border (200% size) */}
          <div
            style={{
              animation:
                ceremonyActive && !isRevealed
                  ? `result-wobble ${0.28 + ((idx * 0.05) % 0.2)}s ease-in-out infinite ${
                      (idx * 0.12) % 0.4
                    }s`
                  : undefined,
            }}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 sm:border-3 shadow-md flex items-center justify-center overflow-hidden flex-shrink-0 ${
              isAnswering
                ? 'border-rose-600 bg-rose-200 text-rose-950 ring-2 ring-rose-400'
                : theme.isDark
                ? 'border-neutral-600 bg-neutral-800 text-white'
                : 'border-neutral-950 bg-amber-100 text-neutral-950'
            }`}
          >
            {p.avatarUrl ? (
              <img
                src={p.avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-7 h-7 sm:w-8 sm:h-8 text-neutral-700" />
            )}
          </div>

          {/* 回答中 indicator tag */}
          {isAnswering && (
            <span className="text-[10px] sm:text-xs font-black bg-rose-600 text-white px-2 py-0.5 rounded-full border border-white shadow-md animate-bounce flex-shrink-0">
              回答中
            </span>
          )}
        </div>

        {/* Middle: Name (一段下に下げて最大2行、(k)改行対応、文字数による可変フォントサイズ) */}
        <div
          className={`w-full flex flex-col items-center justify-center text-center overflow-hidden px-0.5 ${
            isCompact ? 'h-6 sm:h-7 mb-0.5' : 'h-10 sm:h-12 md:h-14 mb-1'
          }`}
        >
          {hasBreak ? (
            <>
              <span className={`w-full truncate leading-tight ${fontSize}`}>
                {nameLines[0]}
              </span>
              <span className={`w-full truncate leading-tight ${fontSize}`}>
                {nameLines[1]}
              </span>
            </>
          ) : (
            <span
              className={`w-full leading-tight line-clamp-2 break-all text-center ${fontSize}`}
            >
              {nameLines[0] || p.name}
            </span>
          )}
        </div>

        {/* Bottom: Score (加点モードON時のみ表示) */}
        {isScoring ? (
          <div className="flex items-baseline justify-center relative min-h-[30px] sm:min-h-[40px]">
            {ceremonyActive && !isRevealed ? (
              // During ceremony, unrevealed contestants' scores are completely hidden
              <div className="h-6 sm:h-10" />
            ) : !ceremonyActive && state.isScoreHiddenOnMonitor ? (
              <span
                className={`font-mono font-black tracking-widest text-neutral-500 animate-pulse ${
                  isCompact
                    ? 'text-xl sm:text-2xl md:text-3xl'
                    : 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl'
                }`}
              >
                ???
              </span>
            ) : (
              <>
                <span
                  className={`font-mono font-black leading-none inline-block transform transition-all duration-300 ${
                    isCompact
                      ? 'text-xl sm:text-2xl md:text-3xl'
                      : isFirstPlace && ceremonyActive
                      ? 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-amber-600 dark:text-amber-300'
                      : 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl'
                  } ${
                    anim === 'inc'
                      ? 'scale-125 text-emerald-500 -translate-y-1'
                      : anim === 'dec'
                      ? 'scale-90 text-rose-500 translate-y-1'
                      : ''
                  }`}
                >
                  {p.score ?? 0}
                </span>
                <span
                  className={`font-black ml-1 ${
                    isCompact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'
                  }`}
                >
                  点
                </span>
              </>
            )}
          </div>
        ) : (state.audienceVoting?.isVotingActive || Object.keys(state.audienceVotes || {}).length > 0) ? (
          <div className="flex items-baseline justify-center relative min-h-[30px] sm:min-h-[40px]">
            {ceremonyActive && !isRevealed ? (
              <div className="h-6 sm:h-10" />
            ) : (
              <>
                <span
                  className={`font-mono font-black leading-none inline-block transform transition-all duration-300 ${
                    isCompact
                      ? 'text-xl sm:text-2xl md:text-3xl'
                      : isFirstPlace && ceremonyActive
                      ? 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-amber-600 dark:text-amber-300'
                      : 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl'
                  }`}
                >
                  {state.audienceVotes?.[p.id] || 0}
                </span>
                <span
                  className={`font-black ml-1 ${
                    isCompact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'
                  }`}
                >
                  票
                </span>
              </>
            )}
          </div>
        ) : (
          <div className="h-1.5" />
        )}
      </div>
    );
  };

  // Selected title text for display
  const selectedTitle = (state.titles || []).find(
    (t) => t.id === (state.selectedTitleNumber || 1)
  );
  const currentTitleText = selectedTitle?.text?.trim() || '';
  const isTitleDisplayed = !!state.isTitleVisible && !!currentTitleText;

  return (
    <div
      style={{ zoom, backgroundColor: theme.bgHex }}
      className={`relative w-screen h-screen min-h-screen ${theme.textColorClass} font-bold overflow-hidden flex flex-col justify-between p-3 sm:p-5 lg:p-6 select-none transition-colors duration-200`}
    >
      {/* Toast notification on saving match log */}
      {showSaveLogToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-5 py-2.5 rounded-full shadow-2xl border-2 border-white text-sm font-black flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>第 {state.gameLogs?.length || 1} 回の試合ログを記録しました！</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* TOP BAR: Controls & Timer Area */}
      {/* ======================================================== */}
      <div className="relative w-full flex items-start justify-between z-40 flex-shrink-0 mb-1">
        {/* Top Left: Zoom Control & Navigation */}
        <div className="flex items-center gap-2">
          <ZoomControl zoom={zoom} onZoomChange={handleZoomChange} isDark={theme.isDark} />

          <div className="flex items-center gap-1.5 opacity-30 hover:opacity-100 transition-opacity duration-200">
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? '全画面解除' : '全画面表示'}
              className={`p-1.5 rounded-lg shadow-md cursor-pointer transition border ${
                theme.isDark
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-600'
                  : 'bg-neutral-950/80 hover:bg-neutral-950 text-white border-neutral-700'
              }`}
              title="全画面表示の切り替え (F11)"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {onSwitchToConsoleView && (
              <button
                type="button"
                onClick={onSwitchToConsoleView}
                aria-label="コンソール画面へ切り替え"
                className={`p-1.5 rounded-lg shadow-md cursor-pointer transition border flex items-center gap-1 px-2.5 text-xs font-bold ${
                  theme.isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-600'
                    : 'bg-neutral-950/80 hover:bg-neutral-950 text-white border-neutral-700'
                }`}
                title="操作コンソール画面へ戻る"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">コンソールへ</span>
              </button>
            )}
          </div>
        </div>

        {/* Center: Title Display (タイマーと同じ画面の高さの中央部) */}
        {isTitleDisplayed && (
          <div className="absolute left-1/2 -translate-x-1/2 top-0 max-w-[45vw] text-center pointer-events-none z-30">
            <div
              className={`px-4 sm:px-6 py-1 sm:py-2 rounded-2xl border-2 sm:border-3 font-black text-lg sm:text-2xl md:text-3xl shadow-xl tracking-wide truncate ${
                theme.isDark
                  ? 'bg-neutral-900/95 text-sky-300 border-sky-500 shadow-sky-950/40'
                  : 'bg-white/95 text-neutral-950 border-neutral-950 shadow-md'
              }`}
            >
              {currentTitleText}
            </div>
          </div>
        )}

        {/* Top Right Timer (Only when isEnabled is ON) */}
        {timer && timer.isEnabled && (
          <div className="flex flex-col items-end">
            <div
              className={`px-4 py-1.5 sm:px-6 sm:py-2.5 rounded-2xl border-4 font-mono font-black text-2xl sm:text-4xl lg:text-5xl tracking-wider shadow-xl transition-all duration-300 ${
                isTimeUp
                  ? 'bg-red-600 text-white border-neutral-950 animate-pulse'
                  : isAlertState
                  ? theme.isDark
                    ? 'bg-neutral-900 text-red-500 border-red-500 ring-4 ring-red-400/50 animate-pulse'
                    : 'bg-white text-red-600 border-red-600 ring-4 ring-red-400/50 animate-pulse'
                  : theme.isDark
                  ? 'bg-neutral-900 text-white border-neutral-600'
                  : 'bg-white text-neutral-950 border-neutral-950'
              }`}
            >
              {formatTimeMMSS(timer.remainingSeconds)}
            </div>
            {isTimeUp && (
              <span className="text-[11px] sm:text-xs font-black text-red-700 bg-red-100 border border-red-600 px-2 py-0.5 rounded mt-0.5 shadow-xs">
                TIME UP!
              </span>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* UPPER ~ MIDDLE SECTION: トピックまたは観覧者投票QRコード表示 */}
      {/* ======================================================== */}
      <section className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-2 sm:px-6 py-1 my-auto overflow-hidden">
        {state.audienceVoting?.isQrVisible && !ceremonyActive ? (
          /* ======================================================== */
          /* 観覧者スマートフォン投票 QRコード表示モード */
          /* お題は上部に縮小移動し、中央に大画面QRコードを表示 */
          /* ======================================================== */
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center h-full space-y-3 sm:space-y-4 my-auto">
            {/* Shrunk Topic Header on Top */}
            {state.isTopicVisible && (hasText || hasImage) && (
              <div
                className={`w-full max-w-3xl px-4 py-2 rounded-2xl border-2 sm:border-3 flex items-center justify-center gap-3 shadow-md ${
                  theme.isDark
                    ? 'bg-neutral-900/90 border-neutral-700 text-neutral-100'
                    : 'bg-white/95 border-neutral-950 text-neutral-950'
                }`}
              >
                <span className="text-xs sm:text-sm font-black bg-neutral-950 text-amber-300 px-2.5 py-0.5 rounded-full flex-shrink-0">
                  お題 #{state.selectedTopicNumber}
                </span>
                {hasImage && selectedTopic?.imageUrl && (
                  <img
                    src={selectedTopic.imageUrl}
                    alt=""
                    className="w-8 h-8 rounded border border-neutral-950 object-cover flex-shrink-0"
                  />
                )}
                <span className="text-sm sm:text-base font-black truncate max-w-xl text-left">
                  {rawTopicText.replace(/\(k\)/g, ' ')}
                </span>
              </div>
            )}

            {/* Central QR Code Card */}
            <div
              className={`w-full max-w-md sm:max-w-lg p-5 sm:p-6 rounded-3xl border-3 sm:border-4 shadow-[8px_8px_0px_#0a0a0a] flex flex-col items-center text-center transition-all animate-in zoom-in-95 duration-200 ${
                theme.isDark
                  ? 'bg-neutral-900 border-neutral-600 text-white'
                  : 'bg-white border-neutral-950 text-neutral-950'
              }`}
            >
              {/* Header Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500 text-white font-black text-xs sm:text-sm shadow-xs mb-2">
                <Vote className="w-4 h-4" />
                <span>観覧者スマートフォン投票</span>
              </div>

              <h2 className="text-lg sm:text-2xl font-black tracking-tight leading-tight">
                スマホでQRを読み取って投票！
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 font-bold mt-1">
                カメラでQRコードを読み取り、ニックネームを入力して待機してください。
              </p>

              {/* QR Code Image Container */}
              <div className="my-3 p-3 bg-white rounded-2xl border-3 border-neutral-950 shadow-md flex items-center justify-center">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="投票用QRコード"
                    className="w-44 h-44 sm:w-56 sm:h-56 object-contain"
                  />
                ) : (
                  <div className="w-44 h-44 sm:w-56 sm:h-56 flex items-center justify-center text-neutral-400 font-bold text-xs">
                    QRコード生成中...
                  </div>
                )}
              </div>

              {/* Status Pill */}
              <div className="mt-1">
                {state.audienceVoting.isVotingActive ? (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-600 text-white font-black text-xs sm:text-sm shadow-md animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                    <span>🔥 投票受付中！各自のスマホから投票してください</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-300 text-neutral-950 border-2 border-neutral-950 font-black text-xs sm:text-sm shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-950 animate-pulse" />
                    <span>⏳ 参加者待機中（主催者の投票開始をお待ちください）</span>
                  </div>
                )}
              </div>

              {/* Live registered audience counter */}
              <div className="flex items-center gap-3 mt-3 text-xs font-bold text-neutral-600 dark:text-neutral-400">
                <span className="bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full border border-neutral-300 dark:border-neutral-700">
                  参加登録済み: <strong className="text-neutral-950 dark:text-white font-black">{(state.audienceVoters || []).length}</strong> 名
                </span>
                {Object.keys(state.audienceVotes || {}).length > 0 && (
                  <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-700">
                    投票済み: <strong className="font-black">{(state.audienceVoters || []).filter(v => v.hasVoted).length}</strong> 名
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : state.isTopicVisible ? (
          <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center h-full">
            {/* Topic label / number badge */}
            <div
              className={`mb-1.5 sm:mb-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-full shadow-md border-2 flex-shrink-0 ${
                theme.isDark
                  ? 'bg-neutral-800 text-amber-400 border-neutral-700'
                  : 'bg-neutral-950 text-[#FEF9C3] border-neutral-950'
              }`}
            >
              <span className="text-xs sm:text-sm font-black tracking-widest uppercase">
                お題
              </span>
              <span className="text-sm sm:text-base font-black">
                #{state.selectedTopicNumber}
              </span>
            </div>

            {/* If Photo Topic (写真で一言): Display image on top */}
            {hasImage && (
              <div className="my-1 max-w-full flex items-center justify-center flex-shrink min-h-0">
                <img
                  src={selectedTopic.imageUrl}
                  alt={`お題 ${state.selectedTopicNumber}`}
                  className={`w-auto max-w-[92vw] md:max-w-4xl object-contain rounded-2xl border-4 shadow-2xl ${
                    theme.isDark
                      ? 'border-neutral-600 bg-neutral-900'
                      : 'border-neutral-950 bg-white'
                  } ${getImageMaxHeightClass()}`}
                />
              </div>
            )}

            {/* Topic Text: beneath image if photo topic, or primary if text topic */}
            {hasText && (
              <div
                id="monitor-topic-container"
                className={`tracking-tight transition-all duration-200 max-w-full break-words whitespace-pre-wrap flex-shrink-0 ${
                  isBold ? 'font-black' : 'font-normal'
                } ${
                  theme.textColorClass
                } ${
                  hasImage
                    ? `${photoFontSizeClass} ${photoLineHeightClass} mt-1 sm:mt-2`
                    : `${fontSizeClass} ${lineHeightClass}`
                }`}
                style={{
                  fontFamily: currentFontFamily,
                  textShadow: theme.isDark
                    ? '0 2px 4px rgba(0,0,0,0.8)'
                    : '0 1px 2px rgba(0,0,0,0.05)',
                  wordBreak: 'break-word',
                }}
              >
                {lines.map((line, idx) => (
                  <React.Fragment key={idx}>
                    <span className="inline-block">{line}</span>
                    {idx < lines.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Empty state: neither image nor text */}
            {!hasImage && !hasText && (
              <span
                className={`italic text-xl sm:text-2xl ${
                  theme.isDark ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              >
                （お題が設定されていません）
              </span>
            )}
          </div>
        ) : (
          /* When isTopicVisible is OFF: now loading... */
          <div className="flex flex-col items-center justify-center space-y-3">
            <div
              className={`text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-widest lowercase font-mono ${theme.textColorClass}`}
            >
              now loading...
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full animate-bounce [animation-delay:-0.3s] ${
                  theme.isDark ? 'bg-white' : 'bg-neutral-950'
                }`}
              />
              <span
                className={`w-3 h-3 rounded-full animate-bounce [animation-delay:-0.15s] ${
                  theme.isDark ? 'bg-white' : 'bg-neutral-950'
                }`}
              />
              <span
                className={`w-3 h-3 rounded-full animate-bounce ${
                  theme.isDark ? 'bg-white' : 'bg-neutral-950'
                }`}
              />
            </div>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* BOTTOM SECTION: 参加者表示 ＆ 得点表示 */}
      {/* 最大7名で横1列、8名〜14名で2列（縦幅を半分にした簡易モード） */}
      {/* ======================================================== */}
      {(state.isParticipantsVisible || ceremonyActive) && (
        <section
          className={`w-full max-w-7xl mx-auto pt-8 sm:pt-10 pb-2 border-t-4 flex-shrink-0 z-30 overflow-visible ${theme.dividerClass}`}
        >
          {orderedParticipants.length === 0 ? (
            <div
              className={`text-center font-bold py-2 text-xs sm:text-sm ${
                theme.isDark ? 'text-neutral-400' : 'text-neutral-600'
              }`}
            >
              （現在、参加中として指定されている参加者はいません）
            </div>
          ) : isCompact ? (
            /* 8名〜14名: 2段（各段最大7名）のコンパクトモード */
            <div className="space-y-4 sm:space-y-5 px-1 pt-1 overflow-visible">
              {/* Row 1 (up to 7 participants) */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 md:gap-2.5 flex-nowrap overflow-visible pt-1.5">
                {orderedParticipants.slice(0, 7).map((p, idx) =>
                  renderParticipantCard(p, idx)
                )}
              </div>
              {/* Row 2 (8th to 14th participants) */}
              {orderedParticipants.length > 7 && (
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 md:gap-2.5 flex-nowrap overflow-visible pt-1.5">
                  {orderedParticipants.slice(7, 14).map((p, idx) =>
                    renderParticipantCard(p, idx + 7)
                  )}
                </div>
              )}
            </div>
          ) : (
            /* 7名以下: メインの横1段モード (大きな枠・大迫力のフォント) */
            <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-3.5 px-1 flex-nowrap overflow-visible pt-1.5">
              {orderedParticipants.map((p, idx) => renderParticipantCard(p, idx))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
