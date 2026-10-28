import React, { useState, useMemo } from 'react';
import { GameLogItem, Participant } from '../types/ogiri';
import { toCircledNumber } from '../utils/ogiriLogic';
import {
  Database,
  Trophy,
  Calculator,
  Crown,
  Users,
  Copy,
  ChevronRight,
  SlidersHorizontal,
  ScrollText,
  BarChart3,
  Award,
  Sparkles,
  Info,
} from 'lucide-react';

interface RecordsDatabaseViewProps {
  gameLogs: GameLogItem[];
  participants: Participant[];
  theme: {
    textColorClass: string;
    subTextClass: string;
    sectionBgClass: string;
    borderClass: string;
    isDark: boolean;
  };
  onNavigateToLogs: () => void;
  onNavigateToMain: () => void;
  showToast: (msg: string) => void;
}

interface ParticipantStat {
  participant: Participant;
  totalAppearances: number;
  scoringAppearances: number;
  totalScore: number;
  avgScore: number;
  winsCount: number;
  winRate: number;
}

interface TeamStat {
  teamName: string;
  members: Participant[];
  totalAppearances: number;
  totalScore: number;
  avgScore: number;
  winsCount: number;
}

interface RankedItem<T> {
  rank: number;
  item: T;
}

/**
 * Assigns competition ranks with tie handling: 1st, 1st, 3rd...
 */
function assignRanks<T>(
  items: T[],
  getValue: (item: T) => number
): RankedItem<T>[] {
  const result: RankedItem<T>[] = [];
  let currentRank = 1;

  for (let i = 0; i < items.length; i++) {
    if (i > 0 && getValue(items[i]) === getValue(items[i - 1])) {
      result.push({ rank: result[i - 1].rank, item: items[i] });
    } else {
      currentRank = i + 1;
      result.push({ rank: currentRank, item: items[i] });
    }
  }

  return result;
}

export const RecordsDatabaseView: React.FC<RecordsDatabaseViewProps> = ({
  gameLogs,
  participants,
  theme,
  onNavigateToLogs,
  onNavigateToMain,
  showToast,
}) => {
  // Registered participants with non-empty names
  const participantsWithNames = useMemo(() => {
    return participants.filter((p) => p.name && p.name.trim() !== '');
  }, [participants]);

  // Check if any game log has scoring mode enabled
  const hasScoringLogs = useMemo(() => {
    return (gameLogs || []).some((log) => log.isScoringMode);
  }, [gameLogs]);

  // Check if any participant has a non-empty team name
  const hasTeamNames = useMemo(() => {
    return participantsWithNames.some((p) => p.teamName && p.teamName.trim() !== '');
  }, [participantsWithNames]);

  // Compute individual stats for all registered participants
  const participantStats = useMemo<ParticipantStat[]>(() => {
    const logs = gameLogs || [];

    return participantsWithNames.map((p) => {
      let totalAppearances = 0;
      let scoringAppearances = 0;
      let totalScore = 0;
      let winsCount = 0;

      logs.forEach((log) => {
        const found = log.participants.find((lp) => lp.id === p.id);
        if (found) {
          totalAppearances++;

          if (log.isScoringMode) {
            scoringAppearances++;
            totalScore += found.score || 0;

            // Check if 1st place in this match
            // Either recorded rank === 1, or has the highest score in the log
            const maxScoreInLog = Math.max(
              ...log.participants.map((item) => item.score || 0)
            );
            if (found.rank === 1 || (log.participants.length > 0 && found.score === maxScoreInLog)) {
              winsCount++;
            }
          }
        }
      });

      const avgScore = scoringAppearances > 0 ? totalScore / scoringAppearances : 0;
      const winRate = scoringAppearances > 0 ? (winsCount / scoringAppearances) * 100 : 0;

      return {
        participant: p,
        totalAppearances,
        scoringAppearances,
        totalScore,
        avgScore,
        winsCount,
        winRate,
      };
    });
  }, [participantsWithNames, gameLogs]);

  // Group participants by total appearances in descending order
  const appearanceGroups = useMemo(() => {
    const groupsMap = new Map<number, ParticipantStat[]>();

    participantStats.forEach((stat) => {
      const count = stat.totalAppearances;
      const list = groupsMap.get(count) || [];
      list.push(stat);
      groupsMap.set(count, list);
    });

    // Sort counts descending
    const sortedCounts = Array.from(groupsMap.keys()).sort((a, b) => b - a);

    return sortedCounts.map((count) => ({
      count,
      participants: groupsMap.get(count) || [],
    }));
  }, [participantStats]);

  // Rankings
  // 1. Total score ranking
  const totalScoreRanking = useMemo(() => {
    const sorted = [...participantStats].sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.scoringAppearances !== a.scoringAppearances) return b.scoringAppearances - a.scoringAppearances;
      return a.participant.id - b.participant.id;
    });
    return assignRanks(sorted, (item) => item.totalScore);
  }, [participantStats]);

  // 2. Average score ranking (filtered to those with at least 1 appearance)
  const avgScoreRanking = useMemo(() => {
    const withAppearances = participantStats.filter((p) => p.scoringAppearances > 0);
    const sorted = [...withAppearances].sort((a, b) => {
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.participant.id - b.participant.id;
    });
    return assignRanks(sorted, (item) => Math.round(item.avgScore * 10)); // tie at 0.1 decimal
  }, [participantStats]);

  // 3. Wins ranking
  const winsRanking = useMemo(() => {
    const sorted = [...participantStats].sort((a, b) => {
      if (b.winsCount !== a.winsCount) return b.winsCount - a.winsCount;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.participant.id - b.participant.id;
    });
    return assignRanks(sorted, (item) => item.winsCount);
  }, [participantStats]);

  // Team Statistics
  const teamStats = useMemo<TeamStat[]>(() => {
    const teamsMap = new Map<string, Participant[]>();

    participantsWithNames.forEach((p) => {
      const team = p.teamName?.trim();
      if (team) {
        const list = teamsMap.get(team) || [];
        list.push(p);
        teamsMap.set(team, list);
      }
    });

    const logs = gameLogs || [];

    return Array.from(teamsMap.entries()).map(([teamName, members]) => {
      const memberIds = new Set(members.map((m) => m.id));
      let totalAppearances = 0;
      let totalScore = 0;
      let winsCount = 0;

      logs.forEach((log) => {
        if (log.isScoringMode) {
          log.participants.forEach((lp) => {
            if (memberIds.has(lp.id)) {
              totalAppearances++;
              totalScore += lp.score || 0;

              const maxScoreInLog = Math.max(
                ...log.participants.map((item) => item.score || 0)
              );
              if (lp.rank === 1 || (log.participants.length > 0 && lp.score === maxScoreInLog)) {
                winsCount++;
              }
            }
          });
        }
      });

      const avgScore = totalAppearances > 0 ? totalScore / totalAppearances : 0;

      return {
        teamName,
        members,
        totalAppearances,
        totalScore,
        avgScore,
        winsCount,
      };
    });
  }, [participantsWithNames, gameLogs]);

  // Team Rankings
  const teamTotalScoreRanking = useMemo(() => {
    const sorted = [...teamStats].sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.totalAppearances !== a.totalAppearances) return b.totalAppearances - a.totalAppearances;
      return a.teamName.localeCompare(b.teamName);
    });
    return assignRanks(sorted, (item) => item.totalScore);
  }, [teamStats]);

  const teamAvgScoreRanking = useMemo(() => {
    const withAppearances = teamStats.filter((t) => t.totalAppearances > 0);
    const sorted = [...withAppearances].sort((a, b) => {
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.teamName.localeCompare(b.teamName);
    });
    return assignRanks(sorted, (item) => Math.round(item.avgScore * 10));
  }, [teamStats]);

  // Copy comprehensive stats to clipboard
  const handleCopySummaryText = () => {
    let text = `【大喜利会 総合戦績データベース】\n`;
    text += `集計日時: ${new Date().toLocaleString('ja-JP')}\n`;
    text += `蓄積試合数: ${gameLogs?.length || 0} 試合\n\n`;

    text += `■ 出場回数集計\n`;
    appearanceGroups.forEach((g) => {
      const names = g.participants.map((p) => p.participant.name).join('、');
      text += `・出場回数 ${g.count}回 (${g.participants.length}名): ${names || '（なし）'}\n`;
    });

    if (hasScoringLogs) {
      text += `\n■ 個人ランキング：合計得点\n`;
      totalScoreRanking.forEach(({ rank, item }) => {
        text += `${rank}位 ${item.participant.name} ${item.totalScore}点（出場${item.scoringAppearances}回）\n`;
      });

      text += `\n■ 個人ランキング：平均点\n`;
      avgScoreRanking.forEach(({ rank, item }) => {
        text += `${rank}位 ${item.participant.name} ${item.avgScore.toFixed(1)}点（合計${item.totalScore}点 / 出場${item.scoringAppearances}回）\n`;
      });

      text += `\n■ 個人ランキング：勝利回数（1位獲得数）\n`;
      winsRanking.forEach(({ rank, item }) => {
        text += `${rank}位 ${item.participant.name} ${item.winsCount}回（出場${item.scoringAppearances}回 / 勝率${item.winRate.toFixed(1)}%）\n`;
      });
    }

    if (hasScoringLogs && hasTeamNames && teamStats.length > 0) {
      text += `\n■ チームランキング：合計得点\n`;
      teamTotalScoreRanking.forEach(({ rank, item }) => {
        text += `${rank}位 [${item.teamName}] ${item.totalScore}点（合算出場${item.totalAppearances}回 / メンバー: ${item.members.map((m) => m.name).join(', ')}）\n`;
      });

      text += `\n■ チームランキング：平均点\n`;
      teamAvgScoreRanking.forEach(({ rank, item }) => {
        text += `${rank}位 [${item.teamName}] ${item.avgScore.toFixed(1)}点（合計${item.totalScore}点 / 合算出場${item.totalAppearances}回）\n`;
      });
    }

    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast('総合戦績データをクリップボードにコピーしました');
      })
      .catch(() => {
        showToast('コピーに失敗しました');
      });
  };

  // Helper for medal badge
  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-0.5 bg-amber-300 text-neutral-950 font-black text-xs px-2 py-0.5 rounded-full border-2 border-amber-500 shadow-xs">
          👑 1位
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-0.5 bg-slate-200 text-neutral-900 font-black text-xs px-2 py-0.5 rounded-full border-2 border-slate-400">
          🥈 2位
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-0.5 bg-amber-700/20 text-amber-900 dark:text-amber-200 font-black text-xs px-2 py-0.5 rounded-full border-2 border-amber-600/40">
          🥉 3位
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-black text-xs min-w-8 py-0.5 px-1.5 rounded-full border border-neutral-300 dark:border-neutral-700">
        {rank}位
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div
        className={`rounded-xl border-2 p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
          theme.isDark
            ? 'bg-indigo-950/40 border-indigo-800'
            : 'bg-indigo-50 border-indigo-300'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded font-black">
              記録２
            </span>
            <span className="text-xs bg-indigo-200 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 px-2 py-0.5 rounded font-black border border-indigo-400 dark:border-indigo-700">
              P.00 データベース
            </span>
          </div>
          <h2 className={`text-lg sm:text-xl font-black mt-1 flex items-center gap-2 ${theme.textColorClass}`}>
            <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>【データベース】総合記録・戦績集計</span>
          </h2>
          <p className={`text-xs font-bold mt-0.5 ${theme.subTextClass}`}>
            「記録１：試合ログ」の蓄積データをリアルタイム自動集計し、出場回数・個人ランキング・チーム別成績を表示します。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummaryText}
            disabled={!gameLogs || gameLogs.length === 0}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg border-2 border-indigo-800 shadow-xs font-black text-xs cursor-pointer disabled:cursor-not-allowed transition"
            title="集計された全戦績テキストをクリップボードにコピー"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>全集計をコピー</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToLogs}
            className="inline-flex items-center gap-1 bg-white hover:bg-neutral-100 text-neutral-950 px-3 py-1.5 rounded-lg font-black text-xs border-2 border-neutral-950 shadow cursor-pointer transition"
            title="試合ログ（記録１）へ移動"
          >
            <span>試合ログへ</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onNavigateToMain}
            className="inline-flex items-center gap-1 bg-neutral-950 hover:bg-neutral-800 text-amber-300 px-3 py-1.5 rounded-lg font-black text-xs border-2 border-neutral-950 shadow cursor-pointer transition"
            title="メインコンソールへ直接移動"
          >
            <span>メインへ</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white p-3 rounded-xl border-2 border-neutral-950 shadow-xs text-neutral-950 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-neutral-500">蓄積試合数</div>
          <div className="text-xl sm:text-2xl font-black mt-1 text-indigo-700">
            {gameLogs?.length || 0} <span className="text-xs text-neutral-600">試合</span>
          </div>
          <div className="text-[10px] font-bold text-neutral-500">
            うち加点試合: {(gameLogs || []).filter((l) => l.isScoringMode).length} 件
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border-2 border-neutral-950 shadow-xs text-neutral-950 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-neutral-500">登録参加者数</div>
          <div className="text-xl sm:text-2xl font-black mt-1 text-emerald-700">
            {participantsWithNames.length} <span className="text-xs text-neutral-600">名</span>
          </div>
          <div className="text-[10px] font-bold text-neutral-500">
            登録枠: {participants.length} 枠中
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border-2 border-neutral-950 shadow-xs text-neutral-950 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-neutral-500">登録チーム数</div>
          <div className="text-xl sm:text-2xl font-black mt-1 text-purple-700">
            {teamStats.length} <span className="text-xs text-neutral-600">チーム</span>
          </div>
          <div className="text-[10px] font-bold text-neutral-500">
            所属参加者: {participantsWithNames.filter((p) => p.teamName?.trim()).length} 名
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border-2 border-neutral-950 shadow-xs text-neutral-950 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-neutral-500">累計総得点</div>
          <div className="text-xl sm:text-2xl font-black mt-1 text-amber-600">
            {participantStats.reduce((sum, p) => sum + p.totalScore, 0).toLocaleString()}{' '}
            <span className="text-xs text-neutral-600">点</span>
          </div>
          <div className="text-[10px] font-bold text-neutral-500">
            加点試合の総合計
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. 出場回数 欄 */}
      {/* ======================================================== */}
      <section
        className={`rounded-xl border-2 p-4 sm:p-6 shadow-md space-y-4 transition-colors ${theme.sectionBgClass}`}
      >
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 pb-2.5 ${theme.borderClass}`}>
          <div>
            <span className="text-xs bg-sky-100 text-sky-900 border border-sky-400 px-2 py-0.5 rounded font-black">
              参加実績
            </span>
            <h3 className={`text-base sm:text-lg font-black mt-1 flex items-center gap-2 ${theme.textColorClass}`}>
              <Users className="w-5 h-5 text-sky-600" />
              <span>【出場回数】参加者の出場頻度一覧</span>
            </h3>
            <p className={`text-xs font-bold mt-0.5 ${theme.subTextClass}`}>
              サブコンソール１で登録されている参加者全員を、「記録１：試合ログ」の出場回数が多い順にグループ分けして表示しています。
            </p>
          </div>
          <span className="text-xs font-black bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700">
            全 {participantsWithNames.length} 名
          </span>
        </div>

        {participantsWithNames.length === 0 ? (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-900 font-bold flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              サブコンソール１（準備）で参加者の名前を登録すると、ここに出場回数一覧が表示されます。
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {appearanceGroups.map(({ count, participants: groupList }) => (
              <div
                key={count}
                className="bg-white rounded-xl border-2 border-neutral-950 p-3.5 sm:p-4 shadow-xs space-y-3 text-neutral-950"
              >
                {/* Count Header */}
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs sm:text-sm font-black px-3 py-1 rounded-lg border-2 ${
                        count > 0
                          ? 'bg-sky-500 text-white border-sky-700 shadow-2xs'
                          : 'bg-neutral-200 text-neutral-800 border-neutral-400'
                      }`}
                    >
                      出場回数 {count} 回
                    </span>
                    <span className="text-xs font-bold text-neutral-600">
                      （{groupList.length} 名）
                    </span>
                  </div>
                  {gameLogs && gameLogs.length > 0 && (
                    <span className="text-[11px] font-bold text-neutral-500">
                      出場率: {((count / gameLogs.length) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                {/* Participant Chips Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {groupList.map(({ participant: p, scoringAppearances, totalScore, avgScore }) => (
                    <div
                      key={p.id}
                      className="bg-neutral-50 hover:bg-neutral-100/90 rounded-lg border-2 border-neutral-950 p-2.5 flex items-center justify-between gap-2 shadow-2xs transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Avatar */}
                        <div className="w-7 h-7 rounded-full border border-neutral-900 overflow-hidden bg-amber-100 flex-shrink-0 flex items-center justify-center">
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

                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-black text-neutral-950 truncate" title={p.name}>
                              {p.name}
                            </span>
                          </div>
                          {p.teamName ? (
                            <span className="text-[10px] bg-purple-100 text-purple-900 px-1 rounded font-bold border border-purple-300 inline-block truncate max-w-[120px]">
                              {p.teamName}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Mini scoring preview if scoring logs exist */}
                      {hasScoringLogs && scoringAppearances > 0 && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-black text-emerald-700">
                            {totalScore} <span className="text-[9px]">点</span>
                          </div>
                          <div className="text-[10px] font-bold text-neutral-500">
                            平均 {avgScore.toFixed(1)}点
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 2. 個人ランキング 欄 (加点試合が含まれる場合のみ表示) */}
      {/* ======================================================== */}
      {hasScoringLogs && (
        <section
          className={`rounded-xl border-2 p-4 sm:p-6 shadow-md space-y-6 transition-colors ${theme.sectionBgClass}`}
        >
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 pb-2.5 ${theme.borderClass}`}>
            <div>
              <span className="text-xs bg-amber-400 text-neutral-950 border border-neutral-900 px-2 py-0.5 rounded font-black">
                得点・勝率
              </span>
              <h3 className={`text-base sm:text-lg font-black mt-1 flex items-center gap-2 ${theme.textColorClass}`}>
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>【個人ランキング】合計得点・平均点・勝利回数</span>
              </h3>
              <p className={`text-xs font-bold mt-0.5 ${theme.subTextClass}`}>
                加点モードがONの試合ログを集計し、個人ごとの「合計得点」「平均点」「1位獲得勝利数」を出力しています。
              </p>
            </div>
            <span className="text-xs font-bold text-neutral-500 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 px-2 py-1 rounded-lg">
              加点試合: {(gameLogs || []).filter((l) => l.isScoringMode).length} 回
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 2-A: 合計得点 ランキング */}
            <div className="bg-white rounded-xl border-2 border-amber-400 p-4 shadow-sm space-y-3 text-neutral-950 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-600" />
                    <h4 className="font-black text-sm text-neutral-950">
                      合計得点
                    </h4>
                  </div>
                  <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300">
                    累計加点
                  </span>
                </div>

                <div className="divide-y divide-neutral-100 mt-2 space-y-1">
                  {totalScoreRanking.map(({ rank, item }) => (
                    <div
                      key={item.participant.id}
                      className="py-2 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {renderRankBadge(rank)}

                        {/* Avatar */}
                        <div className="w-6 h-6 rounded-full border border-neutral-800 overflow-hidden bg-amber-100 flex-shrink-0 flex items-center justify-center">
                          {item.participant.avatarUrl ? (
                            <img
                              src={item.participant.avatarUrl}
                              alt={item.participant.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[8px] font-black text-neutral-800">
                              #{item.participant.id}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <span
                            className="text-xs font-bold text-neutral-950 truncate block"
                            title={item.participant.name}
                          >
                            {item.participant.name}
                          </span>
                          {item.participant.teamName ? (
                            <span className="text-[9px] text-neutral-500 font-bold block truncate">
                              [{item.participant.teamName}]
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-black text-neutral-950">
                          {item.totalScore.toLocaleString()}{' '}
                          <span className="text-[10px] font-bold">点</span>
                        </div>
                        <div className="text-[10px] font-bold text-neutral-500">
                          （出場 {item.scoringAppearances} 回）
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2-B: 平均点 ランキング */}
            <div className="bg-white rounded-xl border-2 border-emerald-400 p-4 shadow-sm space-y-3 text-neutral-950 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-black text-sm text-neutral-950">
                      平均点
                    </h4>
                  </div>
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-300">
                    1試合あたり
                  </span>
                </div>

                <div className="divide-y divide-neutral-100 mt-2 space-y-1">
                  {avgScoreRanking.length === 0 ? (
                    <div className="text-xs text-neutral-500 py-4 text-center font-bold">
                      出場実績がありません
                    </div>
                  ) : (
                    avgScoreRanking.map(({ rank, item }) => (
                      <div
                        key={item.participant.id}
                        className="py-2 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {renderRankBadge(rank)}

                          {/* Avatar */}
                          <div className="w-6 h-6 rounded-full border border-neutral-800 overflow-hidden bg-emerald-100 flex-shrink-0 flex items-center justify-center">
                            {item.participant.avatarUrl ? (
                              <img
                                src={item.participant.avatarUrl}
                                alt={item.participant.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[8px] font-black text-neutral-800">
                                #{item.participant.id}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <span
                              className="text-xs font-bold text-neutral-950 truncate block"
                              title={item.participant.name}
                            >
                              {item.participant.name}
                            </span>
                            {item.participant.teamName ? (
                              <span className="text-[9px] text-neutral-500 font-bold block truncate">
                                [{item.participant.teamName}]
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-black text-emerald-700">
                            {item.avgScore.toFixed(1)}{' '}
                            <span className="text-[10px] font-bold">点</span>
                          </div>
                          <div className="text-[10px] font-bold text-neutral-500">
                            合計 {item.totalScore}点 / 出場 {item.scoringAppearances}回
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 2-C: 勝利回数 ランキング (1位獲得回数) */}
            <div className="bg-white rounded-xl border-2 border-purple-400 p-4 shadow-sm space-y-3 text-neutral-950 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-purple-600" />
                    <h4 className="font-black text-sm text-neutral-950">
                      勝利回数 (1位獲得)
                    </h4>
                  </div>
                  <span className="text-[10px] font-black bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded border border-purple-300">
                    単独/同率1位
                  </span>
                </div>

                <div className="divide-y divide-neutral-100 mt-2 space-y-1">
                  {winsRanking.map(({ rank, item }) => (
                    <div
                      key={item.participant.id}
                      className="py-2 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {renderRankBadge(rank)}

                        {/* Avatar */}
                        <div className="w-6 h-6 rounded-full border border-neutral-800 overflow-hidden bg-purple-100 flex-shrink-0 flex items-center justify-center">
                          {item.participant.avatarUrl ? (
                            <img
                              src={item.participant.avatarUrl}
                              alt={item.participant.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[8px] font-black text-neutral-800">
                              #{item.participant.id}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <span
                            className="text-xs font-bold text-neutral-950 truncate block"
                            title={item.participant.name}
                          >
                            {item.participant.name}
                          </span>
                          {item.participant.teamName ? (
                            <span className="text-[9px] text-neutral-500 font-bold block truncate">
                              [{item.participant.teamName}]
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-black text-purple-700">
                          {item.winsCount}{' '}
                          <span className="text-[10px] font-bold">回</span>
                        </div>
                        <div className="text-[10px] font-bold text-neutral-500">
                          （出場 {item.scoringAppearances} 回 / 勝率 {item.winRate.toFixed(1)}%）
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 3. チームランキング 欄 (加点試合あり＆チーム名登録ありの場合のみ) */}
      {/* ======================================================== */}
      {hasScoringLogs && hasTeamNames && teamStats.length > 0 && (
        <section
          className={`rounded-xl border-2 p-4 sm:p-6 shadow-md space-y-6 transition-colors ${theme.sectionBgClass}`}
        >
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 pb-2.5 ${theme.borderClass}`}>
            <div>
              <span className="text-xs bg-rose-500 text-white px-2 py-0.5 rounded font-black">
                団体戦
              </span>
              <h3 className={`text-base sm:text-lg font-black mt-1 flex items-center gap-2 ${theme.textColorClass}`}>
                <Users className="w-5 h-5 text-rose-500" />
                <span>【チームランキング】チーム合計得点・チーム平均点</span>
              </h3>
              <p className={`text-xs font-bold mt-0.5 ${theme.subTextClass}`}>
                サブコンソール１で設定されたチームごとに各メンバーの個人成績を合算・平均し、団体成績を出力しています（出場回数はメンバー全員の個人出場回数の合算）。
              </p>
            </div>
            <span className="text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 px-2 py-1 rounded-lg">
              全 {teamStats.length} チーム
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 3-A: 合計得点（チーム） */}
            <div className="bg-white rounded-xl border-2 border-rose-400 p-4 shadow-sm space-y-3 text-neutral-950 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-rose-600" />
                    <h4 className="font-black text-sm text-neutral-950">
                      合計得点（チーム）
                    </h4>
                  </div>
                  <span className="text-[10px] font-black bg-rose-100 text-rose-900 px-1.5 py-0.5 rounded border border-rose-300">
                    メンバー合算
                  </span>
                </div>

                <div className="divide-y divide-neutral-100 mt-2 space-y-2">
                  {teamTotalScoreRanking.map(({ rank, item }) => (
                    <div
                      key={item.teamName}
                      className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          {renderRankBadge(rank)}
                          <span className="text-sm font-black text-neutral-950">
                            {item.teamName}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-[11px] text-neutral-600 font-bold pl-1">
                          <span className="text-neutral-400 text-[10px]">所属:</span>
                          {item.members.map((m) => (
                            <span
                              key={m.id}
                              className="bg-neutral-100 text-neutral-800 px-1.5 py-0.2 rounded border border-neutral-300 text-[10px]"
                            >
                              {m.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-right sm:text-right flex-shrink-0 pl-1 sm:pl-0">
                        <div className="text-base font-black text-rose-700">
                          {item.totalScore.toLocaleString()}{' '}
                          <span className="text-xs font-bold text-neutral-950">点</span>
                        </div>
                        <div className="text-xs font-bold text-neutral-500">
                          （合算出場 {item.totalAppearances} 回）
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3-B: 平均点（チーム） */}
            <div className="bg-white rounded-xl border-2 border-indigo-400 p-4 shadow-sm space-y-3 text-neutral-950 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-black text-sm text-neutral-950">
                      平均点（チーム）
                    </h4>
                  </div>
                  <span className="text-[10px] font-black bg-indigo-100 text-indigo-900 px-1.5 py-0.5 rounded border border-indigo-300">
                    1出場あたり平均
                  </span>
                </div>

                <div className="divide-y divide-neutral-100 mt-2 space-y-2">
                  {teamAvgScoreRanking.length === 0 ? (
                    <div className="text-xs text-neutral-500 py-4 text-center font-bold">
                      出場実績がありません
                    </div>
                  ) : (
                    teamAvgScoreRanking.map(({ rank, item }) => (
                      <div
                        key={item.teamName}
                        className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            {renderRankBadge(rank)}
                            <span className="text-sm font-black text-neutral-950">
                              {item.teamName}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 text-[11px] text-neutral-600 font-bold pl-1">
                            <span className="text-neutral-400 text-[10px]">所属:</span>
                            {item.members.map((m) => (
                              <span
                                key={m.id}
                                className="bg-neutral-100 text-neutral-800 px-1.5 py-0.2 rounded border border-neutral-300 text-[10px]"
                              >
                                {m.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="text-right sm:text-right flex-shrink-0 pl-1 sm:pl-0">
                          <div className="text-base font-black text-indigo-700">
                            {item.avgScore.toFixed(1)}{' '}
                            <span className="text-xs font-bold text-neutral-950">点</span>
                          </div>
                          <div className="text-xs font-bold text-neutral-500">
                            合計 {item.totalScore}点 / 合算出場 {item.totalAppearances}回
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Database Bottom Navigation */}
      <div className="pt-4 pb-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onNavigateToLogs}
          className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 rounded-xl font-black text-sm cursor-pointer shadow-lg border-2 border-emerald-900 transition hover:scale-102"
        >
          <span>記録１：試合ログ へ進む</span>
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onNavigateToMain}
          className="inline-flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-amber-300 px-6 py-3 rounded-xl font-black text-sm cursor-pointer shadow-lg border-2 border-neutral-950 transition hover:scale-102"
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span>メインコンソール（本番進行）へ移動</span>
        </button>
      </div>
    </div>
  );
};
