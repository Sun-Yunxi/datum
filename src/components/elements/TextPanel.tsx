import { useStore } from '../../store/useStore';
import { useTranslation } from '../../i18n';
import Md3ColorPicker from '../Md3ColorPicker';
import Md3Switch from '../Md3Switch';
import Md3Toggle from '../Md3Toggle';
import NumberInput from '../NumberInput';
import FontSelect from '../FontSelect';
import type {
  ElementInstance, TextSettings, TitleBlockSettings, SingleTextBlockSettings,
  PageNumberBlockSettings, TextMode, PageNumberStyle, PageNumberPlacement,
  VerticalPosition, HorizontalPosition, PageVisibility,
} from '../../types';

/**
 * 字体样式（加粗 / 斜体）：紧跟在字体选择/上传框下方，三种模式共用同一份设置。
 * 内置字体按组合选择对应字形（仅斜体时倾斜 Regular）；自定义字体按上传文件原样输出。
 */
function TextStyleFields({
  bold, italic, onChange,
}: {
  bold: boolean;
  italic: boolean;
  onChange: (patch: { bold: boolean } | { italic: boolean }) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.bold')}</label>
        <Md3Switch checked={bold} onChange={(v) => onChange({ bold: v })} />
      </div>
      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.italic')}</label>
        <Md3Switch checked={italic} onChange={(v) => onChange({ italic: v })} />
      </div>
    </>
  );
}

/**
 * 整合后的「文字」模块面板：
 * 在一个模块内通过「切换模式」在 标题 / 页码 / 单文字 三种模式间切换，
 * 颜色与启用状态三种模式共用，其余字段按模式分组、各自独立记忆。
 */
export default function TextPanel({ instance }: { instance: ElementInstance }) {
  const { t } = useTranslation();
  const updateElement = useStore((s) => s.updateElement);
  const paperSettings = useStore((s) => s.paperSettings);
  const settings = instance.settings as TextSettings;

  const update = (patch: Partial<TextSettings>) => updateElement(instance.id, patch);
  const updateTitle = (patch: Partial<TitleBlockSettings>) =>
    update({ title: { ...settings.title, ...patch } });
  const updateSingle = (patch: Partial<SingleTextBlockSettings>) =>
    update({ single: { ...settings.single, ...patch } });
  const updatePageNumber = (patch: Partial<PageNumberBlockSettings>) =>
    update({ pageNumber: { ...settings.pageNumber, ...patch } });

  const alignOptions = [
    { value: 'left', label: t('elements.left') },
    { value: 'center', label: t('elements.center') },
    { value: 'right', label: t('elements.right') },
  ];

  return (
    <div className="element-fields">
      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.enabled')}</label>
        <Md3Switch checked={settings.enabled} onChange={(v) => update({ enabled: v })} />
      </div>

      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.mode')}</label>
        <Md3Toggle
          options={[
            { value: 'title', label: t('elements.modeTitle') },
            { value: 'pageNumber', label: t('elements.modePageNumber') },
            { value: 'singleText', label: t('elements.modeSingleText') },
          ]}
          value={settings.mode}
          onChange={(v) => update({ mode: v as TextMode })}
        />
      </div>

      {/* 颜色为三种模式共用 */}
      <div className="element-panel__field">
        <label className="element-panel__label">{t('elements.color')}</label>
        <Md3ColorPicker value={settings.color} onChange={(v) => update({ color: v })} />
      </div>

      {settings.mode === 'title' && (
        <>
          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.text')}</label>
            <input
              type="text"
              className="element-panel__text"
              value={settings.title.text}
              onChange={(e) => updateTitle({ text: e.target.value })}
            />
          </div>

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.fontSize')}</label>
            <NumberInput
              className="element-panel__number"
              value={settings.title.fontSize}
              step={0.1}
              min={0}
              onChange={(v) => updateTitle({ fontSize: v })}
            />
          </div>

          <FontSelect value={settings.fontId} onChange={(v) => update({ fontId: v })} />
          <TextStyleFields
            bold={settings.bold}
            italic={settings.italic}
            onChange={(patch) => update(patch)}
          />

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.direction')}</label>
            <Md3Toggle
              options={[
                { value: 'horizontal', label: t('elements.horizontal') },
                { value: 'vertical', label: t('elements.vertical') },
              ]}
              value={settings.title.direction}
              onChange={(v) => updateTitle({ direction: v as 'horizontal' | 'vertical' })}
            />
          </div>

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.verticalPosition')}</label>
            <Md3Toggle
              options={[
                { value: 'top', label: t('elements.top') },
                { value: 'middle', label: t('elements.middle') },
                { value: 'bottom', label: t('elements.bottom') },
              ]}
              value={settings.title.verticalPosition}
              onChange={(v) => updateTitle({ verticalPosition: v as VerticalPosition })}
            />
          </div>

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.horizontalPosition')}</label>
            <Md3Toggle
              options={alignOptions}
              value={settings.title.horizontalPosition}
              onChange={(v) => updateTitle({ horizontalPosition: v as HorizontalPosition })}
            />
          </div>

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.margin')}</label>
            <NumberInput
              className="element-panel__number"
              value={settings.title.margin}
              step={0.1}
              min={0}
              onChange={(v) => updateTitle({ margin: v })}
            />
          </div>

          {paperSettings.duplexEnabled && (
            <div className="element-panel__field">
              <label className="element-panel__label">{t('elements.pageVisibility')}</label>
              <Md3Toggle
                options={[
                  { value: 'both', label: t('elements.both') },
                  { value: 'odd', label: t('elements.odd') },
                  { value: 'even', label: t('elements.even') },
                ]}
                value={settings.title.pageVisibility}
                onChange={(v) => updateTitle({ pageVisibility: v as PageVisibility })}
              />
            </div>
          )}
        </>
      )}

      {settings.mode === 'pageNumber' && (
        <>
          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.fontSize')}</label>
            <NumberInput
              className="element-panel__number"
              value={settings.pageNumber.fontSize}
              step={0.1}
              min={0}
              onChange={(v) => updatePageNumber({ fontSize: v })}
            />
          </div>

          <FontSelect value={settings.fontId} onChange={(v) => update({ fontId: v })} />
          <TextStyleFields
            bold={settings.bold}
            italic={settings.italic}
            onChange={(patch) => update(patch)}
          />

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.pageNumberStyle')}</label>
            <Md3Toggle
              options={[
                { value: 'number', label: t('elements.styleNumber') },
                { value: 'pageX', label: t('elements.stylePageX') },
                { value: 'xOfY', label: t('elements.styleXY') },
                { value: 'roman', label: t('elements.styleRoman') },
              ]}
              value={settings.pageNumber.style}
              onChange={(v) => updatePageNumber({ style: v as PageNumberStyle })}
            />
          </div>

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.displayPosition')}</label>
            <Md3Toggle
              options={[
                { value: 'header', label: t('elements.header') },
                { value: 'footer', label: t('elements.footer') },
              ]}
              value={settings.pageNumber.placement}
              onChange={(v) => updatePageNumber({ placement: v as PageNumberPlacement })}
            />
          </div>

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.align')}</label>
            <Md3Toggle
              options={alignOptions}
              value={settings.pageNumber.align}
              onChange={(v) => updatePageNumber({ align: v as HorizontalPosition })}
            />
          </div>

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.pageStartPosition')}</label>
            <NumberInput
              className="element-panel__number"
              value={settings.pageNumber.startDisplayPage}
              step={1}
              min={1}
              integer
              onChange={(v) => updatePageNumber({ startDisplayPage: v })}
            />
          </div>

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.startPageNumber')}</label>
            <NumberInput
              className="element-panel__number"
              value={settings.pageNumber.startNumber}
              step={1}
              min={0}
              integer
              onChange={(v) => updatePageNumber({ startNumber: v })}
            />
          </div>

          {paperSettings.duplexEnabled && (
            <div className="element-panel__field">
              <label className="element-panel__label">{t('elements.pageVisibility')}</label>
              <Md3Toggle
                options={[
                  { value: 'both', label: t('elements.both') },
                  { value: 'odd', label: t('elements.odd') },
                  { value: 'even', label: t('elements.even') },
                ]}
                value={settings.pageNumber.pageVisibility}
                onChange={(v) => updatePageNumber({ pageVisibility: v as PageVisibility })}
              />
            </div>
          )}
        </>
      )}

      {settings.mode === 'singleText' && (
        <>
          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.offsetRight')}</label>
            <NumberInput
              className="element-panel__number"
              value={settings.single.offsetRight}
              step={0.1}
              onChange={(v) => updateSingle({ offsetRight: v })}
            />
          </div>

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.offsetDown')}</label>
            <NumberInput
              className="element-panel__number"
              value={settings.single.offsetDown}
              step={0.1}
              onChange={(v) => updateSingle({ offsetDown: v })}
            />
          </div>

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.rangeWidth')}</label>
            <NumberInput
              className="element-panel__number"
              value={settings.single.rangeWidth}
              step={0.1}
              min={0}
              onChange={(v) => updateSingle({ rangeWidth: v })}
            />
          </div>

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.rangeHeight')}</label>
            <NumberInput
              className="element-panel__number"
              value={settings.single.rangeHeight}
              step={0.1}
              min={0}
              onChange={(v) => updateSingle({ rangeHeight: v })}
            />
          </div>

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.ignoreMargin')}</label>
            <Md3Switch
              checked={settings.single.ignoreMargin}
              onChange={(v) => updateSingle({ ignoreMargin: v })}
            />
          </div>

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.text')}</label>
            <input
              type="text"
              className="element-panel__text"
              value={settings.single.text}
              onChange={(e) => updateSingle({ text: e.target.value })}
            />
          </div>

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.fontSize')}</label>
            <NumberInput
              className="element-panel__number"
              value={settings.single.fontSize}
              step={0.1}
              min={0}
              onChange={(v) => updateSingle({ fontSize: v })}
            />
          </div>

          <FontSelect value={settings.fontId} onChange={(v) => update({ fontId: v })} />
          <TextStyleFields
            bold={settings.bold}
            italic={settings.italic}
            onChange={(patch) => update(patch)}
          />

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.angle')}</label>
            <NumberInput
              className="element-panel__number"
              value={settings.single.angle}
              min={0}
              max={360}
              step={1}
              onChange={(v) => updateSingle({ angle: v })}
            />
          </div>

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.repeatCount')}</label>
            <NumberInput
              className="element-panel__number"
              value={settings.single.repeatCount}
              min={0}
              step={1}
              integer
              onChange={(v) => updateSingle({ repeatCount: v })}
            />
          </div>

          <div className="element-panel__field">
            <label className="element-panel__label">{t('elements.repeatDirection')}</label>
            <Md3Toggle
              options={[
                { value: 'horizontal', label: t('elements.horizontal') },
                { value: 'vertical', label: t('elements.vertical') },
              ]}
              value={settings.single.repeatDirection}
              onChange={(v) => updateSingle({ repeatDirection: v as 'horizontal' | 'vertical' })}
            />
          </div>
        </>
      )}
    </div>
  );
}