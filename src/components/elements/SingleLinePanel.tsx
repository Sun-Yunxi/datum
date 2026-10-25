import { useStore } from '../../store/useStore';
import { useTranslation } from '../../i18n';
import Md3ColorPicker from '../Md3ColorPicker';
import Md3Switch from '../Md3Switch';
import Md3Toggle from '../Md3Toggle';
import NumberInput from '../NumberInput';
import type { ElementInstance, SingleLineSettings } from '../../types';

export default function SingleLinePanel({ instance }: { instance: ElementInstance }) {
  const { t } = useTranslation();
  const updateElement = useStore((s) => s.updateElement);
  const settings = instance.settings as SingleLineSettings;

  const update = (patch: Partial<SingleLineSettings>) => {
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
        <label className="element-panel__label">{t('elements.startX')}</label>
        <NumberInput
          className="element-panel__number"
          value={settings.startX}
          step={0.1}
          onChange={(v) => update({ startX: v })}
        />
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.startY')}</label>
        <NumberInput
          className="element-panel__number"
          value={settings.startY}
          step={0.1}
          onChange={(v) => update({ startY: v })}
        />
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.endX')}</label>
        <NumberInput
          className="element-panel__number"
          value={settings.endX}
          step={0.1}
          onChange={(v) => update({ endX: v })}
        />
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.endY')}</label>
        <NumberInput
          className="element-panel__number"
          value={settings.endY}
          step={0.1}
          onChange={(v) => update({ endY: v })}
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
    </div>
  );
}