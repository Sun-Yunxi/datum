﻿﻿﻿
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../i18n';
import Md3ColorPicker from '../Md3ColorPicker';
import Md3Switch from '../Md3Switch';
import NumberInput from '../NumberInput';
import type { ElementInstance, BlockSettings } from '../../types';

export default function BlockPanel({ instance }: { instance: ElementInstance }) {
  const { t } = useTranslation();
  const updateElement = useStore((s) => s.updateElement);
  const settings = instance.settings as BlockSettings;

  const update = (patch: Partial<BlockSettings>) => {
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
        <label className="element-panel__label">{t('elements.width')}</label>
        <NumberInput
          className="element-panel__number"
          value={settings.width}
          step={0.1}
          min={0}
          onChange={(v) => update({ width: v })}
        />
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.height')}</label>
        <NumberInput
          className="element-panel__number"
          value={settings.height}
          step={0.1}
          min={0}
          onChange={(v) => update({ height: v })}
        />
      </div>
    </div>
  );
}