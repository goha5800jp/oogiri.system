import React, { useState } from 'react';
import {
  AudienceVotingConfig,
  AudienceVoter,
  Participant,
} from '../types/ogiri';
import { Switch } from './Switch';
import {
  Vote,
  QrCode,
  Play,
  Square,
  Trophy,
  RotateCcw,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Copy,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AudienceVotingControlProps {
  config: AudienceVotingConfig;
  votes: Record<number, number>;
  voters: AudienceVoter[];
  participants: Participant[];
  onUpdateConfig: (updater: (prev: AudienceVotingConfig) => AudienceVotingConfig) => void;
  onResetVotes: () => void;
  isResultAnnouncementActive: boolean;
  onToggleResultAnnouncement: () => void;
  isScoringModeEnabled: boolean;
  onRequestOpenConfirm: (title: string, message: string, onConfirm: () => void) => void;
  showToast: (msg: string) => void;
}

export const AudienceVotingControl: React.FC<AudienceVotingControlProps> = ({
  config,
  votes,
  voters,
  participants,
  onUpdateConfig,
  onResetVotes,
  isResultAnnouncementActive,
  onToggleResultAnnouncement,
  isScoringModeEnabled,
  onRequestOpenConfirm,
  showToast,
}) => {
  const [isVoterListExpanded, setIsVoterListExpanded] = useState(false);

  const voteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?mode=vote`
    : '';

  const handleCopyUrl = () => {
    if (!voteUrl) return;
    navigator.clipboard
      .writeText(voteUrl)
      .then(() => showToast('投票用URLをクリップボードにコピーしました！'))
      .catch(() => showToast('コピーに失敗しました'));
  };

  const handleOpenVoteTab = () => {
    window.open(voteUrl, '_blank');
  };

  const votedVotersCount = voters.filter((v) => v.hasVoted).length;
  const waitingVotersCount = Math.max(0, voters.length - votedVotersCount);
  const totalVotesCast = Object.values(votes).reduce((sum, n) => sum + n, 0);

  // Calculate sorted rankings based on votes
  const sortedParticipants = [...participants].sort((a, b) => {
    const vA = votes[a.id] || 0;
    const vB = votes[b.id] || 0;
    return vB - vA;
  });

  const maxVoteCount = Math.max(1, ...Object.values(votes));

  return (
    <section className="bg-white rounded-2xl border-2 border-neutral-950 p-4 sm:p-5 shadow-md space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-neutral-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black bg-rose-500 text-white px-2 py-0.5 rounded border border-neutral-900 flex items-center gap-1 shadow-2xs">
              <Vote className="w-3.5 h-3.5" />
              <span>観覧者スマートフォン投票</span>
            </span>
            <span className="text-base sm:text-lg font-black text-neutral-950">
              観覧者投票・投票状況
            </span>
          </div>
          <p className="text-xs text-neutral-600 font-bold mt-1">
            観覧者がスマートフォンからQRコードを読み取り、誰が面白かったかをリアルタイムに投票できます。
          </p>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {config.isVotingActive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-400 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <span>投票受付中！</span>
            </span>
          ) : config.isQrVisible ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>QR表示中（参加者待機）</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 border border-neutral-300">
              <span>停止中</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Switch Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Switch 1: 投票画面のQRを表示 */}
        <div
          className={`p-3 rounded-xl border-2 flex items-center justify-between transition-colors ${
            config.isQrVisible
              ? 'bg-amber-50 border-amber-500 shadow-xs'
              : 'bg-neutral-50 border-neutral-300'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 mr-2">
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                config.isQrVisible
                  ? 'bg-amber-300 border-neutral-950 text-neutral-950'
                  : 'bg-neutral-200 border-neutral-400 text-neutral-600'
              }`}
            >
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-neutral-950 block truncate">
                投票画面のQRを表示
              </span>
              <span className="text-[10px] text-neutral-500 font-bold block truncate">
                モニター中央にQRを表示
              </span>
            </div>
          </div>
          <Switch
            checked={!!config.isQrVisible}
            onChange={(checked) =>
              onUpdateConfig((prev) => ({ ...prev, isQrVisible: checked }))
            }
            onLabel="ON"
            offLabel="OFF"
            ariaLabel="投票画面のQRを表示"
          />
        </div>

        {/* Switch 2: 投票を開始する */}
        <div
          className={`p-3 rounded-xl border-2 flex items-center justify-between transition-colors ${
            config.isVotingActive
              ? 'bg-rose-50 border-rose-500 shadow-xs'
              : 'bg-neutral-50 border-neutral-300'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 mr-2">
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                config.isVotingActive
                  ? 'bg-rose-500 border-neutral-950 text-white animate-pulse'
                  : 'bg-neutral-200 border-neutral-400 text-neutral-600'
              }`}
            >
              <Play className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-neutral-950 block truncate">
                投票を開始する
              </span>
              <span className="text-[10px] text-neutral-500 font-bold block truncate">
                {config.isVotingActive ? '受付中（OFFで締切）' : '待機中（ONで受付開始）'}
              </span>
            </div>
          </div>
          <Switch
            checked={!!config.isVotingActive}
            onChange={(checked) => {
              onUpdateConfig((prev) => ({ ...prev, isVotingActive: checked }));
              showToast(
                checked
                  ? '投票の受付を開始しました！スマホ画面で投票可能になりました'
                  : '投票の受付を締め切りました'
              );
            }}
            onLabel="受付中"
            offLabel="締切"
            ariaLabel="投票を開始する"
          />
        </div>

        {/* Action Button: 結果を発表する */}
        <div className="p-3 bg-neutral-50 rounded-xl border-2 border-neutral-300 flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 min-w-0 mr-2">
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                isResultAnnouncementActive
                  ? 'bg-amber-400 border-neutral-950 text-neutral-950'
                  : 'bg-neutral-200 border-neutral-400 text-neutral-600'
              }`}
            >
              <Trophy className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-neutral-950 block truncate">
                投票結果を発表する
              </span>
              <span className="text-[10px] text-neutral-500 font-bold block truncate">
                モニターでドラムロール演出
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleResultAnnouncement}
            className={`px-3 py-1.5 rounded-lg border-2 border-neutral-950 font-black text-xs transition cursor-pointer flex-shrink-0 ${
              isResultAnnouncementActive
                ? 'bg-amber-400 hover:bg-amber-500 text-neutral-950 ring-2 ring-amber-400 animate-pulse'
                : 'bg-white hover:bg-neutral-100 text-neutral-900 shadow-xs'
            }`}
          >
            {isResultAnnouncementActive ? '演出中 (リセット)' : '結果発表'}
          </button>
        </div>
      </div>

      {/* Voting Rules & URL helper row */}
      <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-300 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Rules settings */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Max votes per person */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-neutral-900 shadow-2xs">
            <span className="font-black text-neutral-700 text-[11px]">
              1人あたりの票数:
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      maxVotesPerPerson: num,
                    }))
                  }
                  className={`w-6 h-6 rounded text-xs font-black border transition cursor-pointer ${
                    (config.maxVotesPerPerson || 1) === num
                      ? 'bg-neutral-950 text-amber-300 border-neutral-950'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <span className="text-[11px] font-bold text-neutral-600">票</span>
          </div>

          {/* Multiple votes per participant */}
          <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-neutral-900 shadow-2xs">
            <span className="font-black text-neutral-700 text-[11px]">
              同じ人への重複投票:
            </span>
            <Switch
              size="sm"
              checked={!!config.allowMultipleVotesPerParticipant}
              onChange={(checked) =>
                onUpdateConfig((prev) => ({
                  ...prev,
                  allowMultipleVotesPerParticipant: checked,
                }))
              }
              onLabel="許可"
              offLabel="不可"
              ariaLabel="同じ人への重複投票許可"
            />
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={() =>
              onRequestOpenConfirm(
                '投票データのリセット',
                '今回の投票データ（集計票数および待機中の観覧者リスト）をリセットしますか？',
                onResetVotes
              )
            }
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 font-black text-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>投票リセット</span>
          </button>
        </div>

        {/* Direct link & copy button for operators */}
        <div className="flex items-center gap-1.5 self-end md:self-auto">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-neutral-100 border border-neutral-400 font-bold text-neutral-800 cursor-pointer shadow-2xs"
            title="投票用URLをコピー"
          >
            <Copy className="w-3.5 h-3.5 text-neutral-600" />
            <span>URLコピー</span>
          </button>

          <button
            type="button"
            onClick={handleOpenVoteTab}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-amber-300 font-black text-xs cursor-pointer shadow-2xs"
            title="テスト用：別タブで投票画面を開く"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>投票画面を開く</span>
          </button>
        </div>
      </div>

      {/* Realtime Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-300 text-center">
          <span className="text-[10px] text-neutral-500 font-bold block">
            参加登録者（待機）
          </span>
          <span className="text-xl sm:text-2xl font-black text-neutral-900">
            {voters.length}{' '}
            <span className="text-xs font-normal text-neutral-600">名</span>
          </span>
        </div>

        <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-300 text-center">
          <span className="text-[10px] text-emerald-700 font-bold block">
            投票送信済み
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-900">
            {votedVotersCount}{' '}
            <span className="text-xs font-normal text-emerald-700">名</span>
          </span>
        </div>

        <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-300 text-center">
          <span className="text-[10px] text-amber-700 font-bold block">
            未投票（考慮中）
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-900">
            {waitingVotersCount}{' '}
            <span className="text-xs font-normal text-amber-700">名</span>
          </span>
        </div>

        <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-300 text-center">
          <span className="text-[10px] text-rose-700 font-bold block">
            総得票数
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-900">
            {totalVotesCast}{' '}
            <span className="text-xs font-normal text-rose-700">票</span>
          </span>
        </div>
      </div>

      {/* Registered Voters Nickname List Accordion */}
      <div className="border border-neutral-300 rounded-xl overflow-hidden bg-neutral-50/50">
        <button
          type="button"
          onClick={() => setIsVoterListExpanded(!isVoterListExpanded)}
          className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-black text-neutral-800 hover:bg-neutral-100 cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-neutral-600" />
            <span>
              登録済み観覧者一覧 ({voters.length}名)
            </span>
            {voters.length > 0 && (
              <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded font-normal">
                クリックで{isVoterListExpanded ? '閉じる' : '確認'}
              </span>
            )}
          </div>
          {isVoterListExpanded ? (
            <ChevronUp className="w-4 h-4 text-neutral-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-500" />
          )}
        </button>

        {isVoterListExpanded && (
          <div className="p-3 border-t border-neutral-200 bg-white">
            {voters.length === 0 ? (
              <p className="text-xs text-neutral-400 italic text-center py-2">
                まだ参加登録した観覧者はいません。QRコードからスマートフォンで参加登録するとここに表示されます。
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {voters.map((v) => (
                  <div
                    key={v.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${
                      v.hasVoted
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                        : 'bg-amber-50 border-amber-300 text-amber-950'
                    }`}
                  >
                    {v.hasVoted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 animate-pulse" />
                    )}
                    <span>{v.nickname}</span>
                    <span className="text-[10px] font-normal opacity-75">
                      {v.hasVoted ? '(投票済)' : '(待機中)'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Participants Live Vote Tally Bar */}
      {participants.length > 0 && (
        <div className="space-y-2 border-t border-neutral-200 pt-3">
          <div className="flex items-center justify-between text-xs font-black text-neutral-800">
            <span>各回答者の現在の得票数（リアルタイム速報）</span>
            <span className="text-[10px] font-normal text-neutral-500">
              ※ 下の「コントロールパネル」内でも各回答者に「x票」として即時反映されます
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {sortedParticipants.map((p, idx) => {
              const count = votes[p.id] || 0;
              const percent = maxVoteCount > 0 ? (count / maxVoteCount) * 100 : 0;
              const isLeader = count > 0 && count === maxVoteCount;

              return (
                <div
                  key={p.id}
                  className={`p-2 rounded-xl border flex flex-col justify-between transition-colors ${
                    isLeader
                      ? 'bg-amber-50 border-amber-500 shadow-2xs'
                      : 'bg-neutral-50 border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-800 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-neutral-950 truncate">
                        {p.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isLeader && (
                        <span className="text-xs" title="最多得票">
                          👑
                        </span>
                      )}
                      <span className="text-sm font-black text-neutral-950">
                        {count}{' '}
                        <span className="text-[10px] font-bold text-neutral-600">票</span>
                      </span>
                    </div>
                  </div>

                  {/* Tiny progress bar */}
                  <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div
                      style={{ width: `${percent}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        isLeader ? 'bg-amber-500' : 'bg-neutral-600'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
