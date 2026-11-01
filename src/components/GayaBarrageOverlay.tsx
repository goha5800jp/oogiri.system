import React, { useEffect, useState } from 'react';
import { subscribeToGayaStream } from '../services/gayaService';
import { ColorPalette, GayaStreamEvent } from '../types/ogiri';

interface FlyingCommentItem {
  id: string;
  text: string;
  isTengu: boolean;
  topPercent: number;
  durationSec: number;
  nickname?: string;
}

interface GayaBarrageOverlayProps {
  isGayaModeEnabled?: boolean;
  colorPalette?: ColorPalette;
  isDark?: boolean;
}

export const GayaBarrageOverlay: React.FC<GayaBarrageOverlayProps> = ({
  isGayaModeEnabled = false,
  colorPalette = 'yellow',
  isDark = false,
}) => {
  const [flyingComments, setFlyingComments] = useState<FlyingCommentItem[]>([]);

  useEffect(() => {
    if (!isGayaModeEnabled) {
      setFlyingComments([]);
      return;
    }

    const unsub = subscribeToGayaStream((event: GayaStreamEvent) => {
      // Generate random height: 8% to 80% to avoid screen clipping
      const randomTop = 8 + Math.random() * 72;
      // Duration between 6.0 and 8.5 seconds for pleasant reading pace
      const randomDuration = 6.0 + Math.random() * 2.5;

      const item: FlyingCommentItem = {
        id: `${event.id}_${Date.now()}_${Math.random()}`,
        text: event.text,
        isTengu: !!event.isTengu,
        topPercent: Math.round(randomTop),
        durationSec: parseFloat(randomDuration.toFixed(2)),
        nickname: event.nickname,
      };

      setFlyingComments((prev) => [...prev, item]);

      // Remove after animation finishes
      setTimeout(() => {
        setFlyingComments((curr) => curr.filter((c) => c.id !== item.id));
      }, (randomDuration + 0.5) * 1000);
    });

    return () => unsub();
  }, [isGayaModeEnabled]);

  if (!isGayaModeEnabled || flyingComments.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {flyingComments.map((item) => {
        return (
          <div
            key={item.id}
            className="absolute whitespace-nowrap font-black select-none animate-gaya-stream"
            style={{
              top: `${item.topPercent}%`,
              animationDuration: `${item.durationSec}s`,
            }}
          >
            {item.isTengu ? (
              // 👺: 他の文字列よりもかなり大きなサイズで「👺」が流れる
              <span className="text-8xl sm:text-9xl md:text-[10rem] filter drop-shadow-lg inline-block transform hover:scale-110">
                👺
              </span>
            ) : (
              <span
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-wider font-black inline-block"
                style={{
                  color: '#4b5563', // 灰色のボールド文字
                  WebkitTextStroke: '2.5px #ffffff', // 白い縁取り
                  paintOrder: 'stroke fill',
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
                }}
              >
                {item.text}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
