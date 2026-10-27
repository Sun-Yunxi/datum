import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n';
import Md3Select from './Md3Select';
import { showToast } from '../utils/toast';
import { createBusyDialog, showConfirmDialog, showWarningDialog } from '../utils/dialog';
import {
  FONT_ACCEPT, FONT_LOAD_TIMEOUT, MAX_BATCH_SIZE, createFontId, detectFontFormat,
  parseFontFile, withTimeout,
} from '../fonts';
import { BUILTIN_FONT_ID } from '../types';
import type { FontErrorCode } from '../fonts';
import 'mdui/components/button.js';
import 'mdui/components/button-icon.js';

const RemoveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor" />
  </svg>
);

/**
 * 「本标签页内是否已提示过批量体积警告」。
 * 仅存在于内存：刷新后重新计数；同一页面内只提示一次，不再重复弹出。
 */
let batchWarningShown = false;

/**
 * 「文字」模块的字体选择控件：字体下拉 + 拖拽/选择上传 + 隐私提示 + 已上传字体列表。
 * 自定义字体库（customFonts）全局共享，任意模块上传一次后，所有字体下拉框均可选。
 */
export default function FontSelect({
  value, onChange,
}: { value: string; onChange: (id: string) => void }) {
  const { t, i18n } = useTranslation();
  const customFonts = useStore((s) => s.customFonts);
  const addCustomFont = useStore((s) => s.addCustomFont);
  const removeCustomFont = useStore((s) => s.removeCustomFont);
  const fontLoading = useStore((s) => s.fontLoading);
  const setFontLoading = useStore((s) => s.setFontLoading);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const options = [
    { value: BUILTIN_FONT_ID, label: t('font.builtin') },
    ...customFonts.map((f) => ({ value: f.id, label: f.name })),
  ];

  const errorText = (code: string) => t(
    code === 'UNSUPPORTED_FORMAT' ? 'font.unsupportedFormat'
      : code === 'TOO_LARGE' ? 'font.tooLarge'
        : code === 'TIMEOUT' ? 'font.timeout'
          : 'font.invalid',
  );

  /**
   * 批量处理字体文件：
   * 1) 按扩展名白名单过滤（.woff2 / .ttf / .otf）；
   * 2) 总量超过 25MB 时弹出一次警告（本标签页仅一次）；
   * 3) 逐个解析，展示可取消的「字体解析中」对话框；
   * 4) 取消后不再处理尚未解析的文件，已解析的字体保留在字体库中。
   */
  const processFiles = async (fileList: FileList | File[]) => {
    if (fontLoading) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const valid = files.filter((f) => detectFontFormat(f.name) !== null);
    const skipped = files.length - valid.length;
    if (valid.length === 0) {
      showWarningDialog(t('font.errorTitle'), t('font.unsupportedFormat'));
      return;
    }

    const totalBytes = valid.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > MAX_BATCH_SIZE && !batchWarningShown) {
      batchWarningShown = true;
      const proceed = await showConfirmDialog(
        t('font.warningTitle'),
        t('font.batchWarning'),
        t('font.batchContinue'),
        t('font.batchCancel'),
      );
      if (!proceed) return;
    }

    let cancelled = false;
    const dialog = createBusyDialog(
      t('font.parsingTitle'),
      t('font.parsing')
        .replace('{done}', '0')
        .replace('{total}', String(valid.length)),
      t('font.batchCancel'),
      () => { cancelled = true; },
    );

    setFontLoading(true);
    let done = 0;
    let added = 0;
    let lastId = '';
    let firstError: FontErrorCode | 'UNSUPPORTED_FORMAT' | null =
      skipped > 0 ? 'UNSUPPORTED_FORMAT' : null;

    try {
      for (const file of valid) {
        if (cancelled) break;
        dialog.setDescription(
          t('font.parsing')
            .replace('{done}', String(done + 1))
            .replace('{total}', String(valid.length)),
        );
        try {
          // 显示名按当前 UI 语言从 name 表中解析（中文优先取中文名，避免显示内部拼音名）
          const parsed = await withTimeout(parseFontFile(file, i18n.language), FONT_LOAD_TIMEOUT);
          // 解析期间用户取消：丢弃本次结果，不写入字体库（不留下未完成的数据）
          if (cancelled) break;
          const id = createFontId();
          addCustomFont({
            id,
            name: parsed.name,
            format: parsed.format,
            size: parsed.size,
            data: parsed.data,
          });
          lastId = id;
          added += 1;
        } catch (err) {
          if (!firstError) {
            firstError = (err instanceof Error ? err.message : 'INVALID_FONT') as FontErrorCode;
          }
        }
        done += 1;
      }
    } finally {
      dialog.complete();
      setFontLoading(false);
    }

    if (added > 0) {
      // 多个字体上传后应用到当前模块的是最后一个成功解析的字体
      onChange(lastId);
      showToast(t('font.added'));
    }
    if (firstError && !cancelled) {
      showWarningDialog(t('font.errorTitle'), errorText(firstError));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    // 清空以便再次选择同一文件
    e.target.value = '';
    if (files && files.length > 0) void processFiles(files);
  };

  const hasFiles = (e: React.DragEvent) => e.dataTransfer.types.includes('Files');

  const handleDragEnter = (e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (e.dataTransfer.files.length > 0) void processFiles(e.dataTransfer.files);
  };

  return (
    <>
      <div className="element-panel__field">
        <label className="element-panel__label">{t('font.family')}</label>
        <Md3Select
          value={value}
          onChange={onChange}
          options={options}
          ariaLabel={t('font.family')}
        />
      </div>

      <div className="element-panel__field element-panel__field--upload">
        <div
          className={`element-panel__upload font-select__drop${dragging ? ' is-dragging' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="font-select__drop-text">
            <p className="font-select__privacy">{t('font.privacy')}</p>
            <p className="font-select__drop-hint">{t('font.dropHint')}</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={FONT_ACCEPT}
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <mdui-button
            variant="filled"
            className="element-panel__upload-btn"
            loading={fontLoading}
            disabled={fontLoading}
            onClick={() => fileInputRef.current?.click()}
          >
            {fontLoading ? t('font.loading') : t('font.chooseFile')}
          </mdui-button>
        </div>
      </div>

      {customFonts.length > 0 && (
        <ul className="font-select__list">
          {customFonts.map((font) => (
            <li key={font.id} className="font-select__item">
              <span className="font-select__name" title={font.name}>{font.name}</span>
              <span className="font-select__meta">
                {font.format.toUpperCase()} · {(font.size / 1048576).toFixed(1)}MB
              </span>
              <mdui-button-icon
                className="font-select__remove"
                aria-label={t('font.remove')}
                title={t('font.remove')}
                onClick={() => removeCustomFont(font.id)}
              >
                <RemoveIcon />
              </mdui-button-icon>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
