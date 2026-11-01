import React, { useEffect, useRef } from 'react';
import { BgPattern, ColorPalette } from '../types/ogiri';

interface BackgroundPatternLayerProps {
  pattern: BgPattern;
  scale?: number; // 50..200 (default 100)
  speed?: number; // 20..300 (default 100)
  opacity?: number; // 10..100 (default 60)
  count?: number; // 20..200 (default 100)
  palette?: ColorPalette;
  isDark?: boolean;
  className?: string;
}

// Pseudo-random number generator for deterministic pattern distribution
function createSeededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export const BackgroundPatternLayer: React.FC<BackgroundPatternLayerProps> = ({
  pattern,
  scale = 100,
  speed = 100,
  opacity = 60,
  count = 100,
  palette = 'yellow',
  isDark = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (pattern === 'none') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;

    // Handle high-DPI resize
    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width || window.innerWidth;
      height = rect.height || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Color definitions
    // 背景色が白の時のみ、灰色の線 / 灰色の円
    const isWhiteBg = palette === 'white';
    const alphaBase = Math.max(0.05, Math.min(1.0, (opacity || 60) / 100));

    // Dynamic RGBA strings
    const mainAlpha = isWhiteBg
      ? (alphaBase * 0.9).toFixed(2)
      : isDark
      ? (alphaBase * 0.65).toFixed(2)
      : (alphaBase * 0.85).toFixed(2);

    const accentAlpha = isWhiteBg
      ? (alphaBase * 0.65).toFixed(2)
      : isDark
      ? (alphaBase * 0.45).toFixed(2)
      : (alphaBase * 0.6).toFixed(2);

    const mainColor = isWhiteBg
      ? `rgba(75, 85, 99, ${mainAlpha})`
      : `rgba(255, 255, 255, ${mainAlpha})`;

    const accentColor = isWhiteBg
      ? `rgba(107, 114, 128, ${accentAlpha})`
      : `rgba(255, 255, 255, ${accentAlpha})`;

    // Pre-generate deterministic items
    const rng = createSeededRandom(42);
    const countMultiplier = Math.max(0.2, (count || 100) / 100);

    // 1. Dots pattern generation (multiple circles of all random sizes)
    const baseDotCount = 85;
    const effectiveDotCount = Math.max(10, Math.round(baseDotCount * countMultiplier));
    const dots = Array.from({ length: effectiveDotCount }, () => {
      return {
        u: rng(), // 0..1
        v: rng(), // 0..1
        baseRadius: 4 + Math.pow(rng(), 1.7) * 42, // Random sizes from 4px up to 46px
        alphaMultiplier: 0.3 + rng() * 0.7,
      };
    });

    // 2. Grid pattern generation (irregular vertical and horizontal grids with varied cell sizes)
    // Irregular mesh line intervals (denser when count is higher)
    const rawVIntervals = [50, 110, 70, 150, 60, 95, 130, 80, 170, 65, 120, 90];
    const rawHIntervals = [45, 120, 65, 140, 85, 160, 55, 100, 135, 75, 115, 95];
    const spacingFactor = 1 / Math.sqrt(countMultiplier);
    const vIntervals = rawVIntervals.map((v) => Math.max(30, v * spacingFactor));
    const hIntervals = rawHIntervals.map((h) => Math.max(30, h * spacingFactor));

    // Compute cumulative positions
    let curX = 0;
    const vLinePositions = [0];
    vIntervals.forEach((interval) => {
      curX += interval;
      vLinePositions.push(curX);
    });
    const periodW = curX;

    let curY = 0;
    const hLinePositions = [0];
    hIntervals.forEach((interval) => {
      curY += interval;
      hLinePositions.push(curY);
    });
    const periodH = curY;

    // Scattered rectangular grid patches of random width & height
    const basePatchCount = 18;
    const effectivePatchCount = Math.max(4, Math.round(basePatchCount * countMultiplier));
    const gridPatches = Array.from({ length: effectivePatchCount }, () => {
      const pW = 80 + rng() * 160; // 80..240px
      const pH = 60 + rng() * 140; // 60..200px
      const cols = 2 + Math.floor(rng() * 4);
      const rows = 2 + Math.floor(rng() * 4);
      return {
        u: rng(),
        v: rng(),
        baseW: pW,
        baseH: pH,
        cols,
        rows,
        alphaMultiplier: 0.4 + rng() * 0.6,
      };
    });

    // Angle: 30 degrees towards upper-right
    // In canvas (X right, Y down):
    // Angle = -30 deg -> dx = cos(30°), dy = -sin(30°)
    const angleRad = (30 * Math.PI) / 180;
    const dirX = Math.cos(angleRad); // ~0.866
    const dirY = -Math.sin(angleRad); // -0.5

    let offsetX = 0;
    let offsetY = 0;

    const render = () => {
      if (!ctx || !canvas) return;

      // Clear frame
      ctx.clearRect(0, 0, width, height);

      const scaleMultiplier = Math.max(0.2, (scale || 100) / 100);
      const speedMultiplier = Math.max(0.1, (speed || 100) / 100);

      // Movement step
      const step = 0.55 * speedMultiplier;
      offsetX += dirX * step;
      offsetY += dirY * step;

      if (pattern === 'dots') {
        // Render randomized floating dots
        dots.forEach((dot) => {
          const r = Math.max(2, dot.baseRadius * scaleMultiplier);
          const rawX = (dot.u * width + offsetX) % width;
          const rawY = (dot.v * height + offsetY) % height;
          const x = (rawX + width) % width;
          const y = (rawY + height) % height;

          ctx.fillStyle = mainColor;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();

          // Seamless edge wrapping
          const wrapLeft = x - r < 0;
          const wrapRight = x + r > width;
          const wrapTop = y - r < 0;
          const wrapBottom = y + r > height;

          if (wrapLeft) {
            ctx.beginPath();
            ctx.arc(x + width, y, r, 0, Math.PI * 2);
            ctx.fill();
          }
          if (wrapRight) {
            ctx.beginPath();
            ctx.arc(x - width, y, r, 0, Math.PI * 2);
            ctx.fill();
          }
          if (wrapTop) {
            ctx.beginPath();
            ctx.arc(x, y + height, r, 0, Math.PI * 2);
            ctx.fill();
          }
          if (wrapBottom) {
            ctx.beginPath();
            ctx.arc(x, y - height, r, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      } else if (pattern === 'grid') {
        // Render randomized grids
        const scaledPW = periodW * scaleMultiplier;
        const scaledPH = periodH * scaleMultiplier;

        // 1. Background irregular continuous mesh lines
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1.4;

        const effectiveOffX = ((offsetX % scaledPW) + scaledPW) % scaledPW;
        const effectiveOffY = ((offsetY % scaledPH) + scaledPH) % scaledPH;

        // Vertical lines with varied random spacing
        const startX = -scaledPW;
        const endX = width + scaledPW;
        for (let bx = startX; bx < endX; bx += scaledPW) {
          vLinePositions.forEach((pos) => {
            const x = bx + pos * scaleMultiplier + effectiveOffX;
            if (x >= -5 && x <= width + 5) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, height);
              ctx.stroke();
            }
          });
        }

        // Horizontal lines with varied random spacing
        const startY = -scaledPH;
        const endY = height + scaledPH;
        for (let by = startY; by < endY; by += scaledPH) {
          hLinePositions.forEach((pos) => {
            const y = by + pos * scaleMultiplier + effectiveOffY;
            if (y >= -5 && y <= height + 5) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(width, y);
              ctx.stroke();
            }
          });
        }

        // 2. Distinct scattered rectangular grid blocks with irregular sub-cells
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1.8;

        gridPatches.forEach((patch) => {
          const pW = patch.baseW * scaleMultiplier;
          const pH = patch.baseH * scaleMultiplier;
          const rawX = (patch.u * width + offsetX * 1.05) % width;
          const rawY = (patch.v * height + offsetY * 1.05) % height;
          const px = (rawX + width) % width;
          const py = (rawY + height) % height;

          const drawPatch = (x: number, y: number) => {
            // Outer rectangle
            ctx.strokeRect(x, y, pW, pH);

            // Sub-divisions
            const cellW = pW / patch.cols;
            const cellH = pH / patch.rows;

            ctx.beginPath();
            for (let c = 1; c < patch.cols; c++) {
              ctx.moveTo(x + c * cellW, y);
              ctx.lineTo(x + c * cellW, y + pH);
            }
            for (let r = 1; r < patch.rows; r++) {
              ctx.moveTo(x, y + r * cellH);
              ctx.lineTo(x + pW, y + r * cellH);
            }
            ctx.stroke();
          };

          drawPatch(px, py);

          // Wrap around edges
          if (px + pW > width) drawPatch(px - width, py);
          if (py + pH > height) drawPatch(px, py - height);
          if (px + pW > width && py + pH > height) drawPatch(px - width, py - height);
        });
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [pattern, scale, speed, opacity, count, palette, isDark]);

  if (pattern === 'none') {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none z-10 ${className}`}
    />
  );
};
