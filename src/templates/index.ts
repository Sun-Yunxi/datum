import type { PresetTemplate } from '../types';

export const presetTemplates: PresetTemplate[] = [
  {
    id: '2',
    name: '笔记纸',
    nameEn: 'Note Paper',
    paperSettings: {},
    elements: [
      {
        id: 'intervalLine-1', type: 'intervalLine', label: '间隔线-1',
        settings: {
          enabled: true, color: '#999999', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 7, frameLineWidth: 0.5, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
    ],
  },
  {
    id: '3',
    name: '东大笔记本',
    nameEn: 'Todai Notebook',
    paperSettings: {},
    elements: [
      {
        id: 'intervalLine-1', type: 'intervalLine', label: '间隔线-1',
        settings: {
          enabled: true, color: '#999999', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 6, frameLineWidth: 0.5, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'intervalLine-2', type: 'intervalLine', label: '间隔线-2',
        settings: {
          enabled: true, color: '#99CCFF', offsetRight: 25, offsetDown: 0,
          rangeWidth: 5, rangeHeight: 2000, ignoreMargin: false,
          direction: 'vertical', lineStyle: 'solid', lineWidth: 0.5,
          spacing: 5, frameLineWidth: 0, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
    ],
  },
  {
    id: '4',
    name: '康奈尔笔记',
    nameEn: 'Cornell Notes',
    paperSettings: {},
    elements: [
      {
        id: 'intervalLine-1', type: 'intervalLine', label: '间隔线-1',
        settings: {
          enabled: true, color: '#999999', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 6, frameLineWidth: 0.5, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'intervalLine-2', type: 'intervalLine', label: '间隔线-2',
        settings: {
          enabled: true, color: '#FF6666', offsetRight: 60, offsetDown: 0,
          rangeWidth: 1, rangeHeight: 2000, ignoreMargin: false,
          direction: 'vertical', lineStyle: 'solid', lineWidth: 0.5,
          spacing: 5, frameLineWidth: 0, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'singleLine-1', type: 'singleLine', label: '单线条-1',
        settings: {
          enabled: true, color: '#FF6666', offsetRight: 0, offsetDown: 50,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          startX: 0, startY: 0, endX: 2000, endY: 0, lineStyle: 'solid', lineWidth: 0.5,
        },
      },
    ],
  },
  {
    id: '5',
    name: '米字格',
    nameEn: 'Mi Zi Ge',
    paperSettings: {},
    elements: [
      {
        id: 'intervalLine-1', type: 'intervalLine', label: '间隔线-1',
        settings: {
          enabled: true, color: '#FF6666', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 15, frameLineWidth: 0.5, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'intervalLine-2', type: 'intervalLine', label: '间隔线-2',
        settings: {
          enabled: true, color: '#FF6666', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'vertical', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 15, frameLineWidth: 0, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'intervalLine-3', type: 'intervalLine', label: '间隔线-3',
        settings: {
          enabled: true, color: '#FF9999', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'dashed', dashGap: 1, lineWidth: 0.1,
          spacing: 15, frameStyle: 'none', frameLineWidth: 0, frameDashGap: 1,
        },
      },
      {
        id: 'diagonal-1', type: 'diagonal', label: '斜线-1',
        settings: {
          enabled: true, color: '#FF9999', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'both', lineStyle: 'dashed', dashGap: 1, lineWidth: 0.1,
          spacing: 15, frameStyle: 'none', frameLineWidth: 0, frameDashGap: 1,
        },
      },
    ],
  },
  {
    id: '7',
    name: '方格纸.1cm',
    nameEn: 'Grid 1cm',
    paperSettings: {},
    elements: [
      {
        id: 'intervalLine-1', type: 'intervalLine', label: '间隔线-1',
        settings: {
          enabled: true, color: '#99CCFF', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 10, frameLineWidth: 0.5, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'intervalLine-2', type: 'intervalLine', label: '间隔线-2',
        settings: {
          enabled: true, color: '#99CCFF', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'vertical', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 10, frameLineWidth: 0, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
    ],
  },
  {
    id: '8',
    name: '网格纸.5mm',
    nameEn: 'Dot Grid 5mm',
    paperSettings: {},
    elements: [
      {
        id: 'dot-1', type: 'dot', label: '网点-1',
        settings: {
          enabled: true, color: '#999999', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          dotSize: 0.2, horizontalSpacing: 5, verticalSpacing: 5,
        },
      },
    ],
  },
  {
    id: '9',
    name: '网格纸.10mm',
    nameEn: 'Dot Grid 10mm',
    paperSettings: {},
    elements: [
      {
        id: 'dot-1', type: 'dot', label: '网点-1',
        settings: {
          enabled: true, color: '#999999', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          dotSize: 0.3, horizontalSpacing: 10, verticalSpacing: 10,
        },
      },
    ],
  },
  {
    id: '11',
    name: '漫画稿纸.A4',
    nameEn: 'Manga Paper A4',
    paperSettings: {},
    elements: [
      {
        id: 'intervalLine-1', type: 'intervalLine', label: '间隔线-1',
        settings: {
          enabled: true, color: '#99CCFF', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'solid', lineWidth: 0.05,
          spacing: 2, frameLineWidth: 0.5, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'intervalLine-2', type: 'intervalLine', label: '间隔线-2',
        settings: {
          enabled: true, color: '#99CCFF', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'vertical', lineStyle: 'solid', lineWidth: 0.05,
          spacing: 2, frameLineWidth: 0, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'intervalLine-3', type: 'intervalLine', label: '间隔线-3',
        settings: {
          enabled: true, color: '#99CCFF', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 10, frameLineWidth: 0, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'intervalLine-4', type: 'intervalLine', label: '间隔线-4',
        settings: {
          enabled: true, color: '#99CCFF', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'vertical', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 10, frameLineWidth: 0, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
    ],
  },
  {
    id: '12',
    name: '字练习',
    nameEn: 'Character Practice',
    paperSettings: {},
    elements: [
      {
        id: 'intervalLine-1', type: 'intervalLine', label: '间隔线-1',
        settings: {
          enabled: true, color: '#FF6666', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 20, frameLineWidth: 0.5, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'intervalLine-2', type: 'intervalLine', label: '间隔线-2',
        settings: {
          enabled: true, color: '#FF6666', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'vertical', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 20, frameLineWidth: 0, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'intervalLine-3', type: 'intervalLine', label: '间隔线-3',
        settings: {
          enabled: true, color: '#FFCCCC', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'dashed', dashGap: 1, lineWidth: 0.1,
          spacing: 20, frameStyle: 'none', frameLineWidth: 0, frameDashGap: 1,
        },
      },
      {
        id: 'diagonal-1', type: 'diagonal', label: '斜线-1',
        settings: {
          enabled: true, color: '#FFCCCC', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'top-left-bottom-right', lineStyle: 'dashed', dashGap: 1, lineWidth: 0.05,
          spacing: 20, frameStyle: 'none', frameLineWidth: 0, frameDashGap: 1,
        },
      },
    ],
  },
  {
    id: '13',
    name: '五线谱',
    nameEn: 'Staff Paper',
    paperSettings: {},
    elements: [
      {
        id: 'intervalLine-1', type: 'intervalLine', label: '间隔线-1',
        settings: {
          enabled: true, color: '#000000', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 2, frameLineWidth: 0, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'intervalLine-2', type: 'intervalLine', label: '间隔线-2',
        settings: {
          enabled: true, color: '#000000', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 2, frameLineWidth: 0, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'intervalLine-3', type: 'intervalLine', label: '间隔线-3',
        settings: {
          enabled: true, color: '#000000', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 2, frameLineWidth: 0, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'intervalLine-4', type: 'intervalLine', label: '间隔线-4',
        settings: {
          enabled: true, color: '#000000', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 2, frameLineWidth: 0, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'intervalLine-5', type: 'intervalLine', label: '间隔线-5',
        settings: {
          enabled: true, color: '#000000', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 18, frameLineWidth: 0, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
    ],
  },
  {
    id: '14',
    name: '稿纸',
    nameEn: 'Manuscript Paper',
    paperSettings: {},
    elements: [
      {
        id: 'intervalLine-1', type: 'intervalLine', label: '间隔线-1',
        settings: {
          enabled: true, color: '#FF6666', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 15, frameLineWidth: 0.5, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'intervalLine-2', type: 'intervalLine', label: '间隔线-2',
        settings: {
          enabled: true, color: '#FF6666', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'vertical', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 15, frameLineWidth: 0, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
    ],
  },
  {
    id: '15',
    name: '月计划表',
    nameEn: 'Monthly Planner',
    paperSettings: {},
    elements: [
      {
        id: 'intervalLine-1', type: 'intervalLine', label: '间隔线-1',
        settings: {
          enabled: true, color: '#999999', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'horizontal', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 10, frameLineWidth: 0.5, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
      {
        id: 'intervalLine-2', type: 'intervalLine', label: '间隔线-2',
        settings: {
          enabled: true, color: '#999999', offsetRight: 0, offsetDown: 0,
          rangeWidth: 2000, rangeHeight: 2000, ignoreMargin: false,
          direction: 'vertical', lineStyle: 'solid', lineWidth: 0.1,
          spacing: 25, frameLineWidth: 0, frameStyle: 'solid',
          dashGap: 1, frameDashGap: 1,
        },
      },
    ],
  },
];