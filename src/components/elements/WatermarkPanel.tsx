import { useRef } from 'react';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../i18n';
import NumberInput from '../NumberInput';
import Md3Slider from '../Md3Slider';
import Md3Switch from '../Md3Switch';
import 'mdui/components/button.js';
import type { ElementInstance, WatermarkSettings } from '../../types';

export default function WatermarkPanel({ instance }: { instance: ElementInstance }) {
  const { t } = useTranslation();
  const updateElement = useStore((s) => s.updateElement);
  const settings = instance.settings as WatermarkSettings;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<WatermarkSettings>) => {
    updateElement(instance.id, patch);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      update({ imageData: reader.result as string });
    };
    reader.readAsDataURL(file);
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
        <label className="element-panel__label">{t('elements.uploadImage')}</label>
        <div className="element-panel__upload">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {settings.imageData && (
            <span className="element-panel__note element-panel__upload-note">
              {t('elements.imageSelected')}
            </span>
          )}
          <mdui-button
            variant="filled"
            className="element-panel__upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            {t('elements.chooseFile')}
          </mdui-button>
        </div>
      </div>

      {settings.imageData && (
        <div className="element-panel__field">
          <label className="element-panel__label" />
          <img
            src={settings.imageData}
            alt="preview"
            style={{ maxWidth: 80, maxHeight: 80, borderRadius: 4, border: '1px solid rgb(var(--md-outline-variant))' }}
          />
        </div>
      )}

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.width')}</label>
        <NumberInput
          className="element-panel__number"
          value={settings.width}
          step={1}
          min={0}
          onChange={(v) => update({ width: v })}
        />
        <span className="element-panel__note" style={{ marginLeft: 4, marginBottom: 0 }}>mm</span>
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.opacity')}</label>
        <Md3Slider
          value={settings.opacity}
          min={0}
          max={100}
          step={1}
          ariaLabel={t('elements.opacity')}
          onChange={(v) => update({ opacity: v })}
        />
        <span className="element-panel__note" style={{ minWidth: 36, textAlign: 'right', marginLeft: 4, marginBottom: 0 }}>{settings.opacity}%</span>
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.offsetRight')}</label>
        <NumberInput
          className="element-panel__number"
          value={settings.offsetRight}
          step={0.1}
          onChange={(v) => update({ offsetRight: v })}
        />
        <span className="element-panel__note" style={{ marginLeft: 4, marginBottom: 0 }}>mm</span>
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.offsetDown')}</label>
        <NumberInput
          className="element-panel__number"
          value={settings.offsetDown}
          step={0.1}
          onChange={(v) => update({ offsetDown: v })}
        />
        <span className="element-panel__note" style={{ marginLeft: 4, marginBottom: 0 }}>mm</span>
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.ignoreMargin')}</label>
        <Md3Switch
          checked={settings.ignoreMargin}
          onChange={(v) => update({ ignoreMargin: v })}
        />
      </div>
    </div>
  );
}