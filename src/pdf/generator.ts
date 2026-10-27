import pdfMake from 'pdfmake/build/pdfmake';
import type {
  PaperSettings, ElementInstance, ElementSettings, IntervalLineSettings, DiagonalSettings, DotSettings,
  SingleLineSettings, BlockSettings, CircleSettings,
  QRCodeSettings, WatermarkSettings, TextSettings, PageNumberStyle, Language, CustomFont,
} from '../types';
import { getPaperSize } from '../store/useStore';
import { BUILTIN_FONT_ID } from '../types';
import { arrayBufferToBase64 } from '../fonts';
import { loadSarasaBase64, neededBuiltinStyles } from './sarasa';
import type { SarasaStyle } from './sarasa';

/** 二维码生成函数由调用方按需注入（qrcode 库只在存在二维码模块时加载） */
export type QRCodeCreator = (
  text: string,
  options: { errorCorrectionLevel: 'M' },
) => { modules: { size: number; get: (row: number, col: number) => number } };

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

/** 内置 PDF 字体族（Sarasa UI SC / 更纱黑体，OFL-1.1） */
const SARASA_FAMILY = 'Sarasa UI SC';

/** 各字形在 pdfmake 虚拟文件系统里的文件名 */
const SARASA_FILES: Record<SarasaStyle, string> = {
  regular: 'reglet-SarasaUI-Regular.bin',
  bold: 'reglet-SarasaUI-Bold.bin',
  italic: 'reglet-SarasaUI-Oblique.bin',
  bolditalic: 'reglet-SarasaUI-BoldItalic.bin',
};

/**
 * 已注册进 pdfmake 的内置字形。pdfmake 的 addFonts 是浅合并（同名族整体替换），
 * 因此每次都要把「累积到的所有字形」重新声明一遍，避免后一次导出丢掉之前注册的字形。
 */
const registeredBuiltinFiles: Partial<Record<SarasaStyle, string>> = {};

const SARASA_STYLE_DESCRIPTORS: [SarasaStyle, string][] = [
  ['regular', 'normal'],
  ['bold', 'bold'],
  ['italic', 'italics'],
  ['bolditalic', 'bolditalics'],
];

/**
 * 只注册实际用到的字形，不再随包加载 pdfmake 自带的 Roboto VFS（约 835KB）。
 * 未提供的字形不能出现在字体族描述里：pdfmake 缺少对应字形时会直接抛错，
 * 而不是自动回退到常规字形。
 */
function registerBuiltinFont(files: Partial<Record<SarasaStyle, string>>) {
  Object.assign(registeredBuiltinFiles, files);
  const vfs: Record<string, string> = {};
  const family: Record<string, string> = {};
  for (const [style, descriptor] of SARASA_STYLE_DESCRIPTORS) {
    const data = registeredBuiltinFiles[style];
    if (!data) continue;
    vfs[SARASA_FILES[style]] = data;
    family[descriptor] = SARASA_FILES[style];
  }
  pdfMake.addVirtualFileSystem(vfs);
  // 把 pdfmake 默认的 Roboto 族名映射到同一族，避免任何遗漏的默认字体引用失效
  pdfMake.addFonts({ [SARASA_FAMILY]: family as any, Roboto: family as any });
}

/** 把字体注册进 pdfmake：先写入虚拟文件系统，再声明字体族 */
function registerFont(family: string, base64: string) {
  const file = `reglet-${family.replace(/[^a-zA-Z0-9]+/g, '-')}.bin`;
  pdfMake.addVirtualFileSystem({ [file]: base64 });
  pdfMake.addFonts({ [family]: { normal: file } });
}

/** 自定义字体在 pdfmake 中的字体族名（用 id 生成，避免字体族同名覆盖） */
function customFamilyOf(fontId: string) {
  return `Reglet-${fontId}`;
}

/**
 * 自定义字体嵌入失败时，只把「自定义字体族」的文本节点改回内置字体，
 * 并清掉加粗/斜体标记（内置字体只保证注册了常规字形，带标记会触发 pdfmake 缺少字形的异常）。
 * 已经使用内置字体的节点保持原样，不损失其加粗/斜体效果。
 */
function forceBuiltinFont(node: any, customFamilies: Set<string>) {
  if (Array.isArray(node)) {
    node.forEach((n) => forceBuiltinFont(n, customFamilies));
    return;
  }
  if (node && typeof node === 'object') {
    if (typeof node.font === 'string' && customFamilies.has(node.font)) {
      node.font = SARASA_FAMILY;
      delete node.bold;
      delete node.italics;
    }
    for (const key of Object.keys(node)) forceBuiltinFont(node[key], customFamilies);
  }
}

export interface PDFResult {
  blob: Blob;
  /** 自定义字体加载失败并自动回退到内置 Sarasa 时为 true */
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

/**
 * pdfmake 的单行文本行高 ≈ 字体自身行高比例 × 字号。
 * Sarasa UI SC 的 (ascent - descent) / unitsPerEm ≈ 1.21，
 * 用于把「文字块」而不是「文字块顶边」对齐到作图区域。
 */
const TEXT_LINE_HEIGHT_RATIO = 1.21;

/**
 * 按作图区域宽度做左/中/右对齐的绝对定位单行文本。
 * pdfmake 的 stack 不会采用 width，alignment 会以「页面右缘」为参照，
 * 导致居中/右对齐整体右移；这里用 columns 先把作图区域左缘留空并限定文本宽度。
 */
function absoluteAlignedText(opts: {
  text: string;
  /** 作图区域左缘距页面左缘的距离（pt） */
  x: number;
  /** 文本盒顶边距页面顶边的距离（pt） */
  y: number;
  /** 作图区域宽度（pt） */
  width: number;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  font: string;
  bold?: boolean;
  italics?: boolean;
}) {
  return {
    columns: [
      { width: opts.x, text: ' ' },
      {
        width: opts.width,
        text: opts.text,
        fontSize: opts.fontSize,
        color: opts.color,
        alignment: opts.align,
        font: opts.font,
        bold: opts.bold,
        italics: opts.italics,
      },
    ],
    columnGap: 0,
    absolutePosition: { x: 0, y: opts.y },
  };
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

export function generatePDF(
  settings: PaperSettings,
  elements: ElementInstance[],
  language: Language = 'zh-hans',
  customFonts: CustomFont[] = [],
  qrCreate?: QRCodeCreator,
): Promise<PDFResult> {
  const createQRCode: QRCodeCreator = qrCreate ?? (() => {
    throw new Error('QR code module is not loaded');
  });
  return new Promise(async (resolve, reject) => {
    try {
      const densityError = checkDensity(settings, elements);
      if (densityError) {
        reject(new Error(densityError));
        return;
      }

      // 由各「文字」模块的 fontId 解析实际字体族名（缺失/非法一律回退内置 Sarasa）
      const customById = new Map(customFonts.map((f) => [f.id, f]));
      const familyOf = (fontId?: string) =>
        fontId && fontId !== BUILTIN_FONT_ID && customById.has(fontId)
          ? customFamilyOf(fontId)
          : SARASA_FAMILY;

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
          // 用空画布换页：不依赖任何字体（未使用内置字体时不会注册字体，空文本会触发字体解析）
          content.push({ canvas: [], pageBreak: 'before' });
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
          // 只有内置字体具备加粗/斜体字形；自定义字体按上传文件的字形原样嵌入
          const tBuiltin = tFont === SARASA_FAMILY;
          const tBold = tBuiltin && ts.bold;
          const tItalics = tBuiltin && ts.italic;

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
            // 单行文本盒高度：用于按「文字块」对齐，避免整体向下偏一行高
            const tfLineHeight = tfFontSize * TEXT_LINE_HEIGHT_RATIO;
            const displayText = tf.text;
            const drawingAreaWidth = pageWidth - tMarginL - tMarginR;
            const drawingAreaHeight = pageHeight - tMarginT - tMarginB;

            let posY: number;
            switch (tf.verticalPosition) {
              // 文字块整体位于作图区域上方，与区域上缘保持 margin 的间距
              case 'top': posY = Math.max(0, tMarginT - tfMarginPt - tfLineHeight); break;
              // 文字块整体位于作图区域下方；行底贴页面底边会因浮点误差被挤到下一页，故留 1pt 余量
              case 'bottom': posY = Math.min(Math.max(0, pageHeight - tfLineHeight - 1), pageHeight - tMarginB + tfMarginPt); break;
              // 文字块在作图区域内垂直居中
              case 'middle':
              default: posY = tMarginT + drawingAreaHeight / 2 - tfLineHeight / 2; break;
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
                bold: tBold,
                italics: tItalics,
              });
            } else {
              content.push(absoluteAlignedText({
                text: displayText,
                x: tMarginL,
                y: posY,
                width: drawingAreaWidth,
                fontSize: tfFontSize,
                color: ts.color,
                align: hAlignMap[tf.horizontalPosition],
                font: tFont,
                bold: tBold,
                italics: tItalics,
              }));
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
            const pnLineHeight = pnFontSize * TEXT_LINE_HEIGHT_RATIO;
            const edgePt = mmToPt(PAGE_NUMBER_EDGE_MM);
            const drawingAreaWidth = pageWidth - tMarginL - tMarginR;
            // 页眉/页脚均以「距页边固定距离」定位，页脚再按行高回退，
            // 保证文本框不超出页面高度（否则 pdfmake 会把它挤到下一页）
            const posY = pn.placement === 'header'
              ? edgePt
              : pageHeight - edgePt - pnLineHeight;

            content.push(absoluteAlignedText({
              text: displayText,
              x: tMarginL,
              y: posY,
              width: drawingAreaWidth,
              fontSize: pnFontSize,
              color: ts.color,
              align: hAlignMap[pn.align],
              font: tFont,
              bold: tBold,
              italics: tItalics,
            }));
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
              bold: tBold,
              italics: tItalics,
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
                  const qr = createQRCode(qs.content, { errorCorrectionLevel: 'M' });
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

      // 字体：只注册本次实际用到的内置字形（未选择字体/选择内置/自定义字体失效都会回退内置）；
      // 全部文字模块都使用自定义字体时不下载任何内置字体文件。
      // （customFonts 已由调用方过滤为实际用到的字体）
      // pdfmake 的 VFS 只接受 base64 字符串（内部会 new Buffer(data,'base64')
      // 解码为二进制），不支持直接写入 ArrayBuffer/Uint8Array；此处复用缓存的同一个字符串引用，
      // 不做任何拼接或拷贝
      //
      // 只注册本次实际用到的字形（常规/加粗/斜体/加粗斜体）：pdfmake 在缺少对应字形时
      // 会直接抛错而不是回退，所以未用到的字形不能出现在字体族描述里。
      const builtinStyles = neededBuiltinStyles(elements, customFonts);
      const ensureBuiltinFont = async (styles: SarasaStyle[]) => {
        // 已注册过（含之前几次导出注册的）字形无需重复处理
        const missing = styles.filter((s) => !registeredBuiltinFiles[s]);
        if (missing.length === 0) return;
        const loaded = await Promise.all(
          missing.map(async (s) => [s, await loadSarasaBase64(s)] as const),
        );
        const files: Partial<Record<SarasaStyle, string>> = {};
        for (const [s, data] of loaded) files[s] = data;
        registerBuiltinFont(files);
      };
      if (builtinStyles.length > 0) {
        await ensureBuiltinFont(builtinStyles);
        docDef.defaultStyle = { font: SARASA_FAMILY };
      } else if (customFonts.length > 0) {
        // 全部文本都使用自定义字体：默认样式也指向其中一个已注册的字体族
        docDef.defaultStyle = { font: customFamilyOf(customFonts[0].id) };
      }
      // 自定义字体：store 中仅保存原始二进制（ArrayBuffer），此处临时转 base64 注入 VFS；
      // 该 base64 为局部临时字符串，generatePDF 结束后即可被 GC 回收。
      // 单个字体注册/转换失败不影响其它字体，异常留到生成阶段统一处理（走回退路径）。
      for (const f of customFonts) {
        try {
          registerFont(customFamilyOf(f.id), arrayBufferToBase64(f.data));
        } catch {
          /* 交给下面的嵌入异常回退 */
        }
      }

      let fontFallback = false;
      let blob: Blob;
      try {
        blob = await pdfMake.createPdf(docDef).getBlob();
      } catch (err) {
        if (customFonts.length === 0) throw err;
        // 自定义字体嵌入异常：把「自定义字体族」的文本整体回退到内置字体（此时才下载常规字形）。
        // 已使用内置字体的节点保持原样，其加粗/斜体效果不会被丢掉。
        await ensureBuiltinFont(['regular']);
        docDef.defaultStyle = { font: SARASA_FAMILY };
        forceBuiltinFont(content, new Set(customFonts.map((f) => customFamilyOf(f.id))));
        blob = await pdfMake.createPdf(docDef).getBlob();
        fontFallback = true;
      }

      resolve({ blob, fontFallback });
    } catch (err) {
      reject(err);
    }
  });
}

export function downloadPDF(blob: Blob, filename: string = 'reglet.pdf') {
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