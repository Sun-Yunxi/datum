import { useEffect, useRef } from 'react';
import 'mdui/components/menu.js';
import 'mdui/components/menu-item.js';
import 'mdui/components/dropdown.js';
import type { Menu } from 'mdui/components/menu.js';
import type { Dropdown } from 'mdui/components/dropdown.js';

export interface Md3SelectOption {
  value: string;
  label: string;
}

interface Md3SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Md3SelectOption[];
  className?: string;
  ariaLabel?: string;
}

/**
 * MD3 下拉菜单：基于成熟的 mdui 组件（<mdui-dropdown> + <mdui-menu selects="single">），
 * 展开/收起带动画，替代浏览器原生 <select>，复用项目 MD3 设计令牌。
 */
export default function Md3Select({ value, onChange, options, className, ariaLabel }: Md3SelectProps) {
  const menuRef = useRef<Menu | null>(null);
  const dropdownRef = useRef<Dropdown | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  // 受控同步：外部 value 变化时同步到 mdui 菜单
  useEffect(() => {
    const menu = menuRef.current;
    if (menu && menu.value !== value) {
      menu.value = value;
    }
  }, [value]);

  // 监听菜单选中变化（mdui 通过 CustomEvent 派发，需用原生 addEventListener）
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const handleChange = () => {
      const v = menu.value;
      if (typeof v === 'string' && v !== valueRef.current) {
        onChange(v);
      }
    };
    menu.addEventListener('change', handleChange);
    return () => menu.removeEventListener('change', handleChange);
  }, [onChange]);

  // 打开后把当前选中项滚动进菜单可视区域（选项超出 max-height 时菜单内部滚动）
  useEffect(() => {
    const dropdown = dropdownRef.current;
    const menu = menuRef.current;
    if (!dropdown || !menu) return;
    const handleOpened = () => {
      menu
        .querySelector<HTMLElement>('mdui-menu-item[selected]')
        ?.scrollIntoView({ block: 'nearest' });
    };
    dropdown.addEventListener('opened', handleOpened);
    return () => dropdown.removeEventListener('opened', handleOpened);
  }, []);

  // 让下拉面板宽度与触发器保持一致（面板为 fixed 定位，无法用百分比跟随）
  useEffect(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const sync = () => {
      menu.style.minWidth = `${trigger.offsetWidth}px`;
      menu.style.maxWidth = 'none';
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(trigger);
    return () => ro.disconnect();
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div className={`md3-select${className ? ` ${className}` : ''}`}>
      {/* placement="auto"：下方放不下时自动翻转到上方/右侧/左侧，避免靠近视口底边被截断 */}
      <mdui-dropdown ref={dropdownRef} trigger="click" placement="auto">
        <button
          ref={triggerRef}
          type="button"
          slot="trigger"
          className="md3-select__trigger"
          aria-haspopup="listbox"
          aria-label={ariaLabel}
        >
          <span className="md3-select__value">{current?.label ?? ''}</span>
          <svg
            className="md3-select__chevron"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="M7 10l5 5 5-5z" fill="currentColor" />
          </svg>
        </button>
        <mdui-menu ref={menuRef} selects="single">
          {options.map((opt) => (
            <mdui-menu-item key={opt.value} value={opt.value}>
              {opt.label}
            </mdui-menu-item>
          ))}
        </mdui-menu>
      </mdui-dropdown>
    </div>
  );
}