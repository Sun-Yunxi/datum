import { useState } from 'react';
import { useTranslation } from '../i18n';
import { useStore } from '../store/useStore';
import Md3Select from './Md3Select';
import 'mdui/components/button.js';
import 'mdui/components/button-icon.js';
import type { ElementInstance, ElementType } from '../types';
import IntervalLinePanel from './elements/IntervalLinePanel';
import DiagonalPanel from './elements/DiagonalPanel';
import DotPanel from './elements/DotPanel';
import SingleLinePanel from './elements/SingleLinePanel';
import BlockPanel from './elements/BlockPanel';
import CirclePanel from './elements/CirclePanel';
import QRCodePanel from './elements/QRCodePanel';
import WatermarkPanel from './elements/WatermarkPanel';
import TextPanel from './elements/TextPanel';

const panelComponents: Record<ElementType, React.ComponentType<{ instance: ElementInstance }>> = {
  intervalLine: IntervalLinePanel,
  diagonal: DiagonalPanel,
  dot: DotPanel,
  singleLine: SingleLinePanel,
  block: BlockPanel,
  circle: CirclePanel,
  qrCode: QRCodePanel,
  watermark: WatermarkPanel,
  text: TextPanel,
};

const allTypes: ElementType[] = [
  'intervalLine', 'diagonal', 'dot', 'singleLine', 'text', 'block', 'circle', 'qrCode', 'watermark',
];

// 移除动画时长，需与 App.css 中 .element-item--leaving 的过渡时长保持一致
const EXIT_ANIMATION_MS = 300;

const AddIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
  </svg>
);

const RemoveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor" />
  </svg>
);

const CopyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor" />
  </svg>
);

export default function ElementPanel() {
  const { t } = useTranslation();
  const elements = useStore((s) => s.elements);
  const addElement = useStore((s) => s.addElement);
  const removeElement = useStore((s) => s.removeElement);
  const duplicateElement = useStore((s) => s.duplicateElement);

  const [selectedType, setSelectedType] = useState<ElementType>('intervalLine');
  // 正在播放移除动画、尚未真正从列表删除的模块 id
  const [removingIds, setRemovingIds] = useState<string[]>([]);

  // 点击移除：先标记为“离场”播放收起动画，动画结束后再从 store 删除
  const handleRemove = (id: string) => {
    setRemovingIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    window.setTimeout(() => {
      removeElement(id);
      setRemovingIds((ids) => ids.filter((x) => x !== id));
    }, EXIT_ANIMATION_MS);
  };

  // 按出现顺序为同类型模块编号（用于区分类似模块）
  const ordinalMap: Record<string, number> = {};

  return (
    <div className="element-panel">
      <h3>{t('elements.title')}</h3>

      {/* 顶部添加模块控件 */}
      <div className="element-add-bar">
        <Md3Select
          value={selectedType}
          onChange={(v) => setSelectedType(v as ElementType)}
          options={allTypes.map((type) => ({ value: type, label: t(`elements.${type}`) }))}
          ariaLabel={t('elements.title')}
        />
        <mdui-button
          variant="filled"
          className="element-add-bar__btn"
          onClick={() => addElement(selectedType)}
        >
          <span slot="icon"><AddIcon /></span>
          {t('elements.add')}
        </mdui-button>
      </div>

      {elements.length === 0 ? (
        <div className="element-empty">{t('elements.empty')}</div>
      ) : (
        <div className="element-list">
          {elements.map((el) => {
            const Panel = panelComponents[el.type];
            ordinalMap[el.type] = (ordinalMap[el.type] || 0) + 1;
            const ordinal = ordinalMap[el.type];
            const leaving = removingIds.includes(el.id);
            return (
              <div
                key={el.id}
                className={`element-item${leaving ? ' element-item--leaving' : ''}`}
              >
                <div className="element-instance">
                  <div className="element-instance__header">
                    <span className="element-instance__title">
                      {t(`elements.${el.type}`)}
                      <span className="element-instance__index">{ordinal}</span>
                    </span>
                    <div className="element-instance__actions">
                      <mdui-button-icon
                        className="element-icon-btn"
                        title={t('elements.duplicate')}
                        aria-label={t('elements.duplicate')}
                        onClick={() => duplicateElement(el.id)}
                      >
                        <CopyIcon />
                      </mdui-button-icon>
                      <mdui-button-icon
                        className="element-icon-btn"
                        title={t('elements.addSame')}
                        aria-label={t('elements.addSame')}
                        onClick={() => addElement(el.type)}
                      >
                        <AddIcon />
                      </mdui-button-icon>
                      <mdui-button-icon
                        className="element-icon-btn element-icon-btn--remove"
                        title={t('elements.remove')}
                        aria-label={t('elements.remove')}
                        onClick={() => handleRemove(el.id)}
                      >
                        <RemoveIcon />
                      </mdui-button-icon>
                    </div>
                  </div>
                  <Panel instance={el} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}