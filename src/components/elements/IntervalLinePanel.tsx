﻿import { useStore } from '../../store/useStore';
import { useTranslation } from '../../i18n';
import Md3ColorPicker from '../Md3ColorPicker';
import Md3Switch from '../Md3Switch';
import Md3Toggle from '../Md3Toggle';
import Md3Collapse from '../Md3Collapse';
import NumberInput from '../NumberInput';
import type { ElementInstance, IntervalLineSettings, FrameStyle } from '../../types';

export default function IntervalLinePanel({ instance }: { instance: ElementInstance }) {
  const { t } = useTranslation();
  const updateElement = useStore((s) => s.updateElement);
  const settings = instance.settings as IntervalLineSettings;

  const update = (patch: Partial<IntervalLineSettings>) => {
    updateElement(instance.id, patch);
  };

  return (
    <div className="element-fields">
      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.enabled')}</label>
        <Md3Switch
          checked={settings.enabled}
          onChange={(v) => update({ enabled: v })}
        />
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.color')}</label>
        <Md3ColorPicker value={settings.color} onChange={(v) => update({ color: v })} />
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.offsetRight')}</label>
        <NumberInput
          className="element-panel__number"
          value={settings.offsetRight}
          step={0.1}
          onChange={(v) => update({ offsetRight: v })}
        />
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.offsetDown')}</label>
        <NumberInput
          className="element-panel__number"
          value={settings.offsetDown}
          step={0.1}
          onChange={(v) => update({ offsetDown: v })}
        />
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.rangeWidth')}</label>
        <NumberInput
          className="element-panel__number"
          value={settings.rangeWidth}
          step={0.1}
          min={0}
          onChange={(v) => update({ rangeWidth: v })}
        />
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.rangeHeight')}</label>
        <NumberInput
          className="element-panel__number"
          value={settings.rangeHeight}
          step={0.1}
          min={0}
          onChange={(v) => update({ rangeHeight: v })}
        />
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.ignoreMargin')}</label>
        <Md3Switch
          checked={settings.ignoreMargin}
          onChange={(v) => update({ ignoreMargin: v })}
        />
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.direction')}</label>
        <Md3Toggle
          options={[
            { value: 'horizontal', label: t('elements.horizontal') },
            { value: 'vertical', label: t('elements.vertical') },
          ]}
          value={settings.direction}
          onChange={(v) => update({ direction: v as 'horizontal' | 'vertical' })}
        />
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.lineStyle')}</label>
        <Md3Toggle
          options={[
            { value: 'solid', label: t('elements.solid') },
            { value: 'dashed', label: t('elements.dashed') },
          ]}
          value={settings.lineStyle}
          onChange={(v) => update({ lineStyle: v as 'solid' | 'dashed' })}
        />
      </div>

      {/* 线条样式为虚线时，才显示虚线间隔 */}
      <Md3Collapse open={settings.lineStyle === 'dashed'}>
        <div className="element-panel__field">
          <label className="element-panel__label">{t('elements.dashGap')}</label>
          <NumberInput
            className="element-panel__number"
            value={settings.dashGap}
            step={0.1}
            min={0}
            onChange={(v) => update({ dashGap: v })}
          />
        </div>
      </Md3Collapse>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.lineWidth')}</label>
        <NumberInput
          className="element-panel__number"
          value={settings.lineWidth}
          step={0.1}
          min={0}
          onChange={(v) => update({ lineWidth: v })}
        />
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.spacing')}</label>
        <NumberInput
          className="element-panel__number"
          value={settings.spacing}
          step={0.1}
          min={0}
          onChange={(v) => update({ spacing: v })}
        />
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.frameStyle')}</label>
        <Md3Toggle
          options={[
            { value: 'none', label: t('elements.none') },
            { value: 'solid', label: t('elements.solid') },
            { value: 'dashed', label: t('elements.dashed') },
          ]}
          value={settings.frameStyle}
          onChange={(v) => update({ frameStyle: v as FrameStyle })}
        />
      </div>

      {/* 外框粗细：外框样式为实线或虚线时显示 */}
      <Md3Collapse open={settings.frameStyle !== 'none'}>
        <div className="element-panel__field">
          <label className="element-panel__label">{t('elements.frameLineWidth')}</label>
          <NumberInput
            className="element-panel__number"
            value={settings.frameLineWidth}
            step={0.1}
            min={0}
            onChange={(v) => update({ frameLineWidth: v })}
          />
        </div>
      </Md3Collapse>

      {/* 外框虚线间隔：仅外框样式为虚线时显示 */}
      <Md3Collapse open={settings.frameStyle === 'dashed'}>
        <div className="element-panel__field">
          <label className="element-panel__label">{t('elements.frameDashGap')}</label>
          <NumberInput
            className="element-panel__number"
            value={settings.frameDashGap}
            step={0.1}
            min={0}
            onChange={(v) => update({ frameDashGap: v })}
          />
        </div>
      </Md3Collapse>
    </div>
  );
}
