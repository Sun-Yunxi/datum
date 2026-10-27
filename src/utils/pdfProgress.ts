import 'mdui/components/dialog.js';
import 'mdui/components/button.js';
import 'mdui/components/linear-progress.js';
import type { Dialog } from 'mdui/components/dialog.js';
import type { LinearProgress } from 'mdui/components/linear-progress.js';

/** 下载阶段进度上限：达到该值即视为下载完成，切换为「生成中」 */
const DOWNLOAD_MAX = 90;

export interface PdfProgressTexts {
  title: string;
  /** 下载阶段文案，支持 {percent} 与 {speed} 占位符 */
  downloading: string;
  /** 无法获知总大小时的下载文案（不带数字） */
  downloadingUnknown: string;
  /** 生成阶段文案（不带百分比，进度条为不确定样式） */
  generating: string;
  /** 下载内容与服务器不一致时的提示文案 */
  integrity: string;
  cancel: string;
}

export interface PdfProgressDialog {
  /** 更新下载进度；total 为 0（无法获知总大小）时进度条为不确定状态 */
  setDownload: (loaded: number, total: number, speed: number) => void;
  /** 无法统计字节进度（无受控 Service Worker）：进度条保持不确定状态，文案不带数字 */
  setUnmetered: () => void;
  /** 下载完成（或无需下载），进入生成阶段：进度条切换为不确定样式，文案为「生成中」 */
  setGenerating: () => void;
  /** 下载内容与服务器不一致：进度条归零并在下方显示提示文字（弹窗保持打开） */
  setFailed: (message: string) => void;
  /** 正常结束：关闭弹窗且不触发取消回调 */
  complete: () => void;
  /** 用户是否已通过 Esc 或取消按钮关闭弹窗 */
  readonly cancelled: boolean;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.max(0, Math.round(bytes))} B`;
}

function formatSpeed(bytesPerSecond: number): string {
  const value = Math.max(0, bytesPerSecond);
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB/s`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB/s`;
  return `${Math.round(value)} B/s`;
}

/**
 * PDF 导出进度弹窗：mdui-dialog + mdui-linear-progress。
 * 下载阶段为确定进度（0–90%），达到上限后切换为不确定进度的「生成中」；
 * 若生成资源已在内存中，则直接以「生成中」样式展示（不显示百分比）。
 * 点击遮罩不关闭；Esc 与「取消」按钮关闭，关闭即视为取消并触发 onCancel。
 * 关闭后自动从 DOM 移除，未完成的数据由调用方在 onCancel 中清理。
 */
export function createPdfProgressDialog(
  texts: PdfProgressTexts,
  onCancel: () => void,
): PdfProgressDialog {
  const dialog = document.createElement('mdui-dialog') as Dialog;
  dialog.closeOnOverlayClick = false;
  dialog.closeOnEsc = true;
  dialog.headline = texts.title;

  const body = document.createElement('div');
  body.className = 'pdf-progress';

  const bar = document.createElement('mdui-linear-progress') as LinearProgress;
  bar.max = 100;
  // 下载阶段为「确定的进度」样式：从 0 开始
  bar.value = 0;

  const caption = document.createElement('div');
  caption.className = 'pdf-progress__caption';
  // 初始文案：此时尚未收到任何进度
  caption.textContent = texts.downloading
    .replace('{percent}', '0%')
    .replace('{speed}', formatSpeed(0));

  body.append(bar, caption);

  const cancelBtn = document.createElement('mdui-button');
  cancelBtn.setAttribute('slot', 'action');
  cancelBtn.setAttribute('variant', 'text');
  cancelBtn.textContent = texts.cancel;
  cancelBtn.addEventListener('click', () => {
    dialog.open = false;
  });

  dialog.append(body, cancelBtn);

  let cancelled = false;
  let settled = false;
  let generating = false;
  let failed = false;

  /** 进入生成阶段：进度条切换为不确定（默认）样式，文案不再带百分比 */
  const enterGenerating = () => {
    if (generating) return;
    generating = true;
    bar.value = undefined;
    caption.textContent = texts.generating;
  };

  dialog.addEventListener('closed', () => {
    dialog.remove();
    if (settled) return;
    settled = true;
    cancelled = true;
    onCancel();
  });

  document.body.appendChild(dialog);
  // 与既有对话框一致：等首次渲染完成后再打开，保留进场动画
  void dialog.updateComplete.then(() => {
    // 极端情况下导出可能在首帧渲染前就失败/被取消，避免结束后又弹出
    if (!settled) dialog.open = true;
  });

  return {
    setDownload(loaded, total, speed) {
      if (cancelled || generating || failed) return;
      const speedText = formatSpeed(speed);
      if (total > 0) {
        const percent = Math.min(DOWNLOAD_MAX, (loaded / total) * 100);
        // 下载进度达到上限即视为完成：立刻切到「生成中」，不再显示下载文案
        if (percent >= DOWNLOAD_MAX) {
          enterGenerating();
          return;
        }
        bar.value = percent;
        caption.textContent = texts.downloading
          .replace('{percent}', `${Math.round(percent)}%`)
          .replace('{speed}', speedText);
      } else {
        // 无法获知总大小时保持不确定状态，文字改为已下载体积
        bar.value = undefined;
        caption.textContent = texts.downloading
          .replace('{percent}', formatSize(loaded))
          .replace('{speed}', speedText);
      }
    },
    setUnmetered() {
      if (cancelled || generating || failed) return;
      bar.value = undefined;
      caption.textContent = texts.downloadingUnknown;
    },
    setGenerating() {
      if (cancelled || failed) return;
      enterGenerating();
    },
    setFailed(message) {
      if (cancelled || settled) return;
      failed = true;
      generating = false;
      // 需求：不弹额外警告，只把进度条归零并在下方显示提示
      bar.value = 0;
      caption.textContent = message;
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
