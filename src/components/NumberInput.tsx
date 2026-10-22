import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  className?: string;
  style?: CSSProperties;
  id?: string;
  placeholder?: string;
}

/**
 * 数字输入框：统一处理去前导零、负数截断、文字拦截，并保留正在输入的小数。
 * 使用 type="text" 而非 type="number"，避免浏览器归一化中间态（如 "1.0" 被改写为 "1"）。
 * 输入时用正则轻量过滤非法字符（满足「无法输入文字」），原始文本暂存，
 * 归一化（去前导零、clamp min/max）推迟到 onBlur 时执行。
 */
export default function NumberInput({
  value,
  onChange,
  min,
  max,
  integer = false,
  className,
  style,
  ...rest
}: NumberInputProps) {
  const [text, setText] = useState(String(value));
  const focusedRef = useRef(false);

  // 仅在未聚焦时同步外部值（模板切换、复制等场景），
  // 避免把正在输入的小数（如 "1.0"）因 value 回流而被重写为 "1"。
  useEffect(() => {
    if (!focusedRef.current) setText(String(value));
  }, [value]);

  const parse = (raw: string): number => {
    let n = integer ? parseInt(raw, 10) : parseFloat(raw);
    if (!Number.isFinite(n)) n = 0;
    if (max !== undefined && n > max) n = max;
    if (min !== undefined && n < min) n = min;
    return n;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const pattern = integer ? /^-?\d*$/ : /^-?\d*\.?\d*$/;
    if (!pattern.test(raw)) return; // 拒绝字母、多个小数点等非法输入
    setText(raw);
    // 中间态（空、仅负号、仅小数点）不触发数值回传，丢给 onBlur 统一归一化
    if (raw === '' || raw === '-' || raw === '.' || raw === '-.') return;
    onChange(parse(raw));
  };

  const handleFocus = () => {
    focusedRef.current = true;
  };

  const handleBlur = () => {
    focusedRef.current = false;
    const n = parse(text);
    onChange(n);
    setText(String(n)); // 失焦时去前导零、截断负值，如 "05" → "5"、"-3" → "0"
  };

  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      className={className}
      style={style}
      value={text}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...rest}
    />
  );
}