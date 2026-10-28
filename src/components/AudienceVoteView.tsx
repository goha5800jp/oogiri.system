import React, { useEffect, useState } from 'react';
import {
  subscribeToVotingSession,
  registerVoter,
  submitVotes,
  VotingSessionData,
} from '../services/audienceVotingService';
import {
  Heart,
  Vote,
  UserCheck,
  Clock,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Minus,
  Edit2,
  Tv,
} from 'lucide-react';

const VOTER_ID_KEY = 'flip_ogiri_voter_id';
const VOTER_NICKNAME_KEY = 'flip_ogiri_voter_nickname';
const VOTER_HAS_VOTED_KEY = 'flip_ogiri_has_voted_session';

export const AudienceVoteView: React.FC = () => {
  const [session, setSession] = useState<VotingSessionData | null>(null);
  const [loading, setLoading] = useState(true);

  // Voter identity state
  const [voterId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(VOTER_ID_KEY);
      if (stored) return stored;
      const newId = 'voter_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem(VOTER_ID_KEY, newId);
      return newId;
    } catch {
      return 'voter_' + Math.random().toString(36).substring(2, 10);
    }
  });

  const [nickname, setNickname] = useState<string>(() => {
    try {
      return localStorage.getItem(VOTER_NICKNAME_KEY) || '';
    } catch {
      return '';
    }
  });

  const [isNicknameSubmitted, setIsNicknameSubmitted] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(VOTER_NICKNAME_KEY);
    } catch {
      return false;
    }
  });

  const [isEditingNickname, setIsEditingNickname] = useState(false);

  // Voting ballot state: { [participantId]: votesCount }
  const [allocatedVotes, setAllocatedVotes] = useState<Record<number, number>>({});
  const [hasVoted, setHasVoted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(VOTER_HAS_VOTED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [submittedVotedParticipants, setSubmittedVotedParticipants] = useState<
    Array<{ name: string; count: number }>
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subscribe to real-time session
  useEffect(() => {
    const unsubscribe = subscribeToVotingSession((data) => {
      setSession(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // When nickname was previously saved, automatically re-register on boot
  useEffect(() => {
    if (voterId && nickname.trim() && isNicknameSubmitted) {
      registerVoter(voterId, nickname.trim()).catch(() => {});
    }
  }, [voterId, nickname, isNicknameSubmitted]);

  // Handle Nickname Submission
  const handleRegisterNickname = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nickname.trim();
    if (!clean) {
      setErrorMessage('ニックネームを入力してください');
      return;
    }
    setErrorMessage(null);
    try {
      localStorage.setItem(VOTER_NICKNAME_KEY, clean);
    } catch {}
    setIsNicknameSubmitted(true);
    setIsEditingNickname(false);
    registerVoter(voterId, clean).catch(() => {});
  };

  // Vote calculation helpers
  const maxVotes = session?.maxVotesPerPerson || 1;
  const allowMultiple = !!session?.allowMultipleVotesPerParticipant;
  const totalAllocated = Object.values(allocatedVotes).reduce((sum, n) => sum + n, 0);
  const remainingVotes = Math.max(0, maxVotes - totalAllocated);

  const handleVoteChange = (participantId: number, delta: number) => {
    setAllocatedVotes((prev) => {
      const current = prev[participantId] || 0;
      const next = Math.max(0, current + delta);

      if (!allowMultiple && next > 1) {
        return prev;
      }

      const otherTotal = Object.entries(prev).reduce(
        (sum, [idStr, val]) => (parseInt(idStr, 10) === participantId ? sum : sum + val),
        0
      );

      if (otherTotal + next > maxVotes) {
        return prev;
      }

      if (next === 0) {
        const copy = { ...prev };
        delete copy[participantId];
        return copy;
      }

      return {
        ...prev,
        [participantId]: next,
      };
    });
  };

  // Toggle for single vote mode
  const handleToggleSingleVote = (participantId: number) => {
    if (allowMultiple) {
      handleVoteChange(participantId, 1);
      return;
    }

    setAllocatedVotes((prev) => {
      const current = prev[participantId] || 0;
      if (current > 0) {
        const copy = { ...prev };
        delete copy[participantId];
        return copy;
      }

      if (maxVotes === 1) {
        return { [participantId]: 1 };
      }

      const total = Object.values(prev).reduce((sum, n) => sum + n, 0);
      if (total >= maxVotes) {
        return prev;
      }

      return {
        ...prev,
        [participantId]: 1,
      };
    });
  };

  const activeParticipants: Array<{ id: number; name: string; avatarUrl?: string; teamName?: string }> =
    session?.activeParticipants && session.activeParticipants.length > 0
      ? session.activeParticipants
      : (() => {
          try {
            const stored = localStorage.getItem('flip_ogiri_app_state_v2');
            if (stored) {
              const parsed = JSON.parse(stored);
              const active = (parsed.participants || []).filter(
                (p: any) => p.name?.trim() && p.isParticipating
              );
              if (active.length > 0) return active;
              const named = (parsed.participants || []).filter((p: any) => p.name?.trim());
              if (named.length > 0) return named;
            }
          } catch {}
          return [
            { id: 1, name: '回答者 1' },
            { id: 2, name: '回答者 2' },
            { id: 3, name: '回答者 3' },
            { id: 4, name: '回答者 4' },
          ];
        })();

  const handleSubmitVotes = async () => {
    if (totalAllocated === 0) {
      setErrorMessage('最低1票以上投票してください');
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await submitVotes(voterId, nickname, allocatedVotes);
      setHasVoted(true);
      try {
        localStorage.setItem(VOTER_HAS_VOTED_KEY, 'true');
      } catch {}

      // Store summary
      const summary = (activeParticipants || [])
        .filter((p) => (allocatedVotes[p.id] || 0) > 0)
        .map((p) => ({
          name: p.name,
          count: allocatedVotes[p.id],
        }));
      setSubmittedVotedParticipants(summary);
    } catch (err: any) {
      setErrorMessage('投票の送信に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDE7] text-neutral-900 flex flex-col items-center justify-start p-4 sm:p-6 font-sans antialiased">
      <div className="w-full max-w-md space-y-4">
        {/* Header Branding */}
        <header className="bg-white rounded-2xl border-2 border-neutral-950 p-4 shadow-[4px_4px_0px_#0a0a0a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-300 border-2 border-neutral-950 flex items-center justify-center font-black shadow-xs">
              <Vote className="w-6 h-6 text-neutral-950" />
            </div>
            <div>
              <h1 className="text-base font-black text-neutral-950 leading-tight">
                生大喜利 観覧者投票
              </h1>
              <p className="text-[11px] text-neutral-600 font-bold">
                あなたの1票で面白かった回答者を称えよう！
              </p>
            </div>
          </div>
          <a
            href="?mode=monitor"
            title="モニター画面へ"
            className="p-2 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-neutral-600"
          >
            <Tv className="w-4 h-4" />
          </a>
        </header>

        {/* STEP 1: Nickname Registration */}
        {(!isNicknameSubmitted || isEditingNickname) ? (
          <div className="bg-white rounded-2xl border-2 border-neutral-950 p-5 shadow-[4px_4px_0px_#0a0a0a] space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-300 border-2 border-neutral-950 text-xs font-black flex items-center justify-center">
                1
              </span>
              <h2 className="text-sm sm:text-base font-black text-neutral-950">
                ニックネームを登録
              </h2>
            </div>
            <p className="text-xs text-neutral-600 font-bold leading-relaxed">
              公平な投票を行うため、あなたのニックネームを入力してください（重複投票防止に使用されます）。
            </p>

            <form onSubmit={handleRegisterNickname} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-neutral-800 mb-1">
                  ニックネーム（お名前 / ペンネーム）
                </label>
                <input
                  type="text"
                  maxLength={30}
                  required
                  placeholder="例: たろう / お笑い好き"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-neutral-950 bg-neutral-50 text-neutral-950 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
                />
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl border-2 border-neutral-950 bg-amber-300 hover:bg-amber-400 active:translate-y-0.5 active:shadow-none text-neutral-950 font-black text-sm shadow-[3px_3px_0px_#0a0a0a] transition cursor-pointer flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>参加準備完了（待機する）</span>
              </button>
            </form>
          </div>
        ) : (
          /* Registered User Profile Badge */
          <div className="bg-white rounded-xl border-2 border-neutral-950 px-3.5 py-2 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-neutral-500 font-bold">参加者:</span>
              <span className="text-sm font-black text-neutral-950 truncate max-w-[180px]">
                {nickname}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingNickname(true)}
              className="text-[11px] font-bold text-neutral-600 hover:text-neutral-950 flex items-center gap-1 px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-100"
            >
              <Edit2 className="w-3 h-3" />
              <span>変更</span>
            </button>
          </div>
        )}

        {/* STEP 2: When Already Voted */}
        {isNicknameSubmitted && !isEditingNickname && hasVoted && (
          <div className="bg-white rounded-2xl border-2 border-neutral-950 p-6 shadow-[4px_4px_0px_#0a0a0a] text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-lg font-black text-neutral-950">
                投票を受け付けました！
              </h2>
              <p className="text-xs text-neutral-600 font-bold mt-1">
                ご投票ありがとうございます。結果発表は会場のメインモニターにご注目ください！
              </p>
            </div>

            {submittedVotedParticipants.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-neutral-300 text-left space-y-1.5">
                <span className="text-[11px] font-black text-neutral-600">あなたが投票した回答者:</span>
                <div className="flex flex-wrap gap-1.5">
                  {submittedVotedParticipants.map((v, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-white rounded-lg border border-neutral-950 font-black text-xs text-neutral-900 shadow-2xs"
                    >
                      {v.name} ({v.count}票)
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setHasVoted(false);
                setAllocatedVotes({});
                try {
                  localStorage.removeItem(VOTER_HAS_VOTED_KEY);
                } catch {}
              }}
              className="text-[11px] font-bold text-neutral-500 hover:text-neutral-800 underline inline-block"
            >
              ※ テスト用：もう一度投票する
            </button>
          </div>
        )}

        {/* STEP 3: Waiting for Host to Open Voting */}
        {isNicknameSubmitted && !isEditingNickname && !hasVoted && !session?.isVotingActive && (
          <div className="bg-white rounded-2xl border-2 border-neutral-950 p-6 shadow-[4px_4px_0px_#0a0a0a] text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center text-amber-600 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-black text-neutral-950">
                投票開始をお待ちください
              </h2>
              <p className="text-xs text-neutral-600 font-bold mt-1 leading-relaxed">
                主催者がコンソール画面で「投票を開始する」をONにすると、自動的にこの画面が投票用紙に切り替わります。
              </p>
            </div>

            {session?.topicText && (
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-300 text-left space-y-1">
                <span className="text-[10px] font-black bg-neutral-900 text-white px-2 py-0.5 rounded">
                  現在のお題
                </span>
                <p className="text-xs font-bold text-neutral-900 line-clamp-3">
                  {session.topicText}
                </p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 py-2 rounded-xl border border-emerald-200">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>待機中・準備完了として登録されています</span>
            </div>
          </div>
        )}

        {/* STEP 4: Active Voting Form */}
        {isNicknameSubmitted && !isEditingNickname && !hasVoted && session?.isVotingActive && (
          <div className="bg-white rounded-2xl border-2 border-neutral-950 p-4 sm:p-5 shadow-[4px_4px_0px_#0a0a0a] space-y-4">
            {/* Voting rules and ballot counter */}
            <div className="flex items-center justify-between border-b-2 border-neutral-200 pb-3">
              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                  <span>投票受付中！</span>
                </div>
                <h2 className="text-sm sm:text-base font-black text-neutral-950 mt-1">
                  誰が面白かったですか？
                </h2>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-neutral-500 font-bold block">残り票数</span>
                <span
                  className={`text-lg sm:text-xl font-black ${
                    remainingVotes === 0 ? 'text-neutral-400' : 'text-amber-600'
                  }`}
                >
                  {remainingVotes}{' '}
                  <span className="text-xs text-neutral-700">/ {maxVotes} 票</span>
                </span>
              </div>
            </div>

            {allowMultiple && (
              <p className="text-[11px] text-neutral-600 font-bold bg-amber-50 p-2 rounded-lg border border-amber-200">
                💡 同じ回答者に複数票を投票することも可能です（最大 {maxVotes} 票まで自由に配分できます）。
              </p>
            )}

            {/* Participants voting cards list */}
            {activeParticipants.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-neutral-300 text-xs text-neutral-600 font-bold text-center">
                ※ 現在参加中の回答者が登録されていません。主催者の操作をお待ちください。
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeParticipants.map((p, idx) => {
                  const voteCount = allocatedVotes[p.id] || 0;
                  const isSelected = voteCount > 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => !allowMultiple && handleToggleSingleVote(p.id)}
                      className={`p-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-neutral-950 bg-amber-100/80 shadow-[2px_2px_0px_#0a0a0a]'
                          : 'border-neutral-300 bg-white hover:border-neutral-800'
                      } ${!allowMultiple ? 'cursor-pointer active:scale-[0.99]' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 mr-2">
                        <div className="w-10 h-10 rounded-full border-2 border-neutral-950 bg-amber-200 overflow-hidden flex-shrink-0 flex items-center justify-center font-black text-sm">
                          {p.avatarUrl ? (
                            <img
                              src={p.avatarUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>#{idx + 1}</span>
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          {p.teamName && (
                            <span className="text-[10px] text-neutral-500 font-bold truncate">
                              [{p.teamName}]
                            </span>
                          )}
                          <span className="text-sm font-black text-neutral-950 truncate">
                            {p.name}
                          </span>
                        </div>
                      </div>

                      {/* Vote action: multiple (+/-) or single (radio/check) */}
                      {allowMultiple ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={voteCount <= 0}
                            onClick={() => handleVoteChange(p.id, -1)}
                            className="w-8 h-8 rounded-lg border-2 border-neutral-950 bg-white hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center cursor-pointer font-black"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-black text-sm text-neutral-950">
                            {voteCount}
                          </span>
                          <button
                            type="button"
                            disabled={remainingVotes <= 0}
                            onClick={() => handleVoteChange(p.id, 1)}
                            className="w-8 h-8 rounded-lg border-2 border-neutral-950 bg-amber-300 hover:bg-amber-400 disabled:opacity-30 disabled:hover:bg-amber-300 flex items-center justify-center cursor-pointer font-black"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex-shrink-0">
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                              isSelected
                                ? 'border-neutral-950 bg-amber-400 text-neutral-950 font-black'
                                : 'border-neutral-400 bg-neutral-100'
                            }`}
                          >
                            {isSelected && <CheckCircle className="w-4 h-4 text-neutral-950" />}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="button"
              disabled={submitting || totalAllocated === 0}
              onClick={handleSubmitVotes}
              className="w-full py-3.5 rounded-xl border-2 border-neutral-950 bg-amber-400 hover:bg-amber-500 active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-400 text-neutral-950 font-black text-sm sm:text-base shadow-[3px_3px_0px_#0a0a0a] transition cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>投票を送信中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {totalAllocated > 0 ? `${totalAllocated} 票を送信する` : '投票する回答者を選択してください'}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer info */}
        <footer className="text-center text-[11px] text-neutral-500 font-bold py-2">
          生大喜利会用コンソールシステム 観覧者投票
        </footer>
      </div>
    </div>
  );
};
