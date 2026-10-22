import type { ReactNode } from 'react';

interface Md3CollapseProps {
  open: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * 高度自适应折叠容器：grid-template-rows 0fr → 1fr 实现平滑展开/收起。
 * 收起时通过 inert 让内部控件移出可交互与可聚焦范围。
 */
export default function Md3Collapse({ open, children, className }: Md3CollapseProps) {
  return (
    <div className={`md3-collapse${open ? ' md3-collapse--open' : ''}${className ? ` ${className}` : ''}`}>
      <div className="md3-collapse__inner" inert={!open}>
        {children}
      </div>
    </div>
  );
}