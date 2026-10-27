import 'mdui/components/dialog.js';
import 'mdui/components/button.js';
import 'mdui/components/linear-progress.js';
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
  icon.className = 'reglet-dialog__icon';
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
    icon.className = 'reglet-dialog__icon';
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

export interface BusyDialog {
  /** 更新说明文字（如解析进度 3/5） */
  setDescription: (text: string) => void;
  /** 正常结束：关闭弹窗且不触发取消回调 */
  complete: () => void;
  /** 用户是否已按 Esc 或点击「取消」关闭弹窗 */
  readonly cancelled: boolean;
}

/**
 * 忙碌对话框：不确定样式的进度条 + 说明文字 + 取消按钮。
 * 用于字体解析等耗时操作：点遮罩不关闭，Esc 与「取消」可关闭；
 * 关闭后触发 onCancel，由调用方中止后续处理并丢弃未完成的数据。
 */
export function createBusyDialog(
  headline: string,
  description: string,
  cancelText: string,
  onCancel: () => void,
): BusyDialog {
  const dialog = document.createElement('mdui-dialog') as Dialog;
  dialog.closeOnOverlayClick = false;
  dialog.closeOnEsc = true;
  dialog.headline = headline;

  const body = document.createElement('div');
  body.className = 'pdf-progress';

  const bar = document.createElement('mdui-linear-progress');
  // value 保持 undefined：不确定进度样式
  const caption = document.createElement('div');
  caption.className = 'pdf-progress__caption';
  caption.textContent = description;

  body.append(bar, caption);

  const cancelBtn = document.createElement('mdui-button');
  cancelBtn.setAttribute('slot', 'action');
  cancelBtn.setAttribute('variant', 'text');
  cancelBtn.textContent = cancelText;
  cancelBtn.addEventListener('click', () => {
    dialog.open = false;
  });

  dialog.append(body, cancelBtn);

  let cancelled = false;
  let settled = false;

  dialog.addEventListener('closed', () => {
    dialog.remove();
    if (settled) return;
    settled = true;
    cancelled = true;
    onCancel();
  });

  document.body.appendChild(dialog);
  void dialog.updateComplete.then(() => {
    if (!settled) dialog.open = true;
  });

  return {
    setDescription(text: string) {
      if (cancelled) return;
      caption.textContent = text;
    },
    complete() {
      settled = true;
      dialog.open = false;
    },
    get cancelled() {
      return cancelled;
    },
  };
}