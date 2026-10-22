import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n';
import Md3ColorPicker from './Md3ColorPicker';
import Md3Toggle from './Md3Toggle';
import Md3Select from './Md3Select';
import Md3Switch from './Md3Switch';
import Md3Collapse from './Md3Collapse';
import NumberInput from './NumberInput';
import type { PaperType } from '../types';

const PAPER_TYPES: PaperType[] = [
  'A0', 'A1', 'A2', 'A3', 'A4', 'A5',
  'B0', 'B1', 'B2', 'B3', 'B4', 'B5',
  'Letter', 'Legal', 'JuniorLegal', 'Ledger', 'Tabloid',
  'Other',
];

type MarginField = 'marginLeft' | 'marginRight' | 'marginTop' | 'marginBottom';

export default function PaperSettings() {
  const { t } = useTranslation();
  const paperSettings = useStore((s) => s.paperSettings);
  const setPaperSettings = useStore((s) => s.setPaperSettings);

  const renderMarginGroup = (
    title: string,
    prefix: '' | 'Even',
    fields: MarginField[],
    values: Record<string, number>,
  ) => (
    <>
      <label className="paper-settings__label">{title}</label>
      <div className="paper-settings__margin-grid">
        {fields.map((field) => {
          const key = prefix ? `${field}${prefix}` : field;
          return (
            <div key={key} className="paper-settings__margin-item">
              <div className="paper-settings__outlined-field">
                <NumberInput
                  id={`margin-${key}`}
                  placeholder=" "
                  value={values[key]}
                  min={0}
                  step={0.1}
                  onChange={(v) => setPaperSettings({ [key]: v } as any)}
                />
                <label htmlFor={`margin-${key}`}>{t(`paper.${field}`)}</label>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const marginFields: MarginField[] = ['marginLeft', 'marginRight', 'marginTop', 'marginBottom'];
  const marginValues: Record<string, number> = {};
  for (const f of marginFields) {
    marginValues[f] = paperSettings[f];
    marginValues[`${f}Even`] = (paperSettings as any)[`${f}Even`];
  }

  return (
    <div className="paper-settings">
      <h2 className="paper-settings__title">{t('paper.title')}</h2>

      {/* Paper Type */}
      <div className="element-panel__field">
        <label className="element-panel__label">{t('paper.type')}</label>
        <Md3Select
          value={paperSettings.paperType}
          onChange={(v) => setPaperSettings({ paperType: v as PaperType })}
          options={PAPER_TYPES.map((pt) => ({ value: pt, label: pt }))}
          ariaLabel={t('paper.type')}
        />
      </div>

      {/* Custom Width/Height - only when paperType is 'Other' */}
      <Md3Collapse open={paperSettings.paperType === 'Other'}>
        <div className="element-panel__field">
          <label className="element-panel__label">{t('paper.customWidth')}</label>
          <NumberInput
            value={paperSettings.customWidth}
            min={0}
            step={0.1}
            onChange={(v) => setPaperSettings({ customWidth: v })}
          />
        </div>
        <div className="element-panel__field">
          <label className="element-panel__label">{t('paper.customHeight')}</label>
          <NumberInput
            value={paperSettings.customHeight}
            min={0}
            step={0.1}
            onChange={(v) => setPaperSettings({ customHeight: v })}
          />
        </div>
      </Md3Collapse>

      {/* Orientation */}
      <div className="element-panel__field">
        <label className="element-panel__label">{t('paper.orientation')}</label>
        <Md3Toggle
          options={[
            { value: 'portrait', label: t('paper.portrait') },
            { value: 'landscape', label: t('paper.landscape') },
          ]}
          value={paperSettings.orientation}
          onChange={(v) => setPaperSettings({ orientation: v as 'portrait' | 'landscape' })}
        />
      </div>

      {/* Copies */}
      <div className="element-panel__field">
        <label className="element-panel__label">{t('paper.copies')}</label>
        <NumberInput
          value={paperSettings.copies}
          min={0}
          max={50}
          step={1}
          integer
          onChange={(v) => setPaperSettings({ copies: v })}
        />
      </div>

      {/* Duplex switch */}
      <div className="element-panel__field">
        <label className="element-panel__label">{t('paper.duplex')}</label>
        <Md3Switch
          checked={paperSettings.duplexEnabled}
          onChange={(v) => setPaperSettings({ duplexEnabled: v })}
          ariaLabel={t('paper.duplex')}
        />
      </div>

      {/* Margins */}
      <div className="paper-settings__field">
        {renderMarginGroup(
          paperSettings.duplexEnabled ? t('paper.marginOdd') : t('paper.margin'),
          '',
          marginFields,
          marginValues,
        )}
        <Md3Collapse open={paperSettings.duplexEnabled}>
          <div style={{ marginTop: 12 }}>
            {renderMarginGroup(t('paper.marginEven'), 'Even', marginFields, marginValues)}
          </div>
        </Md3Collapse>
      </div>

      {/* Background Color */}
      <div className="element-panel__field">
        <label className="element-panel__label">{t('paper.backgroundColor')}</label>
        <Md3ColorPicker value={paperSettings.backgroundColor} onChange={(v) => setPaperSettings({ backgroundColor: v })} />
      </div>
    </div>
  );
}