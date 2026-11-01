import React, { useEffect, useRef, useState } from 'react';
import {
  subscribeToVotingSession,
  VotingSessionData,
} from '../services/audienceVotingService';
import {
  submitGayaComment,
  sendInstantReaction,
} from '../services/gayaService';
import {
  MessageSquare,
  Send,
  User,
  CheckCircle,
  Zap,
  AlertTriangle,
} from 'lucide-react';

const GAYA_NICKNAME_KEY = 'flip_ogiri_gaya_nickname';
const GAYA_VOTER_ID_KEY = 'flip_ogiri_gaya_voter_id';
const GAYA_CREDITS_KEY = 'flip_ogiri_gaya_credits';
const MAX_CREDITS = 6;
const RECOVERY_INTERVAL_MS = 10000; // 10秒ごとに1回復

export const AudienceGayaView: React.FC = () => {
  const [session, setSession] = useState<VotingSessionData | null>(null);

  // Voter ID
  const [voterId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(GAYA_VOTER_ID_KEY);
      if (stored) return stored;
      const newId = 'gaya_user_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem(GAYA_VOTER_ID_KEY, newId);
      return newId;
    } catch {
      return 'gaya_user_' + Math.random().toString(36).substring(2, 10);
    }
  });

  // Nickname state
  const [nickname, setNickname] = useState<string>(() => {
    try {
      return localStorage.getItem(GAYA_NICKNAME_KEY) || '';
    } catch {
      return '';
    }
  });
  const [isEntered, setIsEntered] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(GAYA_NICKNAME_KEY);
    } catch {
      return false;
    }
  });

  // Credits state: initial 6 credits, max 6
  const [credits, setCredits] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(GAYA_CREDITS_KEY);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= MAX_CREDITS) {
          return parsed;
        }
      }
      return MAX_CREDITS;
    } catch {
      return MAX_CREDITS;
    }
  });

  // Track next recovery timestamp
  const nextRecoveryTimeRef = useRef<number | null>(null);

  // Save credits to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(GAYA_CREDITS_KEY, credits.toString());
    } catch {}
  }, [credits]);

  // Credit recovery: 1 credit every 10 seconds after consumption, up to 6
  useEffect(() => {
    if (credits >= MAX_CREDITS) {
      nextRecoveryTimeRef.current = null;
      return;
    }

    if (nextRecoveryTimeRef.current === null) {
      nextRecoveryTimeRef.current = Date.now() + RECOVERY_INTERVAL_MS;
    }

    const interval = setInterval(() => {
      if (credits >= MAX_CREDITS) {
        nextRecoveryTimeRef.current = null;
        return;
      }

      if (nextRecoveryTimeRef.current && Date.now() >= nextRecoveryTimeRef.current) {
        setCredits((prev) => {
          const next = Math.min(MAX_CREDITS, prev + 1);
          if (next < MAX_CREDITS) {
            nextRecoveryTimeRef.current = Date.now() + RECOVERY_INTERVAL_MS;
          } else {
            nextRecoveryTimeRef.current = null;
          }
          return next;
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [credits]);

  // Comment input
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [recentSent, setRecentSent] = useState<string[]>([]);
  const [activeReactionAnim, setActiveReactionAnim] = useState<string | null>(null);

  // Subscribe to real-time session for live topic and active state
  useEffect(() => {
    const unsub = subscribeToVotingSession((data) => {
      setSession(data);
    });
    return () => unsub();
  }, []);

  const handleEnter = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nickname.trim();
    if (!clean) return;
    try {
      localStorage.setItem(GAYA_NICKNAME_KEY, clean);
      // Fresh 6 credits upon entrance
      localStorage.setItem(GAYA_CREDITS_KEY, '6');
    } catch {}
    setCredits(MAX_CREDITS);
    nextRecoveryTimeRef.current = null;
    setIsEntered(true);
  };

  // Whether Gaya Mode is currently ON in console
  const isGayaActive = session?.isGayaModeActive ?? false;

  const handleSendReaction = async (
    btnLabel: string,
    streamText: string,
    isTengu = false
  ) => {
    if (!isGayaActive) return;
    if (credits < 1) {
      setToastMessage('クレジットが足りません（10秒ごとに回復します）');
      setTimeout(() => setToastMessage(null), 2000);
      return;
    }

    // Deduct 1 credit
    setCredits((prev) => {
      const next = Math.max(0, prev - 1);
      if (nextRecoveryTimeRef.current === null) {
        nextRecoveryTimeRef.current = Date.now() + RECOVERY_INTERVAL_MS;
      }
      return next;
    });

    setActiveReactionAnim(btnLabel);
    setTimeout(() => setActiveReactionAnim(null), 300);

    try {
      await sendInstantReaction(streamText, isTengu);
      setToastMessage(`「${streamText}」を送信しました！`);
      setTimeout(() => setToastMessage(null), 1800);
    } catch (err) {
      console.warn('Reaction send error:', err);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGayaActive) return;
    const text = commentText.trim();
    if (!text || isSending) return;

    if (credits < 3) {
      setToastMessage('コメント送信には📣3個が必要です');
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }

    // Deduct 3 credits
    setCredits((prev) => {
      const next = Math.max(0, prev - 3);
      if (nextRecoveryTimeRef.current === null) {
        nextRecoveryTimeRef.current = Date.now() + RECOVERY_INTERVAL_MS;
      }
      return next;
    });

    setIsSending(true);
    try {
      await submitGayaComment(nickname, text, voterId);
      setCommentText('');
      setRecentSent((prev) => [text, ...prev].slice(0, 5));
      setToastMessage('送信しました！運営の許可後にモニターへ流れます');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.warn('Comment send error:', err);
    } finally {
      setIsSending(false);
    }
  };

  // If not entered yet, show Nickname input modal/screen
  if (!isEntered) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-100 via-amber-50 to-yellow-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 border-3 border-neutral-950 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-amber-300 border-2 border-neutral-950 mx-auto flex items-center justify-center text-3xl shadow-md">
            📢
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-neutral-950 tracking-tight">
              ガヤ席へようこそ！
            </h1>
            <p className="text-xs font-bold text-neutral-600 mt-1">
              モニターにお祝い・リアクション・感想コメントを飛ばして盛り上げよう！
            </p>
          </div>

          <form onSubmit={handleEnter} className="space-y-4 text-left">
            <div>
              <label
                htmlFor="nickname-input"
                className="block text-xs font-black text-neutral-800 mb-1"
              >
                あなたのニックネーム:
              </label>
              <div className="relative">
                <input
                  id="nickname-input"
                  type="text"
                  maxLength={15}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="例: たろう / お笑いファン"
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-neutral-950 bg-neutral-50 text-neutral-950 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
                />
                <User className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={!nickname.trim()}
              className="w-full py-3 px-4 rounded-xl font-black text-sm bg-amber-400 hover:bg-amber-500 active:bg-amber-600 disabled:opacity-40 text-neutral-950 border-2 border-neutral-950 shadow-md cursor-pointer transition active:scale-98 disabled:cursor-not-allowed"
            >
              入場する
            </button>
          </form>

          <p className="text-[11px] font-bold text-neutral-500 leading-relaxed">
            ※ 自由なテキスト投稿は不適切な表現防止のため、運営が「表示を許可」したものがモニターへ流れます。
          </p>
        </div>
      </div>
    );
  }

  // Active topic logic
  const topicText = session?.topicText?.trim() || '';
  const isTopicReady = !!topicText;

  return (
    <div className="min-h-screen bg-[#FFFBEB] text-neutral-950 font-bold flex flex-col justify-between selection:bg-amber-200">
      {/* Header */}
      <header className="bg-white border-b-2 border-neutral-950 px-4 py-2.5 shadow-xs flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full border border-neutral-900 ${
              isGayaActive
                ? 'bg-amber-400 animate-pulse'
                : 'bg-neutral-400'
            }`}
          />
          <h1 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5">
            <span>フリップ大喜利 ガヤ席</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded border border-neutral-900 font-mono ${
                isGayaActive
                  ? 'bg-amber-200 text-neutral-950'
                  : 'bg-neutral-300 text-neutral-600'
              }`}
            >
              {isGayaActive ? 'LIVE' : 'STANDBY'}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-black bg-neutral-100 px-2.5 py-1 rounded-full border border-neutral-900">
            <User className="w-3.5 h-3.5 text-neutral-600" />
            <span className="max-w-[90px] truncate">{nickname}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem(GAYA_NICKNAME_KEY);
              } catch {}
              setIsEntered(false);
            }}
            className="text-[10px] text-neutral-500 hover:text-neutral-900 underline font-bold"
          >
            変更
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-5 flex flex-col justify-center space-y-4">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="bg-neutral-950 text-white px-4 py-2 rounded-xl border border-neutral-800 shadow-xl text-xs sm:text-sm font-black flex items-center gap-2 justify-center animate-in fade-in slide-in-from-top-2 duration-150">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Gaya Mode OFF Banner */}
        {!isGayaActive && (
          <div className="bg-neutral-900 text-amber-300 border-2 border-neutral-950 p-3 rounded-2xl shadow-md flex items-center gap-2.5 animate-in fade-in duration-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="text-xs font-black leading-snug">
              現在、メインコンソール側でガヤモードが停止中です。
              <span className="block text-[11px] font-bold text-neutral-300 mt-0.5">
                ガヤモードが再開されると自動的にボタンや入力が使用可能になります。
              </span>
            </div>
          </div>
        )}

        {/* Center: Topic Box */}
        <div className="w-full bg-white rounded-3xl border-3 border-neutral-950 p-5 sm:p-6 shadow-lg text-center flex flex-col items-center justify-center min-h-[160px] sm:min-h-[190px] relative overflow-hidden">
          <div className="absolute top-2.5 left-3.5 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[11px] font-black text-neutral-500">現在のお題</span>
          </div>

          {isTopicReady ? (
            <div className="w-full my-auto py-2">
              <p className="text-lg sm:text-2xl font-black text-neutral-950 leading-relaxed whitespace-pre-wrap break-words">
                {topicText}
              </p>
            </div>
          ) : (
            <div className="w-full my-auto py-6 space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-400 text-xs font-black animate-pulse">
                now loading...
              </span>
              <p className="text-xl sm:text-2xl font-black text-neutral-400">
                準備中
              </p>
              <p className="text-[11px] text-neutral-400 font-bold">
                モニターにお題が表示されるとここに同期表示されます
              </p>
            </div>
          )}
        </div>

        {/* Reaction Buttons & Input Area (Dimmed and disabled when Gaya mode is OFF) */}
        <div
          className={`space-y-4 transition-all duration-300 ${
            !isGayaActive
              ? 'opacity-40 grayscale pointer-events-none select-none'
              : ''
          }`}
        >
          {/* Reaction Buttons Heading & Megaphone Credit Display */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-neutral-800 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>ワンタップ即時リアクション</span>
              </span>
              {/* Credit Megaphones (数字ではなく📣を並べて表示) */}
              <div
                className="flex items-center gap-0.5 ml-1"
                title="残りクレジット（10秒ごとに1個回復・最大6個）"
              >
                {Array.from({ length: credits }).map((_, i) => (
                  <span
                    key={i}
                    className="text-sm sm:text-base inline-block transform hover:scale-125 transition-transform"
                  >
                    📣
                  </span>
                ))}
                {credits === 0 && (
                  <span className="text-[10px] font-bold text-neutral-400 italic">
                    （回復待ち…）
                  </span>
                )}
              </div>
            </div>

            <span className="text-[10px] text-neutral-500 font-bold hidden sm:inline">
              ※ 押すとモニター画面に即時流れます
            </span>
          </div>

          {/* 3 Reaction Buttons: 「😂」「👏」「👺」 */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {/* 1. 😂 -> ｗｗｗ (消費1) */}
            <button
              type="button"
              disabled={!isGayaActive || credits < 1}
              onClick={() => handleSendReaction('😂', 'ｗｗｗ')}
              className={`flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border-2 sm:border-3 border-neutral-950 bg-white hover:bg-amber-50 active:bg-amber-100 shadow-sm hover:shadow transition cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed ${
                activeReactionAnim === '😂'
                  ? 'scale-90 bg-amber-200 ring-2 ring-amber-400'
                  : ''
              }`}
            >
              <span className="text-3xl sm:text-4xl">😂</span>
              <span className="text-xs font-black text-neutral-700 mt-1">ｗｗｗ</span>
            </button>

            {/* 2. 👏 -> 88888 (消費1) */}
            <button
              type="button"
              disabled={!isGayaActive || credits < 1}
              onClick={() => handleSendReaction('👏', '88888')}
              className={`flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border-2 sm:border-3 border-neutral-950 bg-white hover:bg-amber-50 active:bg-amber-100 shadow-sm hover:shadow transition cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed ${
                activeReactionAnim === '👏'
                  ? 'scale-90 bg-amber-200 ring-2 ring-amber-400'
                  : ''
              }`}
            >
              <span className="text-3xl sm:text-4xl">👏</span>
              <span className="text-xs font-black text-neutral-700 mt-1">88888</span>
            </button>

            {/* 3. 👺 -> 巨大天狗 (消費1) */}
            <button
              type="button"
              disabled={!isGayaActive || credits < 1}
              onClick={() => handleSendReaction('👺', '👺', true)}
              className={`flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border-2 sm:border-3 border-neutral-950 bg-red-50 hover:bg-red-100 active:bg-red-200 shadow-sm hover:shadow transition cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed ${
                activeReactionAnim === '👺'
                  ? 'scale-90 bg-red-300 ring-2 ring-red-400'
                  : ''
              }`}
              title="特大サイズの天狗をモニターに流します！"
            >
              <span className="text-3xl sm:text-4xl">👺</span>
              <span className="text-xs font-black text-red-700 mt-1 font-mono">
                巨大天狗
              </span>
            </button>
          </div>

          {/* Text Submission Box */}
          <div className="bg-white rounded-3xl border-3 border-neutral-950 p-3.5 sm:p-4 shadow-md space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-neutral-800">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-neutral-600" />
                <span>自由コメント投稿（消費: 📣3個）</span>
              </span>
              <span className="text-[10px] text-neutral-400 font-mono font-bold">
                {commentText.length}/50文字
              </span>
            </div>

            <form onSubmit={handleSendComment} className="flex items-center gap-2">
              <input
                type="text"
                maxLength={50}
                disabled={!isGayaActive || credits < 3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  credits < 3
                    ? 'コメント送信には📣3個が必要です（回復待ち）'
                    : '感想やツッコミを入力（例: 天才！、うまい！）'
                }
                className="flex-1 px-3.5 py-2.5 rounded-xl border-2 border-neutral-950 bg-neutral-50 text-neutral-950 font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!isGayaActive || !commentText.trim() || isSending || credits < 3}
                className="py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm bg-neutral-950 hover:bg-neutral-800 active:bg-neutral-900 text-amber-300 border-2 border-neutral-950 shadow cursor-pointer transition active:scale-98 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>送信</span>
              </button>
            </form>

            {recentSent.length > 0 && (
              <div className="pt-1 border-t border-neutral-200">
                <span className="text-[10px] text-neutral-500 font-bold block mb-1">
                  最近送信したコメント:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {recentSent.map((s, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full border border-neutral-300 truncate max-w-[150px]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="text-center py-2.5 text-[11px] text-neutral-500 font-bold">
        フリップ大喜利 ガヤシステム © 2026
      </footer>
    </div>
  );
};
