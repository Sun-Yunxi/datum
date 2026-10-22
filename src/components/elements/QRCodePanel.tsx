﻿﻿﻿
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../i18n';
import Md3ColorPicker from '../Md3ColorPicker';
import Md3Switch from '../Md3Switch';
import NumberInput from '../NumberInput';
import type { ElementInstance, QRCodeSettings } from '../../types';

export default function QRCodePanel({ instance }: { instance: ElementInstance }) {
  const { t } = useTranslation();
  const updateElement = useStore((s) => s.updateElement);
  const settings = instance.settings as QRCodeSettings;

  const update = (patch: Partial<QRCodeSettings>) => {
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
        <label className="element-panel__label">{t('elements.content')}</label>
        <input
          type="text"
          className="element-panel__text"
          value={settings.content}
          onChange={(e) => update({ content: e.target.value })}
        />
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.size')}</label>
        <NumberInput
          className="element-panel__number"
          value={settings.size}
          step={0.1}
          min={0}
          onChange={(v) => update({ size: v })}
        />
      </div>
    </div>
  );
}