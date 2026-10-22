import 'mdui/components/snackbar.js';
import type { Snackbar } from 'mdui/components/snackbar.js';

/**
 * 轻量消息提示：动态插入 mdui-snackbar，关闭后自动移除。
 *
 * `open` 必须等组件首次渲染完成后再设置：mdui 的 onOpenChange 会先捕获
 * `hasUpdated`，再用 `duration: hasUpdated ? duration : 0` 决定进场动画时长。
 * 若插入后同步设置 `open`，该变更会并入首次更新，此时 `hasUpdated` 仍为 false，
 * 动画时长被置为 0（表现为突然出现、无淡入淡出）。因此在 `updateComplete` 之后再打开。
 */
export function showToast(message: string) {
  const snackbar = document.createElement('mdui-snackbar') as Snackbar;
  snackbar.placement = 'bottom';
  snackbar.textContent = message;
  snackbar.addEventListener('closed', () => snackbar.remove());
  document.body.appendChild(snackbar);
  void snackbar.updateComplete.then(() => {
    snackbar.open = true;
  });
}