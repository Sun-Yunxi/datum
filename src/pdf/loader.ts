import type { ElementInstance } from '../types';
import { loadSarasaBase64 } from './sarasa';
import type { SarasaStyle } from './sarasa';
import type { QRCodeCreator } from './generator';

type GeneratorModule = typeof import('./generator');
type QRCodeModule = typeof import('qrcode');

let generatorPromise: Promise<GeneratorModule> | null = null;
let qrcodePromise: Promise<QRCodeModule> | null = null;

/** 生成模块是否已在本页加载过（用于判断本次导出是否还需要下载等待） */
export function isPdfGeneratorLoaded() {
  return generatorPromise !== null;
}

/** 是否有需要二维码的模块（只有这种情况下才加载 qrcode） */
export function hasQRCodeElement(elements: ElementInstance[]) {
  return elements.some((el) => el.type === 'qrCode' && el.settings.enabled);
}

function ensureGenerator(): Promise<GeneratorModule> {
  if (!generatorPromise) {
    generatorPromise = import('./generator').catch((err) => {
      generatorPromise = null;
      throw err;
    });
  }
  return generatorPromise;
}

function ensureQRCode(): Promise<QRCodeModule> {
  if (!qrcodePromise) {
    qrcodePromise = import('qrcode').catch((err) => {
      qrcodePromise = null;
      throw err;
    });
  }
  return qrcodePromise;
}

function pickQRCodeCreator(mod: QRCodeModule | null): QRCodeCreator | undefined {
  if (!mod) return undefined;
  const candidate = (mod as any).default?.create ?? (mod as any).create;
  return typeof candidate === 'function' ? candidate : undefined;
}

export interface LoadPdfAssetsOptions {
  /** 取消导出时中止字体下载；生成模块由 Service Worker 负责中止 */
  signal?: AbortSignal;
  needQR: boolean;
  /** 本次导出实际用到的内置字形；空数组表示完全不需要内置字体、不下载任何字体文件 */
  builtinFontStyles: SarasaStyle[];
}

/**
 * 并行加载 PDF 生成所需资源：
 * - 内置字体 Sarasa UI SC / 更纱黑体（只下载本次用到的字形）
 * - 生成模块（pdfmake，已去掉未使用的 Roboto VFS）
 * - qrcode（仅在存在二维码模块时）
 * 全部同时发起请求，避免「先下模块、再下字体」的串行等待。
 */
export async function loadPdfAssets(options: LoadPdfAssetsOptions) {
  const fontPromises = options.builtinFontStyles.map((style) =>
    loadSarasaBase64(style, options.signal),
  );
  const generatorLoad = ensureGenerator();
  const qrcodeLoad = options.needQR ? ensureQRCode() : Promise.resolve(null);

  // 全部并行下载；放在同一个 Promise.all 里，任一失败（含取消导致的中止）
  // 都会立即被处理，不会留下未被 catch 的字体 Promise。
  const [generator, qrcode] = await Promise.all([
    generatorLoad,
    qrcodeLoad,
    ...fontPromises,
  ]);
  return { generator, qrCreate: pickQRCodeCreator(qrcode) };
}
