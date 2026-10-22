import { useEffect, useLayoutEffect, useRef } from 'react';
import 'mdui/components/switch.js';
import type { Switch } from 'mdui/components/switch.js';

interface Md3SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

/**
 * mdui-switch 的受控封装。
 * 自定义元素的事件无法通过 React 的 onXxx 绑定，必须用 ref + addEventListener。
 */
export default function Md3Switch({ checked, onChange, disabled, ariaLabel, className }: Md3SwitchProps) {
  const ref = useRef<Switch | null>(null);

  // 受控同步：用 layout effect 在绘制前写入，避免首帧状态不一致
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.checked !== checked) el.checked = checked;
  }, [checked]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleChange = () => onChange(el.checked);
    el.addEventListener('change', handleChange);
    return () => el.removeEventListener('change', handleChange);
  }, [onChange]);

  return (
    <mdui-switch
      ref={ref}
      className={className}
      disabled={disabled || undefined}
      aria-label={ariaLabel}
    />
  );
}