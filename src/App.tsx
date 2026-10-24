import { useTranslation } from './i18n';
import { useStore } from './store/useStore';
import PaperSettings from './components/PaperSettings';
import ElementPanel from './components/ElementPanel';
import PresetTemplates from './components/PresetTemplates';
import Md3Toggle from './components/Md3Toggle';
import { showToast } from './utils/toast';
import { showConfirmDialog } from './utils/dialog';
import 'mdui/components/button.js';
import './App.css';
import type { Language, TextSettings } from './types';

/** 把图形对象数格式化为科学计数法（如 250000 → "2.5×10⁵"），用于密度拦截文案 */
function toScientific(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return String(n);
  const exp = Math.floor(Math.log10(n));
  const mantissa = n / 10 ** exp;
  const sup = String(exp).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]);
  return `${mantissa.toFixed(1)}×10${sup}`;
}

function App() {
  const { t, i18n } = useTranslation();
  const paperSettings = useStore((s) => s.paperSettings);
  const elements = useStore((s) => s.elements);
  const isGenerating = useStore((s) => s.isGenerating);
  const setIsGenerating = useStore((s) => s.setIsGenerating);
  const setLanguage = useStore((s) => s.setLanguage);
  const customFonts = useStore((s) => s.customFonts);
  const fontLoading = useStore((s) => s.fontLoading);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // 动态导入：pdfmake（含字体 VFS，约 1.9MB）与 qrcode 仅在导出时加载，
      // 避免其进入首屏包、也不再常驻内存
      const { generatePDF, openPDFInNewTab, estimateDrawPrimitives, SAFE_THRESHOLD } =
        await import('./pdf/generator');

      // 导出前复杂度预估：超大范围 + 极小间距会生成海量图形对象，先弹窗二次确认，
      // 避免构建 docDefinition 时主线程长时间无响应甚至崩溃
      const estimate = estimateDrawPrimitives(paperSettings, elements);
      if (estimate > SAFE_THRESHOLD) {
        const proceed = await showConfirmDialog(
          t('density.title'),
          t('density.message').replace('{count}', toScientific(estimate)),
          t('density.confirm'),
          t('density.cancel'),
        );
        if (!proceed) return;
      }

      // 只注册各「文字」模块实际选用的自定义字体
      const usedFontIds = new Set(
        elements
          .filter((el) => el.type === 'text')
          .map((el) => (el.settings as TextSettings).fontId),
      );
      const usedFonts = customFonts.filter((f) => usedFontIds.has(f.id));
      const { blob, fontFallback } = await generatePDF(
        paperSettings, elements, i18n.language as Language, usedFonts,
      );
      if (fontFallback) showToast(t('font.fallback'));
      const newWindow = openPDFInNewTab(blob);
      if (!newWindow) {
        alert(t('app.popupBlocked'));
      }
    } catch (err: any) {
      alert(t('app.error') + '\n\n' + (err.message || ''));
    } finally {
      setIsGenerating(false);
    }
  };

  const changeLanguage = (lang: Language) => {
    i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1>{t('app.title')}</h1>
        <div className="app__header-actions">
          <Md3Toggle
            size="small"
            options={[
              { value: 'en', label: 'EN' },
              { value: 'zh-hans', label: '中' },
            ]}
            value={i18n.language}
            onChange={(v) => changeLanguage(v as Language)}
          />
          <mdui-button
            variant="filled"
            className="app__download"
            onClick={handleDownload}
            loading={fontLoading}
            disabled={isGenerating || fontLoading}
          >
            {fontLoading ? t('font.loading') : isGenerating ? t('app.generating') : t('app.pdfDownload')}
          </mdui-button>
        </div>
      </header>

      <main className="app__main">
        <aside className="app__sidebar">
          <PresetTemplates />
          <PaperSettings />
          <ElementPanel />
        </aside>
      </main>

      <footer className="app__footer">
        <div className="app__footer-brand">
          <img
            className="app__footer-logo"
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt=""
            aria-hidden="true"
          />
          <span className="app__footer-name">Datum</span>
          <span className="app__footer-version">{t('about.version')}</span>
        </div>
        <ul className="app__footer-meta">
          <li>{t('about.stack')}</li>
          <li>{t('about.ui')}</li>
          <li>{t('about.font')}</li>
          <li>{t('about.license')}</li>
          <li>{t('about.fontLicense')}</li>
        </ul>
      </footer>
    </div>
  );
}

export default App;