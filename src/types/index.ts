// ========== 纸张相关类型 ==========

export type PaperType =
  | 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5'
  | 'B0' | 'B1' | 'B2' | 'B3' | 'B4' | 'B5'
  | 'Letter' | 'Legal' | 'JuniorLegal' | 'Ledger' | 'Tabloid'
  | 'Other';

export type Orientation = 'portrait' | 'landscape';

export interface PaperSettings {
  paperType: PaperType;
  customWidth: number;  // mm
  customHeight: number; // mm
  orientation: Orientation;
  duplexEnabled: boolean;
  copies: number;
  // 奇数页留白
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  // 偶数页留白（双面装订时使用）
  marginLeftEven: number;
  marginRightEven: number;
  marginTopEven: number;
  marginBottomEven: number;
  backgroundColor: string; // HEX
}

// 纸张标准尺寸 (mm)
export const PAPER_SIZES: Record<Exclude<PaperType, 'Other'>, { width: number; height: number }> = {
  A0: { width: 841, height: 1189 }, A1: { width: 594, height: 841 },
  A2: { width: 420, height: 594 }, A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 }, A5: { width: 148, height: 210 },
  B0: { width: 1000, height: 1414 }, B1: { width: 707, height: 1000 },
  B2: { width: 500, height: 707 }, B3: { width: 353, height: 500 },
  B4: { width: 250, height: 353 }, B5: { width: 176, height: 250 },
  Letter: { width: 215.9, height: 279.4 }, Legal: { width: 215.9, height: 355.6 },
  JuniorLegal: { width: 127, height: 203.2 }, Ledger: { width: 279.4, height: 431.8 },
  Tabloid: { width: 279.4, height: 431.8 },
};

// ========== 图形元素相关类型 ==========

export type LineStyle = 'solid' | 'dashed';
export type LineDirection = 'horizontal' | 'vertical';
/** 外框样式：无 / 实线 / 虚线 */
export type FrameStyle = 'none' | 'solid' | 'dashed';
/** 斜线方向：左上→右下 / 右上→左下 / 双向 */
export type DiagonalLineDirection = 'top-left-bottom-right' | 'top-right-bottom-left' | 'both';

export interface IntervalLineSettings {
  enabled: boolean;
  color: string;
  offsetRight: number;
  offsetDown: number;
  rangeWidth: number;
  rangeHeight: number;
  ignoreMargin: boolean;
  // 特有参数
  direction: LineDirection;
  lineStyle: LineStyle;
  dashGap: number;        // mm, 虚线间隔（线条样式为虚线时生效）
  lineWidth: number;      // mm
  spacing: number;        // mm
  frameStyle: FrameStyle;
  frameLineWidth: number; // mm
  frameDashGap: number;   // mm, 外框虚线间隔（外框样式为虚线时生效）
}

/** 独立「斜线」模块：在范围内按间距绘制单向/双向斜线 */
export interface DiagonalSettings {
  enabled: boolean;
  color: string;
  offsetRight: number;
  offsetDown: number;
  rangeWidth: number;
  rangeHeight: number;
  ignoreMargin: boolean;
  // 特有参数
  direction: DiagonalLineDirection;
  lineStyle: LineStyle;
  dashGap: number;        // mm, 虚线间隔（线条样式为虚线时生效）
  lineWidth: number;      // mm
  spacing: number;        // mm
  frameStyle: FrameStyle;
  frameLineWidth: number; // mm
  frameDashGap: number;   // mm, 外框虚线间隔（外框样式为虚线时生效）
}

export interface DotSettings {
  enabled: boolean;
  color: string;
  offsetRight: number;
  offsetDown: number;
  rangeWidth: number;
  rangeHeight: number;
  ignoreMargin: boolean;
  // 特有参数
  dotSize: number;        // mm
  horizontalSpacing: number; // mm
  verticalSpacing: number;   // mm
}

export interface SingleLineSettings {
  enabled: boolean;
  color: string;
  offsetRight: number;
  offsetDown: number;
  rangeWidth: number;
  rangeHeight: number;
  ignoreMargin: boolean;
  // 特有参数
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  lineStyle: LineStyle;
  lineWidth: number;
}

export interface SingleTextBlockSettings {
  text: string;
  fontSize: number;       // mm
  angle: number;          // 0-360
  repeatCount: number;
  repeatDirection: 'horizontal' | 'vertical';
  offsetRight: number;
  offsetDown: number;
  rangeWidth: number;
  rangeHeight: number;
  ignoreMargin: boolean;
}

export type TextMode = 'title' | 'pageNumber' | 'singleText';
export type PageNumberStyle = 'number' | 'pageX' | 'xOfY' | 'roman';
export type PageNumberPlacement = 'header' | 'footer';

export interface PageNumberBlockSettings {
  fontSize: number;             // mm
  style: PageNumberStyle;
  placement: PageNumberPlacement;
  align: HorizontalPosition;
  startDisplayPage: number;     // 页码起始位置：从第几页开始打印页码（1 为首页）
  startNumber: number;          // 起始页码数值：首个打印页码的页上显示的数值
  pageVisibility: PageVisibility;
}

export interface BlockSettings {
  enabled: boolean;
  color: string;
  offsetRight: number;
  offsetDown: number;
  rangeWidth: number;
  rangeHeight: number;
  ignoreMargin: boolean;
  // 特有参数
  width: number;
  height: number;
}

export interface CircleSettings {
  enabled: boolean;
  color: string;
  offsetRight: number;
  offsetDown: number;
  rangeWidth: number;
  rangeHeight: number;
  ignoreMargin: boolean;
  // 特有参数
  diameter: number;
}

export interface QRCodeSettings {
  enabled: boolean;
  color: string;
  offsetRight: number;
  offsetDown: number;
  rangeWidth: number;
  rangeHeight: number;
  ignoreMargin: boolean;
  // 特有参数
  content: string;
  size: number;           // mm
}

export interface WatermarkSettings {
  enabled: boolean;
  color: string;
  offsetRight: number;
  offsetDown: number;
  rangeWidth: number;
  rangeHeight: number;
  ignoreMargin: boolean;
  // 特有参数
  imageData: string;      // base64 data URL
  opacity: number;        // 0-100, 越小越透明
  width: number;          // mm, 高度等比例缩放
}

export type VerticalPosition = 'top' | 'middle' | 'bottom';
export type HorizontalPosition = 'left' | 'center' | 'right';
export type PageVisibility = 'both' | 'odd' | 'even';

export interface TitleBlockSettings {
  text: string;                 // 纯文本，{page} 等按字面显示
  fontSize: number;             // mm
  direction: 'horizontal' | 'vertical';
  verticalPosition: VerticalPosition;
  horizontalPosition: HorizontalPosition;
  margin: number;               // mm, 离作图区域的距离
  pageVisibility: PageVisibility;
}

// 整合后的「文字」模块：在同一个模块内通过 mode 切换 标题 / 页码 / 单文字
export interface TextSettings {
  enabled: boolean;
  mode: TextMode;
  color: string;                 // 三种模式共用
  fontId: string;                // 三种模式共用：BUILTIN_FONT_ID 或自定义字体 id
  bold: boolean;                 // 三种模式共用：仅内置字体有对应字形；自定义字体按上传文件原样使用
  italic: boolean;               // 三种模式共用：内置字体使用斜体字形（Regular 斜切得到）
  title: TitleBlockSettings;
  single: SingleTextBlockSettings;
  pageNumber: PageNumberBlockSettings;
}

export type ElementSettings =
  | IntervalLineSettings
  | DiagonalSettings
  | DotSettings
  | SingleLineSettings
  | BlockSettings
  | CircleSettings
  | QRCodeSettings
  | WatermarkSettings
  | TextSettings;

export type ElementType = 'intervalLine' | 'diagonal' | 'dot' | 'singleLine' | 'block' | 'circle' | 'qrCode' | 'watermark' | 'text';

export interface ElementInstance {
  id: string;
  type: ElementType;
  label: string;
  settings: ElementSettings;
}

// ========== 模板相关类型 ==========

export interface PresetTemplate {
  id: string;
  name: string;
  nameEn: string;
  paperSettings: Partial<PaperSettings>;
  elements: ElementInstance[];
}

// ========== 字体 ==========

/** 仅接受 Web 安全格式，拒绝 .eot / .svg 等过时格式与可执行文件 */
export type FontFormat = 'woff2' | 'ttf' | 'otf';

export interface CustomFont {
  id: string;
  name: string;      // 字体族名（由字体文件解析得到）
  format: FontFormat;
  size: number;      // 原始文件字节数
  data: ArrayBuffer; // 字体原始二进制（不再常驻 base64，避免约 1.33 倍内存膨胀；仅在导出时临时转 base64）
}

/** 内置字体（PDF 导出用 Sarasa UI SC；界面使用系统字体）的字体 id */
export const BUILTIN_FONT_ID = 'builtin';

// ========== 语言 ==========
export type Language = 'en' | 'zh-hans';