import type { CustomFont, ElementInstance, TextSettings } from '../types';
import { BUILTIN_FONT_ID } from '../types';
import { arrayBufferToBase64 } from '../fonts';

/** 内置字体可用的四种字形：常规 / 加粗 / 斜体 / 加粗斜体 */
export type SarasaStyle = 'regular' | 'bold' | 'italic' | 'bolditalic';

/**
 * 内置 PDF 字体资源（Sarasa UI SC / 更纱黑体）。
 * 界面使用系统字体，不加载任何 Web 字体；这些文件只在导出 PDF 实际用到对应字形时才下载，
 * 之后由 Service Worker 的字体缓存复用。
 *
 * - `SarasaUiSC-Oblique.ttf` 由 Regular 字形斜切（9.4°，与 BoldItalic 一致）生成，
 *   Sarasa UI SC 没有独立的 Regular Italic，因此「只选斜体」时倾斜 Regular；
 *   它是衍生物，仍按 OFL 1.1 随 `LICENSE-Sarasa.txt` 分发。
 */
const SARASA_URLS: Record<SarasaStyle, string> = {
  regular: new URL('../Sarasa/SarasaUiSC-Regular.ttf', import.meta.url).href,
  bold: new URL('../Sarasa/SarasaUiSC-Bold.ttf', import.meta.url).href,
  italic: new URL('../Sarasa/SarasaUiSC-Oblique.ttf', import.meta.url).href,
  bolditalic: new URL('../Sarasa/SarasaUiSC-BoldItalic.ttf', import.meta.url).href,
};

/**
 * 该「文字」模块当前模式是否真的会绘制文字。
 * 空标题、空文字或重复次数为 0 时不会产生任何文字节点，也就无需下载字体。
 */
function producesText(ts: TextSettings): boolean {
  switch (ts.mode) {
    case 'title':
      return ts.title.text.length > 0;
    case 'singleText':
      return ts.single.text.length > 0 && ts.single.repeatCount > 0;
    case 'pageNumber':
    default:
      return true;
  }
}

/**
 * 是否有启用的「文字」模块使用内置字体，以及需要哪几种字形。
 * 未选择字体、明确选择内置字体、或所选自定义字体已失效（会回退内置）都算使用内置字体。
 * 返回空数组表示本次导出完全不需要内置字体，也就不下载任何字体文件。
 */
export function neededBuiltinStyles(
  elements: ElementInstance[],
  customFonts: CustomFont[],
): SarasaStyle[] {
  const available = new Set(customFonts.map((f) => f.id));
  const styles = new Set<SarasaStyle>();
  for (const el of elements) {
    if (el.type !== 'text' || !el.settings.enabled) continue;
    const ts = el.settings as TextSettings;
    const isBuiltin = !ts.fontId || ts.fontId === BUILTIN_FONT_ID || !available.has(ts.fontId);
    if (!isBuiltin || !producesText(ts)) continue;
    styles.add('regular');
    if (ts.bold && ts.italic) styles.add('bolditalic');
    else if (ts.bold) styles.add('bold');
    else if (ts.italic) styles.add('italic');
  }
  return [...styles];
}

const base64Cache = new Map<SarasaStyle, Promise<string>>();

function abortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

/**
 * 惰性加载指定字形的内置字体并转成 pdfmake 需要的 base64。
 * 每种字形各自缓存一个共享 Promise，导出流程可以在加载生成模块的同时并行预取；
 * 取消或失败时清空该字形的缓存，下一次导出可以重新尝试，不会留下半成品。
 */
export function loadSarasaBase64(style: SarasaStyle = 'regular', signal?: AbortSignal): Promise<string> {
  if (signal?.aborted) return Promise.reject(abortError());

  let promise = base64Cache.get(style);
  if (!promise) {
    promise = fetch(SARASA_URLS[style], signal ? { signal } : undefined)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load built-in font (${style}): ${res.status}`);
        const declared = Number(res.headers.get('Content-Length') || 0);
        const encoded = !!res.headers.get('Content-Encoding');
        return res.arrayBuffer().then((buffer) => {
          // 长度一致性校验：只对未压缩响应比较，压缩响应的 Content-Length 是压缩后大小
          if (declared > 0 && !encoded && buffer.byteLength !== declared) {
            throw new Error('Built-in font integrity check failed');
          }
          return arrayBufferToBase64(buffer);
        });
      })
      .catch((err) => {
        base64Cache.delete(style);
        throw err;
      });
    base64Cache.set(style, promise);
  }
  return promise;
}

/** 该字形是否已在内存中（已加载或正在加载） */
export function isSarasaLoaded(style: SarasaStyle = 'regular') {
  return base64Cache.has(style);
}

/** 取消导出后丢弃未完成的字体数据，避免半成品在下次导出被复用 */
export function resetSarasaCache() {
  base64Cache.clear();
}
