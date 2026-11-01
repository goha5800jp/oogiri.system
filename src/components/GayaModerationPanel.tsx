import React, { useEffect, useState } from 'react';
import { GayaSubmission } from '../types/ogiri';
import {
  subscribeToGayaSubmissions,
  approveGayaComment,
  deleteGayaSubmission,
  clearAllGayaSubmissions,
} from '../services/gayaService';
import {
  MessageSquare,
  CheckCircle,
  Trash2,
  Send,
  User,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';

interface GayaModerationPanelProps {
  isGayaModeEnabled?: boolean;
  showToast?: (msg: string) => void;
}

export const GayaModerationPanel: React.FC<GayaModerationPanelProps> = ({
  isGayaModeEnabled = false,
  showToast,
}) => {
  const [submissions, setSubmissions] = useState<GayaSubmission[]>([]);

  useEffect(() => {
    if (!isGayaModeEnabled) return;
    const unsub = subscribeToGayaSubmissions((items) => {
      setSubmissions(items);
    });
    return () => unsub();
  }, [isGayaModeEnabled]);

  if (!isGayaModeEnabled) {
    return null;
  }

  const handleApprove = async (sub: GayaSubmission) => {
    try {
      await approveGayaComment(sub);
      showToast?.(`「${sub.text}」の表示を許可しました（モニターに流れます）`);
    } catch (err) {
      console.warn('Approve comment error:', err);
    }
  };

  const handleDelete = async (subId: string) => {
    try {
      await deleteGayaSubmission(subId);
      showToast?.('コメントを削除しました');
    } catch (err) {
      console.warn('Delete comment error:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllGayaSubmissions();
      showToast?.('すべてのガヤ投稿ログをクリアしました');
    } catch (err) {
      console.warn('Clear all error:', err);
    }
  };

  return (
    <div className="pt-2 pb-1 border-t-2 border-neutral-900/30 space-y-2.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-300 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <h4 className="text-sm sm:text-base font-black text-neutral-950 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-red-600" />
            <span>ガヤ管理（投稿コメント承認・審査）</span>
          </h4>
          <span className="text-xs bg-red-100 text-red-950 font-black px-2 py-0.5 rounded border border-red-500">
            {submissions.length} / 30 件
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-neutral-600 hidden md:inline">
            ※ 「表示を許可」したコメントのみモニター画面へ流れます（不適切発言防止）
          </span>
          {submissions.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-black text-neutral-600 hover:text-red-700 bg-white hover:bg-red-50 border border-neutral-300 hover:border-red-400 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>全件クリア</span>
            </button>
          )}
        </div>
      </div>

      {/* Submissions List Container */}
      {submissions.length === 0 ? (
        <div className="p-4 sm:p-5 rounded-xl border-2 border-dashed border-neutral-300 bg-white text-center space-y-1.5">
          <MessageSquare className="w-6 h-6 text-neutral-400 mx-auto" />
          <p className="text-xs sm:text-sm font-black text-neutral-700">
            まだ投稿されたガヤコメントはありません
          </p>
          <p className="text-[11px] font-bold text-neutral-500">
            観覧者が各自のスマートフォンでQRコードを読み込み、テキストを送信するとここに到着します。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1 scrollbar-thin">
          {submissions.map((sub) => {
            const timeStr = new Date(sub.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={sub.id}
                className={`p-2.5 rounded-xl border-2 transition shadow-xs flex flex-col justify-between gap-2 ${
                  sub.approved
                    ? 'bg-neutral-100 border-neutral-300 opacity-75'
                    : 'bg-white border-neutral-950 hover:border-amber-500 hover:shadow-sm'
                }`}
              >
                {/* User & Time header */}
                <div className="flex items-center justify-between gap-1 text-[11px] border-b border-neutral-200 pb-1">
                  <div className="flex items-center gap-1 font-black text-neutral-900 truncate">
                    <User className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                    <span className="truncate">{sub.nickname}</span>
                  </div>
                  <span className="font-mono text-[10px] text-neutral-400 flex-shrink-0">
                    {timeStr}
                  </span>
                </div>

                {/* Submitted Text */}
                <div className="py-1">
                  <p className="text-xs sm:text-sm font-black text-neutral-950 break-words leading-relaxed select-text">
                    {sub.text}
                  </p>
                </div>

                {/* Action Controls */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100">
                  {sub.approved ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-400">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>表示許可済み</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApprove(sub)}
                      className="inline-flex items-center gap-1 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg border border-neutral-950 shadow-xs cursor-pointer transition active:scale-98"
                    >
                      <Send className="w-3 h-3" />
                      <span>表示を許可</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(sub.id)}
                    className="text-neutral-400 hover:text-red-600 p-1 rounded hover:bg-neutral-100 cursor-pointer transition"
                    title="この投稿を削除"
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
};
