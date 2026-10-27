import type { FontFormat } from '../types';

/** 允许的字体格式：仅 Web 安全格式，坚决拒绝 .eot / .svg 等过时格式及可执行文件 */
const ALLOWED_FORMATS: FontFormat[] = ['woff2', 'ttf', 'otf'];

/** <input type="file"> 的 accept 值 */
export const FONT_ACCEPT = '.woff2,.ttf,.otf';

/** 字体文件大小上限：50MB */
export const MAX_FONT_SIZE = 50 * 1024 * 1024;

/** 单次批量上传的总大小提示阈值：25MB（超过时弹出一次警告） */
export const MAX_BATCH_SIZE = 25 * 1024 * 1024;

/** 字体读取 / 解析超时：20s */
export const FONT_LOAD_TIMEOUT = 20000;

/** 解析失败原因，用于映射到对应的 i18n 提示 */
export type FontErrorCode = 'UNSUPPORTED_FORMAT' | 'TOO_LARGE' | 'INVALID_FONT' | 'TIMEOUT';

/** 从文件名推断格式，非白名单格式返回 null */
export function detectFontFormat(fileName: string): FontFormat | null {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  const ext = match ? match[1].toLowerCase() : '';
  return ALLOWED_FORMATS.find((f) => f === ext) ?? null;
}

/** ArrayBuffer -> base64（分块转换，避免超大字体触发参数数量上限） */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** 给任意 Promise 加上超时，超时抛 FontErrorCode.TIMEOUT */
export function withTimeout<T>(promise: Promise<T>, ms: number = FONT_LOAD_TIMEOUT): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT' satisfies FontErrorCode)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

export interface ParsedFont {
  name: string;
  format: FontFormat;
  size: number;
  data: ArrayBuffer;
}

/** fontkit 解析出的 name 表：{ 名称字段: { 语言标签: 名称 } } */
type NameRecords = Record<string, Record<string, string>>;

/**
 * 名称字段的取值优先级（遵循 OpenType `name` 表与 W3C CSS Fonts Module Level 4）：
 * 16 Typographic Family（首选族名）→ 1 Font Family（族名）→ 4 Full font name（全名）。
 * 优选 16 号可避免部分字体只把友好名称写进首选族名的情况。
 */
const NAME_KEYS = ['preferredFamily', 'fontFamily', 'fullName'] as const;

/**
 * 把 UI 语言展开成候选语言标签（按优先级，小写）。
 * fontkit 会把 OpenType 的 platform/languageID 归一化为 BCP-47 风格标签
 * （Windows 0x0804 → `zh`、0x0404 → `zh-TW`、0x0C04 → `zh-HK`、0x1404 → `zh-MO`；
 *  Mac 33 → `zh`、19 → `zh-Hant`；英文统一为 `en` / `en-GB` 等）。
 * 按需求，中文除当前简体变种外还接受全部繁体与地区变种。
 */
function languageCandidates(uiLang: string): string[] {
  const tag = uiLang.trim().toLowerCase().replace(/_/g, '-');
  const base = tag.split('-')[0];
  if (base === 'zh') {
    return ['zh-hans', 'zh-cn', 'zh-sg', 'zh', 'zh-hant', 'zh-tw', 'zh-hk', 'zh-mo'];
  }
  return tag === base ? [base] : [tag, base];
}

/**
 * 解析字体的显示名称（语言无关）。
 *
 * 语言优先级：1) 当前 UI 语言（中文含繁体/地区变种）→ 2) 同主语言标签前缀
 * → 3) EN-US / EN → 4) 文件内任意可用记录 → 5) 去掉扩展名的文件名。
 * 同一语言下再按 `NAME_KEYS` 取字段，因此不会误取字体内置的拼音/英文首名。
 */
function resolveDisplayName(records: NameRecords | undefined, uiLang: string, fallback: string): string {
  const tables = NAME_KEYS
    .map((key) => records?.[key])
    .filter((table): table is Record<string, string> => !!table && typeof table === 'object');

  const langsOf = (table: Record<string, string>) =>
    Object.keys(table).filter((lang) => typeof table[lang] === 'string' && table[lang].trim() !== '');

  const allLangs = [...new Set(tables.flatMap(langsOf))];
  if (allLangs.length === 0) return fallback;

  const norm = (tag: string) => tag.trim().toLowerCase().replace(/_/g, '-');
  const baseOf = (tag: string) => norm(tag).split('-')[0];
  const uiBase = baseOf(uiLang);
  const uiCandidates = languageCandidates(uiLang).map(norm);

  const rankOf = (tag: string) => {
    const t = norm(tag);
    const exact = uiCandidates.indexOf(t);
    if (exact !== -1) return exact;            // 1) 当前 UI 语言（含中文变种）
    if (baseOf(t) === uiBase) return 1000;      // 2) 同一主语言
    if (t === 'en-us') return 2000;             // 3) EN-US
    if (t === 'en') return 2001;
    return 3000;                               // 4) 任意其它记录
  };

  // 稳定排序：同优先级保持 name 表中的原始顺序
  const ordered = allLangs
    .map((tag, index) => ({ tag, index, rank: rankOf(tag) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);

  for (const { tag } of ordered) {
    for (const table of tables) {
      const value = table[tag];
      if (typeof value === 'string' && value.trim() !== '') return value.trim();
    }
  }

  return fallback;
}

/**
 * 浏览器端预检：先做格式与体积校验，再用 fontkit（与 pdfmake 内部同款字体引擎）
 * 解析字体文件，确认它是合法字体且包含有效的 CMAP 字符映射表。
 * 全程在浏览器本地完成，不经过任何服务器。
 *
 * `uiLang` 用于从 name 表中挑选与界面语言匹配的字体显示名（见 resolveDisplayName）。
 */
export async function parseFontFile(file: File, uiLang: string = 'en'): Promise<ParsedFont> {
  const format = detectFontFormat(file.name);
  if (!format) throw new Error('UNSUPPORTED_FORMAT' satisfies FontErrorCode);
  if (file.size > MAX_FONT_SIZE) throw new Error('TOO_LARGE' satisfies FontErrorCode);

  const buffer = await file.arrayBuffer();

  // fontkit 仅在上传时按需加载，不进入首屏包
  const fontkit = await import('fontkit');
  type FontSource = Parameters<typeof fontkit.create>[0];
  let font: import('fontkit').Font;
  try {
    const created = fontkit.create(new Uint8Array(buffer) as unknown as FontSource);
    // TrueType 集合（TTC）取第一个字体
    font = 'fonts' in created ? created.fonts[0] : created;
  } catch {
    throw new Error('INVALID_FONT' satisfies FontErrorCode);
  }

  // numGlyphs 为 0 或 characterSet（CMAP）为空 => 字体不可用
  if (!font || !font.numGlyphs || !font.characterSet || font.characterSet.length === 0) {
    throw new Error('INVALID_FONT' satisfies FontErrorCode);
  }

  // 显示名从 name 表按 UI 语言解析；解析不出任何记录时退回文件名
  const records = (font as unknown as { name?: { records?: NameRecords } }).name?.records;
  const fallbackName = file.name.replace(/\.[^.]+$/, '');

  return {
    name: resolveDisplayName(records, uiLang, fallbackName),
    format,
    size: file.size,
    data: buffer,
  };
}

/** 创建自定义字体的唯一 id（时间戳 + 序号，避免同一毫秒冲突） */
let fontSeq = 0;
export function createFontId(): string {
  fontSeq += 1;
  return `font-${Date.now().toString(36)}-${fontSeq}`;
}