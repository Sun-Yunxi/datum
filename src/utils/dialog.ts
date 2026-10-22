import 'mdui/components/dialog.js';
import 'mdui/components/button.js';
import type { Dialog } from 'mdui/components/dialog.js';
import '@mdui/icons/warning.js';

/**
 * 警告对话框：mdui-dialog + @mdui/icons 的 warning 图标。
 * 含标题与描述；可通过点击遮罩或按 Esc 关闭，不提供关闭按钮。
 * 关闭后自动从 DOM 移除。
 *
 * `open` 必须等首次渲染完成后再设置，否则该变更会并入首次更新，mdui 会把进场
 * 动画时长置为 0（弹窗瞬间出现，没有缩放/淡入动画）。因此在 `updateComplete`
 * 之后再打开。
 */
export function showWarningDialog(headline: string, description: string) {
  const dialog = document.createElement('mdui-dialog') as Dialog;
  dialog.closeOnOverlayClick = true;
  dialog.closeOnEsc = true;
  dialog.headline = headline;
  dialog.description = description;

  const icon = document.createElement('mdui-icon-warning');
  icon.setAttribute('slot', 'icon');
  icon.className = 'datum-dialog__icon';
  dialog.appendChild(icon);

  dialog.addEventListener('closed', () => dialog.remove());
  document.body.appendChild(dialog);
  void dialog.updateComplete.then(() => {
    dialog.open = true;
  });
}

/**
 * 二次确认对话框：与警告对话框同一视觉体系（mdui-dialog + warning 图标 + headline/description），
 * 额外提供「取消 / 确认」两个动作按钮。返回用户选择：确认 true，取消/点击遮罩/Esc 为 false。
 * 同样需等首次渲染完成（updateComplete）后再置 open，以保留进场动画。
 */
export function showConfirmDialog(
  headline: string,
  description: string,
  confirmText: string,
  cancelText: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement('mdui-dialog') as Dialog;
    dialog.closeOnOverlayClick = true;
    dialog.closeOnEsc = true;
    dialog.headline = headline;
    dialog.description = description;

    const icon = document.createElement('mdui-icon-warning');
    icon.setAttribute('slot', 'icon');
    icon.className = 'datum-dialog__icon';
    dialog.appendChild(icon);

    let confirmed = false;

    const cancelBtn = document.createElement('mdui-button');
    cancelBtn.setAttribute('slot', 'action');
    cancelBtn.setAttribute('variant', 'text');
    cancelBtn.textContent = cancelText;
    cancelBtn.addEventListener('click', () => { confirmed = false; dialog.open = false; });

    const confirmBtn = document.createElement('mdui-button');
    confirmBtn.setAttribute('slot', 'action');
    confirmBtn.setAttribute('variant', 'filled');
    confirmBtn.textContent = confirmText;
    confirmBtn.addEventListener('click', () => { confirmed = true; dialog.open = false; });

    dialog.appendChild(cancelBtn);
    dialog.appendChild(confirmBtn);

    dialog.addEventListener('closed', () => {
      dialog.remove();
      resolve(confirmed);
    });
    document.body.appendChild(dialog);
    void dialog.updateComplete.then(() => {
      dialog.open = true;
    });
  });
}