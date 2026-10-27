import type {
  PaperSettings, ElementInstance, IntervalLineSettings, DiagonalSettings, DotSettings,
} from '../types';
import { getPaperSize } from '../store/useStore';

/** 导出前二次确认的图形对象数安全阈值（超过则弹窗确认，可按实测调整） */
export const SAFE_THRESHOLD = 200000;

/**
 * 粗略预估本次导出将生成的图形对象数量，用于拦截「超大范围 + 极小间距」组合，
 * 避免构建 docDefinition 时产生海量对象导致主线程长时间无响应甚至崩溃。
 *
 * 该函数不依赖 pdfmake，单独成模块以便在下载生成模块之前就能完成拦截确认。
 */
export function estimateDrawPrimitives(settings: PaperSettings, elements: ElementInstance[]): number {
  const paper = getPaperSize(settings);
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
