import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../i18n';
import { useStore } from '../store/useStore';
import { presetTemplates } from '../templates';
import 'mdui/components/collapse.js';
import 'mdui/components/collapse-item.js';
import 'mdui/components/button.js';
import type { Collapse } from 'mdui/components/collapse.js';

export default function PresetTemplates() {
  const { t, i18n } = useTranslation();
  const loadTemplate = useStore((s) => s.loadTemplate);
  const [open, setOpen] = useState(false);
  const collapseRef = useRef<Collapse | null>(null);

  // mdui-collapse 为自定义元素，change 事件无法通过 React 的 onXxx 绑定，需 ref + addEventListener
  useEffect(() => {
    const el = collapseRef.current;
    if (!el) return;
    const handleChange = () => {
      const v = el.value;
      setOpen(Array.isArray(v) ? v.includes('templates') : v === 'templates');
    };
    el.addEventListener('change', handleChange);
    return () => el.removeEventListener('change', handleChange);
  }, []);

  const getTemplateName = (tpl: (typeof presetTemplates)[0]) => {
    if (i18n.language === 'en') return tpl.nameEn;
    return tpl.name;
  };

  return (
    <div className="preset-templates">
      <mdui-collapse ref={collapseRef}>
        <mdui-collapse-item value="templates">
          <div
            slot="header"
            className="preset-templates__header"
            aria-expanded={open}
            aria-controls="preset-templates-grid"
          >
            <span className="preset-templates__header-title">{t('templates.title')}</span>
            <svg
              className={`preset-templates__chevron${open ? ' preset-templates__chevron--open' : ''}`}
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path d="M7 10l5 5 5-5z" fill="currentColor" />
            </svg>
          </div>

          <div id="preset-templates-grid" className="preset-templates__grid">
            {presetTemplates.map((tpl) => (
              <mdui-button
                key={tpl.id}
                variant="outlined"
                className="preset-templates__btn"
                onClick={() => loadTemplate(tpl)}
                title={tpl.nameEn}
              >
                {getTemplateName(tpl)}
              </mdui-button>
            ))}
          </div>
        </mdui-collapse-item>
      </mdui-collapse>
    </div>
  );
}