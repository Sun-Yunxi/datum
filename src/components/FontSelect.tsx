import { useRef } from 'react';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n';
import Md3Select from './Md3Select';
import { showToast } from '../utils/toast';
import { showWarningDialog } from '../utils/dialog';
import {
  FONT_ACCEPT, FONT_LOAD_TIMEOUT, createFontId, parseFontFile, withTimeout,
} from '../fonts';
import { BUILTIN_FONT_ID } from '../types';
import 'mdui/components/button.js';
import 'mdui/components/button-icon.js';

const RemoveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor" />
  </svg>
);

/**
 * 「文字」模块的字体选择控件：字体下拉 + 选择文件 + 隐私提示 + 已上传字体列表。
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

  const options = [
    { value: BUILTIN_FONT_ID, label: t('font.builtin') },
    ...customFonts.map((f) => ({ value: f.id, label: f.name })),
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 清空以便再次选择同一文件
    e.target.value = '';
    if (!file) return;

    setFontLoading(true);
    try {
      // 浏览器端预检：格式 / 体积 / 字体合法性与 CMAP 校验，失败时立即提示
      // 显示名按当前 UI 语言从 name 表中解析（中文优先取中文名，避免显示内部拼音名）
      const parsed = await withTimeout(parseFontFile(file, i18n.language), FONT_LOAD_TIMEOUT);
      const id = createFontId();
      addCustomFont({
        id,
        name: parsed.name,
        format: parsed.format,
        size: parsed.size,
        data: parsed.data,
      });
      // 上传后自动应用在当前模块
      onChange(id);
      showToast(t('font.added'));
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      showWarningDialog(t('font.errorTitle'), t(
        code === 'UNSUPPORTED_FORMAT' ? 'font.unsupportedFormat'
          : code === 'TOO_LARGE' ? 'font.tooLarge'
            : code === 'TIMEOUT' ? 'font.timeout'
              : 'font.invalid',
      ));
    } finally {
      setFontLoading(false);
    }
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
        <div className="element-panel__upload">
          <p className="font-select__privacy">{t('font.privacy')}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept={FONT_ACCEPT}
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
