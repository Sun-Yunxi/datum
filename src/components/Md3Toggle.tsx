import { useRef, useLayoutEffect } from 'react';

interface Md3ToggleProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  size?: 'small' | 'medium';
}

export default function Md3Toggle({ options, value, onChange, size = 'medium' }: Md3ToggleProps) {
  const activeIndex = options.findIndex((o) => o.value === value);
  
  // Refs for measurement
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const indicatorRef = useRef<HTMLDivElement>(null);
  // 首次定位标记：首帧直接落位、不播动画，避免胶囊从 0 生长
  const readyRef = useRef(false);

  // 直接操作 DOM 写入指示器位置，保证视觉更新与当前帧同步
  useLayoutEffect(() => {
    const activeBtn = buttonRefs.current[activeIndex];
    const indicator = indicatorRef.current;

    if (activeBtn && indicator) {
      // Force synchronous layout read to get accurate values immediately
      const left = activeBtn.offsetLeft;
      const width = activeBtn.offsetWidth;

      if (!readyRef.current) {
        indicator.style.transition = 'none';
        indicator.style.width = `${width}px`;
        indicator.style.transform = `translateX(${left}px)`;
        void indicator.offsetWidth; // 强制 reflow，让落位立即生效
        indicator.style.transition = '';
        readyRef.current = true;
        return;
      }

      indicator.style.width = `${width}px`;
      indicator.style.transform = `translateX(${left}px)`;
    }
  }, [activeIndex]); // Re-run when selection changes

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const len = options.length;
    let nextIndex = activeIndex;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (activeIndex - 1 + len) % len;
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (activeIndex + 1) % len;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = len - 1;
    } else {
      return;
    }
    onChange(options[nextIndex].value);
  };

  return (
    <div 
      ref={containerRef}
      className={`md3-toggle md3-toggle--${size}`} 
      role="tablist" 
      onKeyDown={handleKeyDown}
    >
      {/* Sliding Indicator - Absolute positioned */}
      <div 
        ref={indicatorRef}
        className="md3-toggle__indicator" 
        aria-hidden="true"
      />
      
      {options.map((opt, i) => (
        <button
          key={opt.value}
          ref={(el) => { buttonRefs.current[i] = el; }}
          className={`md3-toggle__option${i === activeIndex ? ' md3-toggle__option--active' : ''}`}
          role="tab"
          aria-selected={i === activeIndex}
          tabIndex={i === activeIndex ? 0 : -1}
          onClick={() => onChange(opt.value)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}