import { useRef, useEffect, useCallback, useState } from 'react';
import { useStore, getPaperSize } from '../store/useStore';
import QRCode from 'qrcode';
import type {
  PaperSettings,
  ElementInstance,
  IntervalLineSettings,
  DiagonalSettings,
  DotSettings,
  SingleLineSettings,
  BlockSettings,
  CircleSettings,
  QRCodeSettings,
  WatermarkSettings,
  TextSettings,
} from '../types';

const MM_TO_PX = 3.7795;

function applyLineStyle(
  ctx: CanvasRenderingContext2D,
  style: 'solid' | 'dashed',
  lineWidth: number,
  gapMm?: number,
  scale = 1,
) {
  if (style === 'dashed') {
    const dashLen = Math.max(2, lineWidth * 3);
    const gap = gapMm && gapMm > 0 ? Math.max(1, gapMm * MM_TO_PX * scale) : dashLen;
    ctx.setLineDash([dashLen, gap]);
  } else {
    ctx.setLineDash([]);
  }
}

function drawElement(
  ctx: CanvasRenderingContext2D,
  el: ElementInstance,
  paper: { width: number; height: number },
  scale: number,
  offsetX: number,
  offsetY: number,
  settings: PaperSettings,
  qrImageCache: Map<string, HTMLImageElement>,
) {
  const s = el.settings;
  if (!s.enabled) return;

  // Text elements are not rendered in preview canvas
  if (el.type === 'text') return;

  const s2 = s as Exclude<typeof s, TextSettings>;
  const ox = s2.ignoreMargin ? s2.offsetRight : 0;
  const oy = s2.ignoreMargin ? s2.offsetDown : 0;
  const marginL = s2.ignoreMargin ? 0 : settings.marginLeft;
  const marginT = s2.ignoreMargin ? 0 : settings.marginTop;
  const marginR = s2.ignoreMargin ? 0 : settings.marginRight;
  const marginB = s2.ignoreMargin ? 0 : settings.marginBottom;

  const baseX = offsetX + (marginL + ox) * MM_TO_PX * scale;
  const baseY = offsetY + (marginT + oy) * MM_TO_PX * scale;

  const paperWPx = paper.width * MM_TO_PX * scale;
  const paperHPx = paper.height * MM_TO_PX * scale;

  const maxWPx = offsetX + paperWPx - (marginR * MM_TO_PX * scale);
  const maxHPx = offsetY + paperHPx - (marginB * MM_TO_PX * scale);

  const rw = s2.rangeWidth > 0
    ? Math.min(s2.rangeWidth * MM_TO_PX * scale, maxWPx - baseX)
    : maxWPx - baseX;
  const rh = s2.rangeHeight > 0
    ? Math.min(s2.rangeHeight * MM_TO_PX * scale, maxHPx - baseY)
    : maxHPx - baseY;

  if (rw <= 0 || rh <= 0) return;

  switch (el.type) {
    case 'intervalLine': {
      const is = s as IntervalLineSettings;
      const spacing = is.spacing * MM_TO_PX * scale;
      if (spacing <= 0) return;

      const lw = Math.max(0.5, is.lineWidth * MM_TO_PX * scale);

      ctx.strokeStyle = is.color;

      // Frame
      if (is.frameStyle !== 'none') {
        const fw = is.frameLineWidth * MM_TO_PX * scale;
        if (fw > 0) {
          ctx.lineWidth = fw;
          applyLineStyle(ctx, is.frameStyle, fw, is.frameDashGap, scale);
          ctx.strokeRect(baseX, baseY, rw, rh);
        }
      }

      // Grid lines
      ctx.lineWidth = lw;
      applyLineStyle(ctx, is.lineStyle, lw, is.dashGap, scale);

      if (is.direction === 'horizontal') {
        ctx.beginPath();
        for (let y = baseY; y <= baseY + rh + 0.5; y += spacing) {
          ctx.moveTo(baseX, y);
          ctx.lineTo(baseX + rw, y);
        }
        ctx.stroke();
      } else {
        ctx.beginPath();
        for (let x = baseX; x <= baseX + rw + 0.5; x += spacing) {
          ctx.moveTo(x, baseY);
          ctx.lineTo(x, baseY + rh);
        }
        ctx.stroke();
      }

      ctx.setLineDash([]);
      break;
    }

    case 'diagonal': {
      const ds = s as DiagonalSettings;
      const spacing = ds.spacing * MM_TO_PX * scale;
      if (spacing <= 0) return;

      const lw = Math.max(0.5, ds.lineWidth * MM_TO_PX * scale);
      ctx.strokeStyle = ds.color;

      // Frame
      if (ds.frameStyle !== 'none') {
        const fw = ds.frameLineWidth * MM_TO_PX * scale;
        if (fw > 0) {
          ctx.lineWidth = fw;
          applyLineStyle(ctx, ds.frameStyle, fw, ds.frameDashGap, scale);
          ctx.strokeRect(baseX, baseY, rw, rh);
        }
      }

      ctx.lineWidth = lw;
      applyLineStyle(ctx, ds.lineStyle, lw, ds.dashGap, scale);

      // 裁剪到范围内：斜线不越出留白，且四角完整
      ctx.save();
      ctx.beginPath();
      ctx.rect(baseX, baseY, rw, rh);
      ctx.clip();
      ctx.beginPath();
      if (ds.direction === 'top-left-bottom-right' || ds.direction === 'both') {
        for (let i = -rh; i < rw + rh; i += spacing) {
          ctx.moveTo(baseX + i, baseY);
          ctx.lineTo(baseX + i + rh, baseY + rh);
        }
      }
      if (ds.direction === 'top-right-bottom-left' || ds.direction === 'both') {
        for (let i = -rh; i < rw + rh; i += spacing) {
          ctx.moveTo(baseX + i, baseY + rh);
          ctx.lineTo(baseX + i + rh, baseY);
        }
      }
      ctx.stroke();
      ctx.restore();

      ctx.setLineDash([]);
      break;
    }

    case 'dot': {
      const ds = s as DotSettings;
      const dotSize = Math.max(0.5, ds.dotSize * MM_TO_PX * scale);
      const hSp = ds.horizontalSpacing * MM_TO_PX * scale;
      const vSp = ds.verticalSpacing * MM_TO_PX * scale;
      if (hSp <= 0 || vSp <= 0) return;

      ctx.fillStyle = ds.color;
      const r = dotSize / 2;

      ctx.beginPath();
      for (let x = baseX; x <= baseX + rw + 0.5; x += hSp) {
        for (let y = baseY; y <= baseY + rh + 0.5; y += vSp) {
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      break;
    }

    case 'singleLine': {
      const sl = s as SingleLineSettings;
      const lw = Math.max(0.5, sl.lineWidth * MM_TO_PX * scale);

      ctx.strokeStyle = sl.color;
      ctx.lineWidth = lw;
      applyLineStyle(ctx, sl.lineStyle, lw);

      const x1 = baseX + sl.startX * MM_TO_PX * scale;
      const y1 = baseY + sl.startY * MM_TO_PX * scale;
      const x2 = baseX + sl.endX * MM_TO_PX * scale;
      const y2 = baseY + sl.endY * MM_TO_PX * scale;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }

    case 'block': {
      const bs = s as BlockSettings;
      const bw = bs.width * MM_TO_PX * scale;
      const bh = bs.height * MM_TO_PX * scale;

      ctx.fillStyle = bs.color;
      ctx.fillRect(baseX, baseY, bw, bh);
      break;
    }

    case 'circle': {
      const cs = s as CircleSettings;
      const r = (cs.diameter / 2) * MM_TO_PX * scale;

      ctx.strokeStyle = cs.color;
      ctx.lineWidth = Math.max(0.5, 0.1 * MM_TO_PX * scale);
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(baseX + r, baseY + r, r, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'qrCode': {
      const qs = s as QRCodeSettings;
      const qrSize = qs.size * MM_TO_PX * scale;

      const cacheKey = `${qs.content}_${qs.size}`;
      const cachedImg = qrImageCache.get(cacheKey);

      if (cachedImg && cachedImg.complete) {
        ctx.drawImage(cachedImg, baseX, baseY, qrSize, qrSize);
      } else {
        // Placeholder while loading
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(baseX, baseY, qrSize, qrSize);
        ctx.strokeStyle = qs.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.strokeRect(baseX, baseY, qrSize, qrSize);

        const labelFontSize = Math.max(8, qrSize * 0.12);
        ctx.fillStyle = qs.color;
        ctx.font = `${labelFontSize}px sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText('[QR]', baseX + qrSize / 2, baseY + qrSize / 2);
      }
      break;
    }

    case 'watermark': {
      const ws = s as WatermarkSettings;
      const ww = ws.width * MM_TO_PX * scale;
      const wh = ws.width * MM_TO_PX * scale;

      ctx.globalAlpha = ws.opacity / 100;
      if (ws.imageData) {
        // Placeholder: colored rect
        ctx.fillStyle = ws.color;
        ctx.fillRect(baseX, baseY, ww, wh);
      } else {
        // Placeholder: dashed rect with label
        ctx.strokeStyle = ws.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(baseX, baseY, ww, wh);
        ctx.setLineDash([]);

        const labelFontSize = Math.max(8, ww * 0.08);
        ctx.fillStyle = ws.color;
        ctx.font = `${labelFontSize}px sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText('Watermark', baseX + ww / 2, baseY + wh / 2);
      }
      ctx.globalAlpha = 1;
      break;
    }
  }
}

export default function Preview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrImageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [renderTick, setRenderTick] = useState(0);

  const paperSettings = useStore((s) => s.paperSettings);
  const elements = useStore((s) => s.elements);

  // Pre-generate QR code images
  useEffect(() => {
    const qrElements = elements.filter(
      (el) => el.type === 'qrCode' && el.settings.enabled
    );

    let cancelled = false;
    const cache = qrImageCache.current;

    for (const el of qrElements) {
      const qs = el.settings as QRCodeSettings;
      const cacheKey = `${qs.content}_${qs.size}`;

      if (!cache.has(cacheKey)) {
        QRCode.toDataURL(qs.content, {
          width: 200,
          margin: 1,
          color: { dark: qs.color, light: '#FFFFFF' },
        }).then((dataUrl) => {
          if (cancelled) return;
          const img = new Image();
          img.onload = () => {
            if (!cancelled) {
              cache.set(cacheKey, img);
              setRenderTick((t) => t + 1);
            }
          };
          img.src = dataUrl;
        }).catch(() => {});
      }
    }

    return () => { cancelled = true; };
  }, [elements]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const paper = getPaperSize(paperSettings);
    const paperWPx = paper.width * MM_TO_PX;
    const paperHPx = paper.height * MM_TO_PX;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    if (containerW <= 0 || containerH <= 0) return;

    const scale = Math.min(containerW / paperWPx, containerH / paperHPx);
    const displayW = paperWPx * scale;
    const displayH = paperHPx * scale;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerW * dpr;
    canvas.height = containerH * dpr;
    canvas.style.width = `${containerW}px`;
    canvas.style.height = `${containerH}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, containerW, containerH);

    // Center the paper
    const offsetX = (containerW - displayW) / 2;
    const offsetY = (containerH - displayH) / 2;

    // Paper background
    ctx.fillStyle = paperSettings.backgroundColor;
    ctx.fillRect(offsetX, offsetY, displayW, displayH);

    // Paper border
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.strokeRect(offsetX, offsetY, displayW, displayH);

    // Margin indicator
    const ml = paperSettings.marginLeft * MM_TO_PX * scale;
    const mr = paperSettings.marginRight * MM_TO_PX * scale;
    const mt = paperSettings.marginTop * MM_TO_PX * scale;
    const mb = paperSettings.marginBottom * MM_TO_PX * scale;

    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 5]);
    ctx.strokeRect(offsetX + ml, offsetY + mt, displayW - ml - mr, displayH - mt - mb);
    ctx.setLineDash([]);

    // Draw elements
    for (const el of elements) {
      drawElement(ctx, el, paper, scale, offsetX, offsetY, paperSettings, qrImageCache.current);
    }
  }, [paperSettings, elements, renderTick]);

  useEffect(() => {
    render();

    const observer = new ResizeObserver(() => {
      render();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [render]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#1a1a2e',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}