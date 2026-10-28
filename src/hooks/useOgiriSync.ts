import { useEffect, useRef, useState } from 'react';
import { CHANNEL_NAME, OgiriState, STORAGE_KEY } from '../types/ogiri';
import { createDefaultOgiriState } from '../utils/ogiriLogic';

interface SyncMessage {
  type: 'STATE_UPDATE' | 'REQUEST_STATE' | 'TIMER_TICK';
  payload?: OgiriState;
  remainingSeconds?: number;
  senderId: string;
}

export function useOgiriSync() {
  const [state, setState] = useState<OgiriState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<OgiriState>;
        const defaults = createDefaultOgiriState();
        if (parsed.timer?.isRunning && parsed.timer?.targetEndTime) {
          const diff = Math.max(
            0,
            Math.ceil((parsed.timer.targetEndTime - Date.now()) / 1000)
          );
          if (diff <= 0) {
            parsed.timer.isRunning = false;
            parsed.timer.remainingSeconds = 0;
            parsed.timer.targetEndTime = undefined;
          } else {
            parsed.timer.remainingSeconds = diff;
          }
        }

        return {
          ...defaults,
          ...parsed,
          timer: {
            ...defaults.timer,
            ...(parsed.timer || {}),
          },
          scoreButtons: parsed.scoreButtons || defaults.scoreButtons,
          participants: (parsed.participants || defaults.participants).map((p, idx) => ({
            id: p.id ?? idx + 1,
            name: p.name ?? '',
            avatarUrl: p.avatarUrl,
            isParticipating: !!p.isParticipating,
            score: p.score ?? 0,
            teamName: p.teamName ?? '',
          })),
        };
      }
    } catch {
      // Fallback
    }
    return createDefaultOgiriState();
  });

  const channelRef = useRef<BroadcastChannel | null>(null);
  const instanceIdRef = useRef<string>(Math.random().toString(36).substring(2, 9));
  const latestStateRef = useRef<OgiriState>(state);
  latestStateRef.current = state;

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event: MessageEvent<SyncMessage>) => {
        const msg = event.data;
        if (!msg || msg.senderId === instanceIdRef.current) return;

        if (msg.type === 'STATE_UPDATE' && msg.payload) {
          const incoming = msg.payload;
          if (incoming.timer?.isRunning && incoming.timer?.targetEndTime) {
            const diff = Math.max(
              0,
              Math.ceil((incoming.timer.targetEndTime - Date.now()) / 1000)
            );
            if (diff <= 0) {
              incoming.timer.isRunning = false;
              incoming.timer.remainingSeconds = 0;
              incoming.timer.targetEndTime = undefined;
            } else {
              incoming.timer.remainingSeconds = diff;
            }
          }
          setState(incoming);
        } else if (msg.type === 'REQUEST_STATE') {
          channel?.postMessage({
            type: 'STATE_UPDATE',
            payload: latestStateRef.current,
            senderId: instanceIdRef.current,
          });
        }
      };

      channel.postMessage({
        type: 'REQUEST_STATE',
        senderId: instanceIdRef.current,
      });
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.timer?.isRunning && parsed.timer?.targetEndTime) {
            const diff = Math.max(
              0,
              Math.ceil((parsed.timer.targetEndTime - Date.now()) / 1000)
            );
            if (diff <= 0) {
              parsed.timer.isRunning = false;
              parsed.timer.remainingSeconds = 0;
              parsed.timer.targetEndTime = undefined;
            } else {
              parsed.timer.remainingSeconds = diff;
            }
          }
          setState(parsed);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (channel) {
        channel.close();
      }
    };
  }, []);

  const updateState = (updater: OgiriState | ((prev: OgiriState) => OgiriState)) => {
    setState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save to localStorage:', err);
      }

      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'STATE_UPDATE',
          payload: next,
          senderId: instanceIdRef.current,
        });
      }

      return next;
    });
  };

  // Timer interval countdown:
  // Runs based on targetEndTime. Does NOT broadcast decrements over BroadcastChannel every second.
  // This completely eliminates double-countdown when multiple tabs/windows (e.g. Console & Monitor) are open!
  useEffect(() => {
    if (!state.timer.isRunning) return;

    // If running but targetEndTime is missing (e.g. recovery), set it
    if (!state.timer.targetEndTime) {
      const target = Date.now() + Math.max(0, state.timer.remainingSeconds) * 1000;
      updateState((prev) => ({
        ...prev,
        timer: {
          ...prev.timer,
          targetEndTime: target,
        },
      }));
      return;
    }

    const interval = setInterval(() => {
      const current = latestStateRef.current;
      if (!current.timer.isRunning || !current.timer.targetEndTime) return;

      const diff = Math.max(0, Math.ceil((current.timer.targetEndTime - Date.now()) / 1000));

      if (diff <= 0) {
        // Time is up! Officially update and broadcast completion to all windows
        updateState((prev) => ({
          ...prev,
          timer: {
            ...prev.timer,
            remainingSeconds: 0,
            isRunning: false,
            targetEndTime: undefined,
          },
        }));
      } else {
        // Local display tick only (avoids channel flooding & duplicate decrements across windows)
        setState((prev) => {
          if (!prev.timer.isRunning || prev.timer.remainingSeconds === diff) return prev;
          return {
            ...prev,
            timer: {
              ...prev.timer,
              remainingSeconds: diff,
            },
          };
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [state.timer.isRunning, state.timer.targetEndTime]);

  return { state, updateState };
}
