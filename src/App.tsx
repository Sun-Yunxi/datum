import { useTranslation } from './i18n';
import { useStore } from './store/useStore';
import PaperSettings from './components/PaperSettings';
import ElementPanel from './components/ElementPanel';
import PresetTemplates from './components/PresetTemplates';
import Md3Toggle from './components/Md3Toggle';
import { showToast } from './utils/toast';
import { showConfirmDialog } from './utils/dialog';
import { createPdfProgressDialog } from './utils/pdfProgress';
import { SAFE_THRESHOLD, estimateDrawPrimitives } from './pdf/estimate';
import { hasQRCodeElement, isPdfGeneratorLoaded, loadPdfAssets } from './pdf/loader';
import { isSarasaLoaded, neededBuiltinStyles, resetSarasaCache } from './pdf/sarasa';
import { startDownloadTracking } from './pwa/tracking';
import type { DownloadTracking } from './pwa/tracking';
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
    // 导出前复杂度预估：超大范围 + 极小间距会生成海量图形对象，先弹窗二次确认，
    // 避免构建 docDefinition 时主线程长时间无响应甚至崩溃。
    // 该判断不依赖生成模块，因此可以放在下载之前。
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

    setIsGenerating(true);

    // 只注册各「文字」模块实际选用的自定义字体（未启用的模块不会产生文字，无需注册）
    const usedFontIds = new Set(
      elements
        .filter((el) => el.type === 'text' && el.settings.enabled)
        .map((el) => (el.settings as TextSettings).fontId),
    );
    const usedFonts = customFonts.filter((f) => usedFontIds.has(f.id));
    // 没有任何模块使用内置字体时为空数组（不下载字体）；否则只列出本次实际用到的字形
    const builtinFontStyles = neededBuiltinStyles(elements, usedFonts);

    const controller = new AbortController();
    // 生成模块与（本次用到的）字体都已在内存时无需下载等待，但依旧展示进度弹窗（直接为「生成中」样式）
    const needsDownload =
      !isPdfGeneratorLoaded() || builtinFontStyles.some((style) => !isSarasaLoaded(style));
    let downloadPhase = needsDownload;
    let integrityMessage = '';
    let keepDialogOpen = false;
    let tracking: DownloadTracking | null = null;

    const dialog = createPdfProgressDialog(
      {
        title: t('pdf.progress.title'),
        downloading: t('pdf.progress.downloading'),
        downloadingUnknown: t('pdf.progress.downloadingUnknown'),
        generating: t('pdf.progress.generating'),
        integrity: t('pdf.progress.integrity'),
        cancel: t('pdf.progress.cancel'),
      },
      () => {
        if (!downloadPhase) return;
        // 中止进行中的模块/字体下载，并丢弃未完成的字体数据
        tracking?.cancel();
        resetSarasaCache();
        controller.abort();
      },
    );

    if (!needsDownload) {
      // 资源已在内存：不显示百分比，只保留不确定进度的「生成中」
      dialog.setGenerating();
    } else {
      try {
        tracking = startDownloadTracking({
          onProgress: ({ loaded, total, speed }) => dialog.setDownload(loaded, total, speed),
          onIntegrityError: (message) => { integrityMessage = message; },
        });
      } catch {
        // Worker 已失联（例如 SW 刚被更新）：退化为不确定进度，不影响导出
        tracking = null;
      }
      // 无受控 Worker（首次访问尚未接管）时无法统计字节，只显示状态文案
      if (!tracking) dialog.setUnmetered();
    }

    try {
      // 等 Worker 登记完成再开始下载，避免首批请求漏统计
      await tracking?.ready;

      // 字体与生成模块并行下载；qrcode 仅在存在二维码模块时加载
      const { generator, qrCreate } = await loadPdfAssets({
        signal: controller.signal,
        needQR: hasQRCodeElement(elements),
        builtinFontStyles,
      });

      downloadPhase = false;
      tracking?.finish();
      tracking = null;
      dialog.setGenerating();

      const { blob, fontFallback } = await generator.generatePDF(
        paperSettings, elements, i18n.language as Language, usedFonts, qrCreate,
      );
      // 生成期间用户取消了导出：丢弃结果，不打开新窗口
      if (dialog.cancelled) return;
      if (fontFallback) showToast(t('font.fallback'));
      const newWindow = generator.openPDFInNewTab(blob);
      if (!newWindow) {
        alert(t('app.popupBlocked'));
      }
    } catch (err: any) {
      if (dialog.cancelled) return;
      if (integrityMessage) {
        // 不再弹出额外警告：把进度条归零并在弹窗内给出提示
        dialog.setFailed(t('pdf.progress.integrity'));
        keepDialogOpen = true;
      } else {
        alert(t('app.error') + '\n\n' + (err.message || ''));
      }
    } finally {
      tracking?.finish();
      if (!keepDialogOpen) dialog.complete();
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
          <span className="app__footer-name">Reglet</span>
          <span className="app__footer-version">{t('about.version')}</span>
        </div>
        <ul className="app__footer-meta">
          <li>{t('about.stack')}</li>
          <li>{t('about.ui')}</li>
          <li>{t('about.font')}</li>
          <li>{t('about.license')}</li>
          <li>{t('about.fontLicense')}</li>
        </ul>
        <p className="app__footer-note">{t('about.fontNote')}</p>
      </footer>
    </div>
  );
}

export default App;