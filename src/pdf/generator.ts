import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import QRCode from 'qrcode';
import type {
  PaperSettings, ElementInstance, ElementSettings, IntervalLineSettings, DiagonalSettings, DotSettings,
  SingleLineSettings, BlockSettings, CircleSettings,
  QRCodeSettings, WatermarkSettings, TextSettings, PageNumberStyle, Language, CustomFont,
} from '../types';
import { getPaperSize } from '../store/useStore';
import { BUILTIN_FONT_ID } from '../types';
import { arrayBufferToBase64 } from '../fonts';

/** Bake opacity into image data URL using canvas (pdfmake doesn't support opacity on content images) */
function applyImageOpacity(dataUrl: string, opacity: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.globalAlpha = opacity / 100;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

// Initialize pdfmake fonts (本模块经动态 import 按需加载，此处仅执行一次)
pdfMake.addVirtualFileSystem(pdfFonts);

/** 内置 MiSans：与界面 @font-face 引用同一资源文件，浏览器可复用缓存 */
const MISANS_FAMILY = 'MiSans';
const MISANS_URL = new URL('../MiSans/woff2/MiSans-Normal.woff2', import.meta.url).href;

let misansBase64Promise: Promise<string> | null = null;

/** 惰性加载内置 MiSans 字体（导出时才拉取，失败后允许重试） */
function loadBuiltinFontBase64(): Promise<string> {
  if (!misansBase64Promise) {
    misansBase64Promise = fetch(MISANS_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load built-in font: ${res.status}`);
        return res.arrayBuffer();
      })
      .then(arrayBufferToBase64)
      .catch((err) => {
        misansBase64Promise = null;
        throw err;
      });
  }
  return misansBase64Promise;
}

/** 把字体注册进 pdfmake：先写入虚拟文件系统，再声明字体族 */
function registerFont(family: string, base64: string) {
  const file = `datum-${family.replace(/[^a-zA-Z0-9]+/g, '-')}.bin`;
  pdfMake.addVirtualFileSystem({ [file]: base64 });
  pdfMake.addFonts({ [family]: { normal: file } });
}

/** 自定义字体在 pdfmake 中的字体族名（用 id 生成，避免字体族同名覆盖） */
function customFamilyOf(fontId: string) {
  return `Datum-${fontId}`;
}

/** 导出失败时把所有文本节点强制回退到内置字体 */
function forceBuiltinFont(node: any) {
  if (Array.isArray(node)) {
    node.forEach(forceBuiltinFont);
    return;
  }
  if (node && typeof node === 'object') {
    if ('font' in node) node.font = MISANS_FAMILY;
    for (const key of Object.keys(node)) forceBuiltinFont(node[key]);
  }
}

export interface PDFResult {
  blob: Blob;
  /** 自定义字体加载失败并自动回退到 MiSans 时为 true */
  fontFallback: boolean;
}

// Maximum grid density check
const MAX_LINES_PER_CM2 = 100;

// 页码距页面边缘的固定距离 (mm)
const PAGE_NUMBER_EDGE_MM = 5;

function getPaperDimensions(settings: PaperSettings): { width: number; height: number } {
  return getPaperSize(settings);
}

function mmToPt(mm: number): number {
  return mm * 2.83465;
}

/** 绘制矩形外框（实线/虚线），外框样式为「无」时由调用方跳过 */
function pushFrame(
  out: any[], x: number, y: number, w: number, h: number,
  lineWidth: number, color: string, dashed: boolean, dashGapPt: number,
) {
  if (lineWidth <= 0) return;
  const dash = dashed ? { dash: { length: 3, space: dashGapPt } } : undefined;
  out.push(
    { type: 'line', x1: x, y1: y, x2: x + w, y2: y, lineWidth, lineColor: color, ...dash },
    { type: 'line', x1: x, y1: y + h, x2: x + w, y2: y + h, lineWidth, lineColor: color, ...dash },
    { type: 'line', x1: x, y1: y, x2: x, y2: y + h, lineWidth, lineColor: color, ...dash },
    { type: 'line', x1: x + w, y1: y, x2: x + w, y2: y + h, lineWidth, lineColor: color, ...dash },
  );
}

/**
 * 在矩形 [x, x+w] × [y, y+h] 内绘制一族等间距斜线。
 * step 为相邻斜线在水平方向的间距（pt）；dir 决定斜率方向。
 * 通过解析求交点做裁剪：既不越出范围（不无视留白），也不缺失四角。
 */
function pushDiagonalLines(
  out: any[], x: number, y: number, w: number, h: number,
  step: number, dir: 'tlbr' | 'trbl',
  lineWidth: number, color: string, dash: any,
) {
  if (step <= 0) return;
  const isTlbr = dir === 'tlbr';
  const start = isTlbr ? -h : 0;
  const end = isTlbr ? w : w + h;
  for (let p = start; p <= end; p += step) {
    const pts: [number, number][] = [];
    // 上边 v=0
    if (p >= 0 && p <= w) pts.push([x + p, y]);
    // 下边 v=h
    const bottomU = isTlbr ? p + h : p - h;
    if (bottomU >= 0 && bottomU <= w) pts.push([x + bottomU, y + h]);
    // 左边 u=0
    const leftV = isTlbr ? -p : p;
    if (leftV >= 0 && leftV <= h) pts.push([x, y + leftV]);
    // 右边 u=w
    const rightV = isTlbr ? w - p : p - w;
    if (rightV >= 0 && rightV <= h) pts.push([x + w, y + rightV]);

    if (pts.length < 2) continue;
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const p1 = pts[0];
    const p2 = pts[pts.length - 1];
    if (p1[0] === p2[0] && p1[1] === p2[1]) continue;
    out.push({ type: 'line', x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], lineWidth, lineColor: color, ...dash });
  }
}

/** 阿拉伯数字转罗马数字（页码样式之一） */
function toRoman(num: number): string {
  if (!Number.isFinite(num) || num <= 0) return String(num);
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let n = Math.floor(num);
  let out = '';
  for (const [value, symbol] of table) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return out;
}

/** 按样式格式化页码文本 */
function formatPageNumber(n: number, total: number, style: PageNumberStyle, lang: Language): string {
  switch (style) {
    case 'pageX':
      return lang === 'en' ? `Page ${n}` : `第 ${n} 页`;
    case 'xOfY':
      return `${n} - ${total}`;
    case 'roman':
      return toRoman(n);
    case 'number':
    default:
      return String(n);
  }
}

function checkDensity(_settings: PaperSettings, elements: ElementInstance[]): string | null {
  for (const el of elements) {
    const s = el.settings;
    if (!s.enabled) continue;

    if (el.type === 'intervalLine' || el.type === 'diagonal') {
      const ls = s as IntervalLineSettings | DiagonalSettings;
      if (ls.spacing < 0.1 && ls.spacing > 0) {
        const linesPerCm2 = 1 / (ls.spacing / 10);
        if (linesPerCm2 > MAX_LINES_PER_CM2) {
          return `Grid density too high: ${Math.round(linesPerCm2)} lines/cm² exceeds limit of ${MAX_LINES_PER_CM2}. Please increase spacing.`;
        }
      }
    }
    if (el.type === 'dot') {
      const ds = s as DotSettings;
      const spH = ds.horizontalSpacing > 0 ? ds.horizontalSpacing : 1;
      const spV = ds.verticalSpacing > 0 ? ds.verticalSpacing : 1;
      const dotsPerCm2 = (10 / spH) * (10 / spV);
      if (dotsPerCm2 > MAX_LINES_PER_CM2) {
        return `Dot density too high: ${Math.round(dotsPerCm2)} dots/cm² exceeds limit of ${MAX_LINES_PER_CM2}. Please increase spacing.`;
      }
    }
  }
  return null;
}

/** 导出前二次确认的图形对象数安全阈值（超过则弹窗确认，可按实测调整） */
export const SAFE_THRESHOLD = 200000;

/**
 * 粗略预估本次导出将生成的图形对象数量，用于拦截「超大范围 + 极小间距」组合，
 * 避免构建 docDefinition 时产生海量对象导致主线程长时间无响应甚至崩溃。
 */
export function estimateDrawPrimitives(settings: PaperSettings, elements: ElementInstance[]): number {
  const paper = getPaperDimensions(settings);
  let total = 0;
  for (const el of elements) {
    const s = el.settings;
    if (!s.enabled) continue;
    const rw = (s as IntervalLineSettings).rangeWidth || paper.width;
    const rh = (s as IntervalLineSettings).rangeHeight || paper.height;
    const w = Math.min(rw, paper.width);
    const h = Math.min(rh, paper.height);
    switch (el.type) {
      case 'intervalLine': {
        const ls = s as IntervalLineSettings;
        const sp = ls.spacing > 0 ? ls.spacing : 1;
        total += (ls.direction === 'horizontal' ? h / sp : w / sp) + 1;
        if (ls.frameStyle !== 'none') total += 4;
        break;
      }
      case 'diagonal': {
        const ds = s as DiagonalSettings;
        const sp = ds.spacing > 0 ? ds.spacing : 1;
        const dirs = ds.direction === 'both' ? 2 : 1;
        total += (dirs * (w + h)) / sp;
        if (ds.frameStyle !== 'none') total += 4;
        break;
      }
      case 'dot': {
        const ds = s as DotSettings;
        const sw = ds.horizontalSpacing > 0 ? ds.horizontalSpacing : 1;
        const sh = ds.verticalSpacing > 0 ? ds.verticalSpacing : 1;
        total += (w / sw) * (h / sh);
        break;
      }
      default:
        total += 1;
    }
  }
  return total * Math.max(1, settings.copies);
}

export function generatePDF(
  settings: PaperSettings,
  elements: ElementInstance[],
  language: Language = 'zh-hans',
  customFonts: CustomFont[] = [],
): Promise<PDFResult> {
  return new Promise(async (resolve, reject) => {
    try {
      const densityError = checkDensity(settings, elements);
      if (densityError) {
        reject(new Error(densityError));
        return;
      }

      // 由各「文字」模块的 fontId 解析实际字体族名（缺失/非法一律回退内置 MiSans）
      const customById = new Map(customFonts.map((f) => [f.id, f]));
      const familyOf = (fontId?: string) =>
        fontId && fontId !== BUILTIN_FONT_ID && customById.has(fontId)
          ? customFamilyOf(fontId)
          : MISANS_FAMILY;

      const paper = getPaperDimensions(settings);
      const pageWidth = mmToPt(paper.width);
      const pageHeight = mmToPt(paper.height);

      const marginL = mmToPt(settings.marginLeft);
      const marginT = mmToPt(settings.marginTop);
      const marginR = mmToPt(settings.marginRight);
      const marginB = mmToPt(settings.marginBottom);
      const marginLEven = mmToPt(settings.marginLeftEven);
      const marginTEven = mmToPt(settings.marginTopEven);
      const marginREven = mmToPt(settings.marginRightEven);
      const marginBEven = mmToPt(settings.marginBottomEven);

      // Pre-process watermark images (bake opacity)
      const processedWMs = new Map<string, string>();
      for (const el of elements) {
        if (el.type !== 'watermark') continue;
        const ws = el.settings as WatermarkSettings;
        if (!ws.enabled || !ws.imageData) continue;
        if (!processedWMs.has(el.id)) {
          processedWMs.set(el.id, await applyImageOpacity(ws.imageData, ws.opacity));
        }
      }

      // Build content with copies + per-page watermarks
      const content: any[] = [];
      for (let copy = 0; copy < settings.copies; copy++) {
        if (copy > 0) {
          content.push({ text: '', pageBreak: 'before' });
        }

        const pageNum = copy + 1;
        const isOdd = settings.duplexEnabled ? pageNum % 2 === 1 : true;
        const wmL = isOdd ? marginL : marginLEven;
        const wmT = isOdd ? marginT : marginTEven;

        for (const el of elements) {
          if (el.type !== 'watermark') continue;
          const ws = el.settings as WatermarkSettings;
          if (!ws.enabled || !ws.imageData) continue;

          const wmOx = mmToPt(ws.ignoreMargin ? ws.offsetRight : 0);
          const wmOy = mmToPt(ws.ignoreMargin ? ws.offsetDown : 0);
          const wmMarginL = ws.ignoreMargin ? 0 : wmL;
          const wmMarginT = ws.ignoreMargin ? 0 : wmT;
          const wmX = wmMarginL + wmOx;
          const wmY = wmMarginT + wmOy;

          content.push({
            image: processedWMs.get(el.id),
            absolutePosition: { x: wmX, y: wmY },
            width: mmToPt(ws.width),
          });
        }

        // 文字元素（标题 / 页码 / 单文字，由 mode 决定具体渲染）——内容层
        for (const el of elements) {
          if (el.type !== 'text') continue;
          const ts = el.settings as TextSettings;
          if (!ts.enabled) continue;
          // 该模块选用的字体（三种模式共用）
          const tFont = familyOf(ts.fontId);

          const tMarginL = isOdd ? marginL : marginLEven;
          const tMarginT = isOdd ? marginT : marginTEven;
          const tMarginR = isOdd ? marginR : marginREven;
          const tMarginB = isOdd ? marginB : marginBEven;
          const hAlignMap = { left: 'left', center: 'center', right: 'right' } as const;

          if (ts.mode === 'title') {
            const tf = ts.title;
            if (!tf.text) continue;

            // 双面装订时的页面可见性
            if (settings.duplexEnabled && tf.pageVisibility !== 'both') {
              if (tf.pageVisibility === 'odd' && pageNum % 2 === 0) continue;
              if (tf.pageVisibility === 'even' && pageNum % 2 === 1) continue;
            }

            const tfMarginPt = mmToPt(tf.margin);
            const tfFontSize = mmToPt(tf.fontSize);
            const displayText = tf.text;
            const drawingAreaWidth = pageWidth - tMarginL - tMarginR;
            const drawingAreaHeight = pageHeight - tMarginT - tMarginB;

            let posY: number;
            switch (tf.verticalPosition) {
              // 顶端/底端加安全钳制，避免文本超出页面而被 pdfmake 挤到下一页
              case 'top': posY = Math.max(0, tMarginT - tfMarginPt); break;
              case 'bottom': posY = Math.min(pageHeight - tMarginB + tfMarginPt, pageHeight - tfFontSize * 1.4); break;
              case 'middle':
              default: posY = tMarginT + drawingAreaHeight / 2; break;
            }

            if (tf.direction === 'vertical') {
              let posX: number;
              switch (tf.horizontalPosition) {
                case 'left': posX = tMarginL; break;
                case 'right': posX = pageWidth - tMarginR; break;
                case 'center': default: posX = pageWidth / 2; break;
              }
              content.push({
                text: displayText,
                absolutePosition: { x: posX, y: posY },
                fontSize: tfFontSize,
                color: ts.color,
                angle: 90,
                font: tFont,
              });
            } else {
              content.push({
                stack: [{
                  text: displayText,
                  fontSize: tfFontSize,
                  color: ts.color,
                  alignment: hAlignMap[tf.horizontalPosition],
                  font: tFont,
                }],
                absolutePosition: { x: tMarginL, y: posY },
                width: drawingAreaWidth,
              });
            }
            continue;
          }

          if (ts.mode === 'pageNumber') {
            const pn = ts.pageNumber;

            // 双面装订时的页面可见性
            if (settings.duplexEnabled && pn.pageVisibility !== 'both') {
              if (pn.pageVisibility === 'odd' && pageNum % 2 === 0) continue;
              if (pn.pageVisibility === 'even' && pageNum % 2 === 1) continue;
            }

            // 「页码起始位置」：从第 startDisplayPage 页才开始打印页码
            if (pageNum < pn.startDisplayPage) continue;

            const totalPages = settings.copies;
            // 首个显示页码的页打印 startNumber，其后逐页递增
            const displayNumber = pn.startNumber + (pageNum - pn.startDisplayPage);
            const displayText = formatPageNumber(displayNumber, totalPages, pn.style, language);
            const pnFontSize = mmToPt(pn.fontSize);
            const edgePt = mmToPt(PAGE_NUMBER_EDGE_MM);
            const drawingAreaWidth = pageWidth - tMarginL - tMarginR;
            // 页眉/页脚均以「距页边固定距离」定位，页脚再按字号回退，
            // 保证文本框不超出页面高度（否则 pdfmake 会把它挤到下一页）
            const posY = pn.placement === 'header'
              ? edgePt
              : pageHeight - edgePt - pnFontSize;

            content.push({
              stack: [{
                text: displayText,
                fontSize: pnFontSize,
                color: ts.color,
                alignment: hAlignMap[pn.align],
                font: tFont,
              }],
              absolutePosition: { x: tMarginL, y: posY },
              width: drawingAreaWidth,
            });
            continue;
          }

          // 单文字模式
          const st = ts.single;
          if (!st.text) continue;

          const stOx = mmToPt(st.ignoreMargin ? st.offsetRight : 0);
          const stOy = mmToPt(st.ignoreMargin ? st.offsetDown : 0);
          const stMarginL = st.ignoreMargin ? 0 : tMarginL;
          const stMarginT = st.ignoreMargin ? 0 : tMarginT;
          const stBaseX = stMarginL + stOx;
          const stBaseY = stMarginT + stOy;
          const stFontSize = mmToPt(st.fontSize);

          for (let i = 0; i < st.repeatCount; i++) {
            const tx = st.repeatDirection === 'horizontal' ? stBaseX + i * stFontSize * 4 : stBaseX;
            const ty = st.repeatDirection === 'vertical' ? stBaseY + i * stFontSize * 4 : stBaseY;
            content.push({
              text: st.text,
              absolutePosition: { x: tx, y: ty },
              fontSize: stFontSize,
              color: ts.color,
              angle: st.angle,
              font: tFont,
            });
          }
        }
      }

      const docDef: any = {
        pageSize: { width: pageWidth, height: pageHeight },
        pageMargins: [0, 0, 0, 0],
        background: (currentPage: number, pageSize: { width: number; height: number }) => {
          const canvas: any[] = [];

          const pageNum = currentPage + 1;
          const isOdd = settings.duplexEnabled ? pageNum % 2 === 1 : true;
          const mL = isOdd ? marginL : marginLEven;
          const mT = isOdd ? marginT : marginTEven;
          const mR = isOdd ? marginR : marginREven;
          const mB = isOdd ? marginB : marginBEven;

          // Background color rect
          canvas.push({
            type: 'rect',
            x: 0,
            y: 0,
            w: pageSize.width,
            h: pageSize.height,
            color: settings.backgroundColor,
          });

          // Draw elements
          for (const el of elements) {
            const s = el.settings;
            if (!s.enabled) continue;
            // text elements are rendered in the content layer
            if (el.type === 'text') continue;

            const s2 = s as Exclude<ElementSettings, TextSettings>;
            const ox = mmToPt(s2.ignoreMargin ? s2.offsetRight : 0);
            const oy = mmToPt(s2.ignoreMargin ? s2.offsetDown : 0);
            const elMarginL = s2.ignoreMargin ? 0 : mL;
            const elMarginT = s2.ignoreMargin ? 0 : mT;
            const elMarginR = s2.ignoreMargin ? 0 : mR;
            const elMarginB = s2.ignoreMargin ? 0 : mB;
            const baseX = elMarginL + ox;
            const baseY = elMarginT + oy;

            const maxW = pageSize.width - baseX - elMarginR;
            const maxH = pageSize.height - baseY - elMarginB;
            const rw = Math.min(s2.rangeWidth > 0 ? mmToPt(s2.rangeWidth) : maxW, maxW);
            const rh = Math.min(s2.rangeHeight > 0 ? mmToPt(s2.rangeHeight) : maxH, maxH);

            if (rw <= 0 || rh <= 0) continue;

            switch (el.type) {
              case 'intervalLine': {
                const is = s as IntervalLineSettings;
                const spacing = mmToPt(is.spacing);
                if (spacing <= 0) break;
                const lw = mmToPt(is.lineWidth);

                if (is.frameStyle !== 'none') {
                  pushFrame(canvas, baseX, baseY, rw, rh, mmToPt(is.frameLineWidth), is.color, is.frameStyle === 'dashed', mmToPt(is.frameDashGap));
                }

                const dash = is.lineStyle === 'dashed' ? { dash: { length: 3, space: mmToPt(is.dashGap) } } : undefined;

                if (is.direction === 'horizontal') {
                  for (let y = baseY; y <= baseY + rh; y += spacing) {
                    canvas.push({ type: 'line', x1: baseX, y1: y, x2: baseX + rw, y2: y, lineWidth: lw, lineColor: is.color, ...dash });
                  }
                } else {
                  for (let x = baseX; x <= baseX + rw; x += spacing) {
                    canvas.push({ type: 'line', x1: x, y1: baseY, x2: x, y2: baseY + rh, lineWidth: lw, lineColor: is.color, ...dash });
                  }
                }
                break;
              }

              case 'diagonal': {
                const ds = s as DiagonalSettings;
                const spacing = mmToPt(ds.spacing);
                if (spacing <= 0) break;
                const lw = mmToPt(ds.lineWidth);

                if (ds.frameStyle !== 'none') {
                  pushFrame(canvas, baseX, baseY, rw, rh, mmToPt(ds.frameLineWidth), ds.color, ds.frameStyle === 'dashed', mmToPt(ds.frameDashGap));
                }

                const dash = ds.lineStyle === 'dashed' ? { dash: { length: 3, space: mmToPt(ds.dashGap) } } : undefined;

                if (ds.direction === 'top-left-bottom-right' || ds.direction === 'both') {
                  pushDiagonalLines(canvas, baseX, baseY, rw, rh, spacing, 'tlbr', lw, ds.color, dash);
                }
                if (ds.direction === 'top-right-bottom-left' || ds.direction === 'both') {
                  pushDiagonalLines(canvas, baseX, baseY, rw, rh, spacing, 'trbl', lw, ds.color, dash);
                }
                break;
              }

              case 'dot': {
                const ds = s as DotSettings;
                const dotSize = mmToPt(ds.dotSize);
                const hSp = mmToPt(ds.horizontalSpacing);
                const vSp = mmToPt(ds.verticalSpacing);
                if (hSp <= 0 || vSp <= 0) break;

                for (let x = baseX; x <= baseX + rw; x += hSp) {
                  for (let y = baseY; y <= baseY + rh; y += vSp) {
                    canvas.push({ type: 'ellipse', x: x - dotSize / 2, y: y - dotSize / 2, r1: dotSize / 2, r2: dotSize / 2, color: ds.color });
                  }
                }
                break;
              }

              case 'singleLine': {
                const sl = s as SingleLineSettings;
                const lw = mmToPt(sl.lineWidth);
                const dash = sl.lineStyle === 'dashed' ? { dash: { length: 3 } } : undefined;
                canvas.push({
                  type: 'line',
                  x1: baseX + mmToPt(sl.startX), y1: baseY + mmToPt(sl.startY),
                  x2: baseX + mmToPt(sl.endX), y2: baseY + mmToPt(sl.endY),
                  lineWidth: lw, lineColor: sl.color, ...dash,
                });
                break;
              }

              case 'block': {
                const bs = s as BlockSettings;
                canvas.push({
                  type: 'rect',
                  x: baseX, y: baseY,
                  w: mmToPt(bs.width), h: mmToPt(bs.height),
                  color: bs.color,
                });
                break;
              }

              case 'circle': {
                const cs = s as CircleSettings;
                const r = mmToPt(cs.diameter) / 2;
                canvas.push({
                  type: 'ellipse',
                  x: baseX, y: baseY,
                  r1: r, r2: r,
                  color: cs.color,
                });
                break;
              }

              case 'qrCode': {
                const qs = s as QRCodeSettings;
                const qrSize = mmToPt(qs.size);
                try {
                  const qr = QRCode.create(qs.content, { errorCorrectionLevel: 'M' });
                  const moduleCount = qr.modules.size;
                  const moduleSize = qrSize / moduleCount;

                  for (let row = 0; row < moduleCount; row++) {
                    for (let col = 0; col < moduleCount; col++) {
                      if (qr.modules.get(row, col)) {
                        canvas.push({
                          type: 'rect',
                          x: baseX + col * moduleSize,
                          y: baseY + row * moduleSize,
                          w: moduleSize,
                          h: moduleSize,
                          color: qs.color,
                        });
                      }
                    }
                  }
                } catch {
                  canvas.push({
                    type: 'rect',
                    x: baseX, y: baseY,
                    w: qrSize, h: qrSize,
                    color: '#FFFFFF',
                  });
                  canvas.push({
                    type: 'text',
                    text: `[QR: ${qs.content}]`,
                    x: baseX + 5, y: baseY + qrSize / 2,
                    fontSize: 8, color: qs.color,
                  });
                }
                break;
              }

              case 'watermark': {
                // Watermarks are rendered in the content layer
                break;
              }
            }
          }

          return { canvas };
        },
        content,
      };

      // 字体：内置 MiSans 始终注册（作为默认与回退）；各「文字」模块按 settings.fontId
      // 使用自定义字体（customFonts 已由调用方过滤为实际用到的字体）
      // 内置 MiSans：pdfmake 的 VFS 只接受 base64 字符串（内部会 new Buffer(data,'base64')
      // 解码为二进制），不支持直接写入 ArrayBuffer/Uint8Array；此处复用缓存的同一个字符串引用，
      // 不做任何拼接或拷贝
      registerFont(MISANS_FAMILY, await loadBuiltinFontBase64());
      // 自定义字体：store 中仅保存原始二进制（ArrayBuffer），此处临时转 base64 注入 VFS；
      // 该 base64 为局部临时字符串，generatePDF 结束后即可被 GC 回收
      for (const f of customFonts) registerFont(customFamilyOf(f.id), arrayBufferToBase64(f.data));
      docDef.defaultStyle = { font: MISANS_FAMILY };

      let fontFallback = false;
      let blob: Blob;
      try {
        blob = await pdfMake.createPdf(docDef).getBlob();
      } catch (err) {
        if (customFonts.length === 0) throw err;
        // 自定义字体嵌入异常：整体回退内置 MiSans
        forceBuiltinFont(content);
        blob = await pdfMake.createPdf(docDef).getBlob();
        fontFallback = true;
      }

      resolve({ blob, fontFallback });
    } catch (err) {
      reject(err);
    }
  });
}

export function downloadPDF(blob: Blob, filename: string = 'datum.pdf') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function openPDFInNewTab(blob: Blob): Window | null {
  const url = URL.createObjectURL(blob);
  const newWindow = window.open(url, '_blank');
  // Delay revoke to allow the new tab to load the blob
  if (newWindow) {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
    URL.revokeObjectURL(url);
  }
  return newWindow;
}