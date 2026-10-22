import { create } from 'zustand';
import type {
  PaperSettings, ElementInstance, ElementType, IntervalLineSettings, DiagonalSettings, DotSettings,
  SingleLineSettings, BlockSettings, CircleSettings,
  QRCodeSettings, WatermarkSettings, TextSettings, Language, PresetTemplate, CustomFont,
} from '../types';
import { PAPER_SIZES, BUILTIN_FONT_ID } from '../types';

// 生成全局唯一 id，避免删除后按“同类型个数”生成索引导致 id 冲突
let elementSeq = 0;
function createElementId(type: ElementType): string {
  elementSeq += 1;
  return `${type}-${Date.now().toString(36)}-${elementSeq}`;
}

function createDefaultElement(type: ElementType, id: string): ElementInstance {
  const base = {
    enabled: true,
    color: '#9BB7D4',
    offsetRight: 0,
    offsetDown: 0,
    rangeWidth: 2000,
    rangeHeight: 2000,
    ignoreMargin: false,
  };

  const typeLabelMap: Record<ElementType, string> = {
    intervalLine: '间隔线',
    diagonal: '斜线',
    dot: '网点',
    singleLine: '单线条',
    block: '方块',
    circle: '圆圈',
    qrCode: 'QR Code',
    watermark: '水印',
    text: '文字',
  };

  switch (type) {
    case 'intervalLine':
      return {
        id,
        type,
        label: typeLabelMap[type],
        settings: {
          ...base,
          direction: 'horizontal' as const,
          lineStyle: 'solid' as const,
          dashGap: 1,
          lineWidth: 0.1,
          spacing: 5,
          frameStyle: 'solid' as const,
          frameLineWidth: 0.5,
          frameDashGap: 1,
        } as IntervalLineSettings,
      };
    case 'diagonal':
      return {
        id,
        type,
        label: typeLabelMap[type],
        settings: {
          ...base,
          direction: 'top-left-bottom-right' as const,
          lineStyle: 'solid' as const,
          dashGap: 1,
          lineWidth: 0.1,
          spacing: 5,
          frameStyle: 'none' as const,
          frameLineWidth: 0.5,
          frameDashGap: 1,
        } as DiagonalSettings,
      };
    case 'dot':
      return {
        id,
        type,
        label: typeLabelMap[type],
        settings: {
          ...base,
          dotSize: 0.1,
          horizontalSpacing: 10,
          verticalSpacing: 10,
        } as DotSettings,
      };
    case 'singleLine':
      return {
        id,
        type,
        label: typeLabelMap[type],
        settings: {
          ...base,
          startX: 0,
          startY: 0,
          endX: 100,
          endY: 100,
          lineStyle: 'solid' as const,
          lineWidth: 1,
        } as SingleLineSettings,
      };
    case 'text':
      return {
        id,
        type,
        label: typeLabelMap[type],
        settings: {
          enabled: true,
          mode: 'title' as const,
          color: '#000000',
          fontId: BUILTIN_FONT_ID,
          title: {
            text: 'Title',
            fontSize: 10,
            direction: 'horizontal' as const,
            verticalPosition: 'top' as const,
            horizontalPosition: 'center' as const,
            margin: 5,
            pageVisibility: 'both' as const,
          },
          single: {
            text: 'Text',
            fontSize: 10,
            angle: 0,
            repeatCount: 1,
            repeatDirection: 'horizontal' as const,
            offsetRight: 0,
            offsetDown: 0,
            rangeWidth: 2000,
            rangeHeight: 2000,
            ignoreMargin: false,
          },
          pageNumber: {
            fontSize: 3.5,
            style: 'number' as const,
            placement: 'footer' as const,
            align: 'center' as const,
            startDisplayPage: 1,
            startNumber: 1,
            pageVisibility: 'both' as const,
          },
        } as TextSettings,
      };
    case 'block':
      return {
        id,
        type,
        label: typeLabelMap[type],
        settings: {
          ...base,
          width: 50,
          height: 50,
        } as BlockSettings,
      };
    case 'circle':
      return {
        id,
        type,
        label: typeLabelMap[type],
        settings: {
          ...base,
          diameter: 50,
        } as CircleSettings,
      };
    case 'qrCode':
      return {
        id,
        type,
        label: typeLabelMap[type],
        settings: {
          ...base,
          color: '#000000',
          content: 'https://example.com',
          size: 30,
        } as QRCodeSettings,
      };
    case 'watermark':
      return {
        id,
        type,
        label: typeLabelMap[type],
        settings: {
          ...base,
          imageData: '',
          opacity: 50,
          width: 50,
        } as WatermarkSettings,
      };
  }
}

// ========== 状态类型 ==========

interface AppState {
  // Paper
  paperSettings: PaperSettings;
  setPaperSettings: (settings: Partial<PaperSettings>) => void;

  // Elements
  elements: ElementInstance[];
  setElements: (elements: ElementInstance[]) => void;
  updateElement: (id: string, settings: Partial<ElementInstance['settings']>) => void;
  addElement: (type: ElementType) => void;
  removeElement: (id: string) => void;
  duplicateElement: (id: string) => void;

  // Font（自定义字体库，全局共享；具体选用哪个字体存放在各「文字」模块的 settings.fontId）
  customFonts: CustomFont[];
  addCustomFont: (font: CustomFont) => void;
  removeCustomFont: (id: string) => void;
  fontLoading: boolean;                            // 字体读取/解析中，用于锁定 PDF 输出
  setFontLoading: (v: boolean) => void;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;

  // Template
  loadTemplate: (template: PresetTemplate) => void;

  // PDF generating
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  paperSettings: {
    paperType: 'A4',
    customWidth: 210,
    customHeight: 297,
    orientation: 'portrait',
    duplexEnabled: false,
    copies: 1,
    marginLeft: 15,
    marginRight: 15,
    marginTop: 13.5,
    marginBottom: 13.5,
    marginLeftEven: 15,
    marginRightEven: 15,
    marginTopEven: 13.5,
    marginBottomEven: 13.5,
    backgroundColor: '#FFFFFF',
  },

  setPaperSettings: (settings) =>
    set((state) => ({ paperSettings: { ...state.paperSettings, ...settings } })),

  elements: [],

  setElements: (elements) => set({ elements }),

  updateElement: (id, settings) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, settings: { ...el.settings, ...settings } as typeof el.settings } : el
      ),
    })),

  addElement: (type) =>
    set((state) => {
      const newEl = createDefaultElement(type, createElementId(type));
      return { elements: [...state.elements, newEl] };
    }),

  removeElement: (id) =>
    set((state) => ({ elements: state.elements.filter((el) => el.id !== id) })),

  // 复制当前模块：继承全部参数，插入到源模块之后
  duplicateElement: (id) =>
    set((state) => {
      const index = state.elements.findIndex((el) => el.id === id);
      if (index === -1) return state;
      const source = state.elements[index];
      const copy: ElementInstance = {
        ...source,
        id: createElementId(source.type),
        // 深拷贝，避免嵌套 settings（如 text 模块的 title/single/pageNumber）与原模块共享引用
        settings: structuredClone(source.settings),
      };
      const next = state.elements.slice();
      next.splice(index + 1, 0, copy);
      return { elements: next };
    }),

  customFonts: [],
  addCustomFont: (font) =>
    set((state) => ({ customFonts: [...state.customFonts, font] })),
  // 移除字体：把仍在引用它的文字模块统一回退到内置 MiSans
  removeCustomFont: (id) =>
    set((state) => ({
      customFonts: state.customFonts.filter((f) => f.id !== id),
      elements: state.elements.map((el) =>
        el.type === 'text' && (el.settings as TextSettings).fontId === id
          ? { ...el, settings: { ...el.settings, fontId: BUILTIN_FONT_ID } as typeof el.settings }
          : el
      ),
    })),

  fontLoading: false,
  setFontLoading: (v) => set({ fontLoading: v }),

  language: 'zh-hans',
  setLanguage: (lang) => set({ language: lang }),

  loadTemplate: (template) =>
    set(() => {
      const defaultPaper: PaperSettings = {
        paperType: 'A4',
        customWidth: 210,
        customHeight: 297,
        orientation: 'portrait',
        duplexEnabled: false,
        copies: 1,
        marginLeft: 15,
        marginRight: 15,
        marginTop: 13.5,
        marginBottom: 13.5,
        marginLeftEven: 15,
        marginRightEven: 15,
        marginTopEven: 13.5,
        marginBottomEven: 13.5,
        backgroundColor: '#FFFFFF',
      };
      return {
        paperSettings: { ...defaultPaper, ...template.paperSettings },
        elements: template.elements,
      };
    }),

  isGenerating: false,
  setIsGenerating: (v) => set({ isGenerating: v }),
}));

// 获取纸张的实际宽高 (mm)
export function getPaperSize(settings: PaperSettings): { width: number; height: number } {
  if (settings.paperType === 'Other') {
    return { width: settings.customWidth, height: settings.customHeight };
  }
  const size = PAPER_SIZES[settings.paperType];
  if (settings.orientation === 'landscape') {
    return { width: size.height, height: size.width };
  }
  return { width: size.width, height: size.height };
}