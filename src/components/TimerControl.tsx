import React, { useState } from 'react';
import { TimerState } from '../types/ogiri';
import { Switch } from './Switch';
import { formatTimeMMSS, validateTimerInput } from '../utils/ogiriLogic';
import { Play, Pause, RotateCcw, AlertTriangle, Clock } from 'lucide-react';

interface TimerControlProps {
  timer: TimerState;
  onUpdateTimer: (updater: (prev: TimerState) => TimerState) => void;
  mode?: 'full' | 'settings_only' | 'display_only';
}

export const TimerControl: React.FC<TimerControlProps> = ({
  timer,
  onUpdateTimer,
  mode = 'full',
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleTotalMinutesChange = (min: number) => {
    const clampedMin = Math.max(0, Math.min(60, min));
    const check = validateTimerInput(
      clampedMin,
      timer.totalSeconds,
      timer.alertMinutes,
      timer.alertSeconds
    );
    if (!check.valid) {
      setValidationError(check.error || null);
    } else {
      setValidationError(null);
    }

    onUpdateTimer((prev) => {
      const newTotalSec = clampedMin * 60 + prev.totalSeconds;
      return {
        ...prev,
        totalMinutes: clampedMin,
        // If not running, also update remaining
        remainingSeconds: prev.isRunning ? prev.remainingSeconds : newTotalSec,
        targetEndTime: prev.isRunning ? prev.targetEndTime : undefined,
      };
    });
  };

  const handleTotalSecondsChange = (sec: number) => {
    const clampedSec = Math.max(0, Math.min(59, sec));
    const check = validateTimerInput(
      timer.totalMinutes,
      clampedSec,
      timer.alertMinutes,
      timer.alertSeconds
    );
    if (!check.valid) {
      setValidationError(check.error || null);
    } else {
      setValidationError(null);
    }

    onUpdateTimer((prev) => {
      const newTotalSec = prev.totalMinutes * 60 + clampedSec;
      return {
        ...prev,
        totalSeconds: clampedSec,
        remainingSeconds: prev.isRunning ? prev.remainingSeconds : newTotalSec,
        targetEndTime: prev.isRunning ? prev.targetEndTime : undefined,
      };
    });
  };

  const handleAlertMinutesChange = (min: number) => {
    const clampedMin = Math.max(0, Math.min(60, min));
    const check = validateTimerInput(
      timer.totalMinutes,
      timer.totalSeconds,
      clampedMin,
      timer.alertSeconds
    );
    if (!check.valid) {
      setValidationError(check.error || null);
    } else {
      setValidationError(null);
    }

    onUpdateTimer((prev) => ({
      ...prev,
      alertMinutes: clampedMin,
    }));
  };

  const handleAlertSecondsChange = (sec: number) => {
    const clampedSec = Math.max(0, Math.min(59, sec));
    const check = validateTimerInput(
      timer.totalMinutes,
      timer.totalSeconds,
      timer.alertMinutes,
      clampedSec
    );
    if (!check.valid) {
      setValidationError(check.error || null);
    } else {
      setValidationError(null);
    }

    onUpdateTimer((prev) => ({
      ...prev,
      alertSeconds: clampedSec,
    }));
  };

  const handleStart = () => {
    onUpdateTimer((prev) => {
      const remaining =
        prev.remainingSeconds <= 0
          ? prev.totalMinutes * 60 + prev.totalSeconds
          : prev.remainingSeconds;
      return {
        ...prev,
        remainingSeconds: remaining,
        isRunning: true,
        targetEndTime: Date.now() + remaining * 1000,
      };
    });
  };

  const handleTogglePause = () => {
    onUpdateTimer((prev) => {
      if (prev.isRunning) {
        // Pausing: freeze current remaining seconds based on targetEndTime if available
        const currentRemaining = prev.targetEndTime
          ? Math.max(0, Math.ceil((prev.targetEndTime - Date.now()) / 1000))
          : prev.remainingSeconds;
        return {
          ...prev,
          isRunning: false,
          remainingSeconds: currentRemaining,
          targetEndTime: undefined,
        };
      } else {
        // Resuming
        const remaining =
          prev.remainingSeconds <= 0
            ? prev.totalMinutes * 60 + prev.totalSeconds
            : prev.remainingSeconds;
        return {
          ...prev,
          isRunning: true,
          remainingSeconds: remaining,
          targetEndTime: Date.now() + remaining * 1000,
        };
      }
    });
  };

  const handleReset = () => {
    const totalSec = timer.totalMinutes * 60 + timer.totalSeconds;
    onUpdateTimer((prev) => ({
      ...prev,
      remainingSeconds: totalSec,
      isRunning: false,
      targetEndTime: undefined,
    }));
  };

  const alertThresholdSeconds = timer.alertMinutes * 60 + timer.alertSeconds;
  const isAlertState =
    timer.remainingSeconds > 0 && timer.remainingSeconds <= alertThresholdSeconds;
  const isTimeUp = timer.remainingSeconds <= 0;

  // Real-time Display Only Mode (Used in 【最上段】リアルタイムコントロール)
  if (mode === 'display_only') {
    return (
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border-2 border-neutral-950 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-neutral-950" />
            <span className="text-xs sm:text-sm font-black text-neutral-800">
              現在モニター表示中の時間:
            </span>
          </div>

          {/* Timer Display Box */}
          <div
            className={`px-4 py-1.5 rounded-lg border-3 border-neutral-950 font-mono font-black text-2xl sm:text-3xl tracking-wider shadow-inner transition-colors ${
              isTimeUp
                ? 'bg-red-600 text-white animate-pulse'
                : isAlertState
                ? 'bg-red-50 text-red-600 border-red-600 ring-2 ring-red-400'
                : 'bg-white text-neutral-950'
            }`}
          >
            {formatTimeMMSS(timer.remainingSeconds)}
          </div>

          {timer.isRunning && (
            <span className="text-xs bg-emerald-100 text-emerald-950 border border-emerald-600 px-2.5 py-1 rounded-full font-black animate-pulse">
              カウント中
            </span>
          )}

          {!timer.isEnabled && (
            <span className="text-xs bg-neutral-100 text-neutral-600 border border-neutral-400 px-2 py-0.5 rounded font-bold">
              ※ タイマーモニター表示OFF中
            </span>
          )}
        </div>

        {/* Buttons: カウントダウンを開始する / 一時停止する・再開する / リセットする */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleStart}
            disabled={timer.isRunning}
            className="inline-flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-950 text-white px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow font-black text-xs sm:text-sm cursor-pointer disabled:cursor-not-allowed transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>カウントダウンを開始する</span>
          </button>

          <button
            type="button"
            onClick={handleTogglePause}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow font-black text-xs sm:text-sm cursor-pointer transition ${
              timer.isRunning
                ? 'bg-amber-300 hover:bg-amber-400 text-neutral-950'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Pause className="w-3.5 h-3.5" />
            <span>{timer.isRunning ? '一時停止する' : '再開する'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-neutral-100 text-neutral-950 px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow font-black text-xs sm:text-sm cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>リセットする</span>
          </button>
        </div>
      </div>
    );
  }

  // Settings Only Mode (Used in 【各種設定コントロール】)
  if (mode === 'settings_only') {
    return (
      <div className="bg-[#FFFDE7] p-4 sm:p-5 rounded-lg border-2 border-neutral-950 shadow-sm space-y-4">
        {/* Switch: タイマーを表示する／表示しない */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-300 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-neutral-950" />
            <h3 className="text-base sm:text-lg font-black text-neutral-950">
              タイマー設定
            </h3>
          </div>

          <div className="bg-white px-3 py-1.5 rounded-lg border-2 border-neutral-950 shadow-sm">
            <Switch
              checked={timer.isEnabled}
              onChange={(checked) =>
                onUpdateTimer((prev) => ({ ...prev, isEnabled: checked }))
              }
              onLabel="タイマーを表示する"
              offLabel="表示しない"
              label="モニター表示:"
            />
          </div>
        </div>

        {/* Validation error display if alert > total */}
        {validationError && (
          <div className="flex items-center gap-2 bg-red-100 text-red-900 border-2 border-red-500 p-2.5 rounded-lg text-xs sm:text-sm font-black shadow-xs">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Setting row 1: タイマー時間の定義 (何分何秒) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-neutral-950">
          <span className="text-xs sm:text-sm font-bold text-neutral-800">
            タイマー時間の設定 (0分1秒〜60分59秒):
          </span>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={60}
                value={timer.totalMinutes}
                onChange={(e) =>
                  handleTotalMinutesChange(parseInt(e.target.value, 10) || 0)
                }
                className="w-16 h-8 text-center text-base font-black border-2 border-neutral-950 rounded bg-white"
              />
              <span className="text-sm font-black">分</span>
            </div>

            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={59}
                value={timer.totalSeconds}
                onChange={(e) =>
                  handleTotalSecondsChange(parseInt(e.target.value, 10) || 0)
                }
                className="w-16 h-8 text-center text-base font-black border-2 border-neutral-950 rounded bg-white"
              />
              <span className="text-sm font-black">秒</span>
            </div>
          </div>
        </div>

        {/* Setting row 2: 何分でタイマーの色を変えるか */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-neutral-950">
          <div>
            <span className="text-xs sm:text-sm font-bold text-neutral-800 block">
              何分でタイマーの色を変えるか (残り時間の警告閾値):
            </span>
            <span className="text-[11px] text-neutral-600 font-bold">
              ※ 元のタイマー時間以下の時間を入力してください
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={60}
                value={timer.alertMinutes}
                onChange={(e) =>
                  handleAlertMinutesChange(parseInt(e.target.value, 10) || 0)
                }
                className={`w-16 h-8 text-center text-base font-black border-2 rounded bg-white ${
                  validationError
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-neutral-950'
                }`}
              />
              <span className="text-sm font-black">分</span>
            </div>

            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={59}
                value={timer.alertSeconds}
                onChange={(e) =>
                  handleAlertSecondsChange(parseInt(e.target.value, 10) || 0)
                }
                className={`w-16 h-8 text-center text-base font-black border-2 rounded bg-white ${
                  validationError
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-neutral-950'
                }`}
              />
              <span className="text-sm font-black">秒</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full Mode: renders both
  return (
    <div className="bg-[#FFFDE7] p-4 sm:p-5 rounded-lg border-2 border-neutral-950 shadow-sm space-y-4">
      {/* Switch: タイマーを表示する／表示しない */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-300 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-neutral-950" />
          <h3 className="text-base sm:text-lg font-black text-neutral-950">
            タイマー
          </h3>
        </div>

        <div className="bg-white px-3 py-1.5 rounded-lg border-2 border-neutral-950 shadow-sm">
          <Switch
            checked={timer.isEnabled}
            onChange={(checked) =>
              onUpdateTimer((prev) => ({ ...prev, isEnabled: checked }))
            }
            onLabel="タイマーを表示する"
            offLabel="表示しない"
            label="モニター表示:"
          />
        </div>
      </div>

      {timer.isEnabled && (
        <div className="space-y-4 pt-1">
          {/* Validation error display if alert > total */}
          {validationError && (
            <div className="flex items-center gap-2 bg-red-100 text-red-900 border-2 border-red-500 p-2.5 rounded-lg text-xs sm:text-sm font-black shadow-xs">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Setting row 1: タイマー時間の定義 (何分何秒) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-neutral-950">
            <span className="text-xs sm:text-sm font-bold text-neutral-800">
              タイマー時間の設定 (0分1秒〜60分59秒):
            </span>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={timer.totalMinutes}
                  onChange={(e) =>
                    handleTotalMinutesChange(parseInt(e.target.value, 10) || 0)
                  }
                  className="w-16 h-8 text-center text-base font-black border-2 border-neutral-950 rounded bg-white"
                />
                <span className="text-sm font-black">分</span>
              </div>

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={timer.totalSeconds}
                  onChange={(e) =>
                    handleTotalSecondsChange(parseInt(e.target.value, 10) || 0)
                  }
                  className="w-16 h-8 text-center text-base font-black border-2 border-neutral-950 rounded bg-white"
                />
                <span className="text-sm font-black">秒</span>
              </div>
            </div>
          </div>

          {/* Setting row 2: 何分でタイマーの色を変えるか */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-neutral-950">
            <div>
              <span className="text-xs sm:text-sm font-bold text-neutral-800 block">
                何分でタイマーの色を変えるか (残り時間の警告閾値):
              </span>
              <span className="text-[11px] text-neutral-600 font-bold">
                ※ 元のタイマー時間以下の時間を入力してください
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={timer.alertMinutes}
                  onChange={(e) =>
                    handleAlertMinutesChange(parseInt(e.target.value, 10) || 0)
                  }
                  className={`w-16 h-8 text-center text-base font-black border-2 rounded bg-white ${
                    validationError
                      ? 'border-red-600 bg-red-50 text-red-700'
                      : 'border-neutral-950'
                  }`}
                />
                <span className="text-sm font-black">分</span>
              </div>

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={timer.alertSeconds}
                  onChange={(e) =>
                    handleAlertSecondsChange(parseInt(e.target.value, 10) || 0)
                  }
                  className={`w-16 h-8 text-center text-base font-black border-2 rounded bg-white ${
                    validationError
                      ? 'border-red-600 bg-red-50 text-red-700'
                      : 'border-neutral-950'
                  }`}
                />
                <span className="text-sm font-black">秒</span>
              </div>
            </div>
          </div>

          {/* Row 3: 現在モニター画面に表示しているタイマーの時間 & コントロールボタン */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border-2 border-neutral-950 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-bold text-neutral-700">
                現在モニター表示中の時間:
              </span>

              {/* Timer Display Box */}
              <div
                className={`px-4 py-1.5 rounded-lg border-3 border-neutral-950 font-mono font-black text-2xl sm:text-3xl tracking-wider shadow-inner transition-colors ${
                  isTimeUp
                    ? 'bg-red-600 text-white animate-pulse'
                    : isAlertState
                    ? 'bg-red-50 text-red-600 border-red-600 ring-2 ring-red-400'
                    : 'bg-white text-neutral-950'
                }`}
              >
                {formatTimeMMSS(timer.remainingSeconds)}
              </div>

              {timer.isRunning && (
                <span className="text-xs bg-emerald-100 text-emerald-950 border border-emerald-600 px-2 py-0.5 rounded-full font-bold animate-pulse">
                  カウント中
                </span>
              )}
            </div>

            {/* Buttons: カウントダウンを開始する / 一時停止する・再開する / リセットする */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleStart}
                disabled={timer.isRunning}
                className="inline-flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-950 text-white px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow font-black text-xs sm:text-sm cursor-pointer disabled:cursor-not-allowed transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>カウントダウンを開始する</span>
              </button>

              <button
                type="button"
                onClick={handleTogglePause}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow font-black text-xs sm:text-sm cursor-pointer transition ${
                  timer.isRunning
                    ? 'bg-amber-300 hover:bg-amber-400 text-neutral-950'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Pause className="w-3.5 h-3.5" />
                <span>{timer.isRunning ? '一時停止する' : '再開する'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-neutral-100 text-neutral-950 px-3.5 py-2 rounded-lg border-2 border-neutral-950 shadow font-black text-xs sm:text-sm cursor-pointer transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>リセットする</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
