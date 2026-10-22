import { useCallback, useRef } from 'react';
import type { PointerEvent as RPointerEvent, KeyboardEvent as RKeyboardEvent } from 'react';

interface Md3SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  ariaLabel?: string;
}

/**
 * 轻量 MD3 滑块：替代浏览器原生 <input type="range">。
 * 使用 Pointer Events 统一鼠标/触屏拖拽，无外部依赖，复用现有 MD3 令牌。
 */
export default function Md3Slider({ value, onChange, min, max, step, ariaLabel }: Md3SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || max === min) return min;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      let raw = min + (max - min) * ratio;
      if (step) raw = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, raw));
    },
    [min, max, step],
  );

  const commit = (clientX: number) => {
    const next = valueFromClientX(clientX);
    onChange(Math.round(next * 100) / 100);
  };

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    commit(e.clientX);
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    commit(e.clientX);
  };

  const endDrag = (e: RPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleKeyDown = (e: RKeyboardEvent<HTMLDivElement>) => {
    const stepVal = step ?? (max - min) / 100;
    let next = value;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = value - stepVal;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = value + stepVal;
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    else return;
    e.preventDefault();
    onChange(Math.round(Math.max(min, Math.min(max, next)) * 100) / 100);
  };

  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const clampedPct = Math.max(0, Math.min(100, pct));

  return (
    <div
      className="md3-slider"
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
    >
      <div className="md3-slider__track" />
      <div className="md3-slider__fill" style={{ width: `${clampedPct}%` }} />
      <div className="md3-slider__thumb" style={{ left: `${clampedPct}%` }} />
    </div>
  );
}