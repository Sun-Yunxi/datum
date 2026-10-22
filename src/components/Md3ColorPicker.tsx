import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import Md3Toggle from './Md3Toggle';

/* ========== Color Conversion Utilities ========== */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.round(Math.max(0, Math.min(255, n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const nr = r / 255, ng = g / 255, nb = b / 255;
  const max = Math.max(nr, ng, nb), min = Math.min(nr, ng, nb);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case nr: h = ((ng - nb) / d + (ng < nb ? 6 : 0)) / 6; break;
      case ng: h = ((nb - nr) / d + 2) / 6; break;
      case nb: h = ((nr - ng) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const nh = ((h % 360) + 360) % 360;
  const ns = s / 100, nl = l / 100;
  const c = (1 - Math.abs(2 * nl - 1)) * ns;
  const x = c * (1 - Math.abs((nh / 60) % 2 - 1));
  const m = nl - c / 2;
  let r = 0, g = 0, b = 0;
  if (nh < 60) { r = c; g = x; }
  else if (nh < 120) { r = x; g = c; }
  else if (nh < 180) { g = c; b = x; }
  else if (nh < 240) { g = x; b = c; }
  else if (nh < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/* ========== Preset Colors (MD3 Tonal Palette) ========== */

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#808080', '#C8C8C8', '#9BB7D4', '#A8E6CF', '#A0D2EB',
  '#C0392B', '#E67E22', '#27AE60', '#2980B9', '#8E44AD', '#FFD3E0', '#B8D8BE',
];

type ColorMode = 'hex' | 'rgb' | 'hsl';

interface Props {
  value: string;
  onChange: (hex: string) => void;
  id?: string;
}

export default function Md3ColorPicker({ value, onChange, id }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ColorMode>('hex');

  /* ---- Popover anchor: auto-flip based on viewport edges ---- */
  const [popoverAnchor, setPopoverAnchor] = useState<{ v: 'bottom' | 'top'; h: 'left' | 'right' }>({ v: 'bottom', h: 'left' });

  useLayoutEffect(() => {
    if (!open || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 308;
    const popoverHeight = 460; // estimated popover height
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const v = (containerRect.bottom + gap + popoverHeight > vh && containerRect.top - gap - popoverHeight > 0) ? 'top' : 'bottom';
    const h = (containerRect.left + popoverWidth > vw && containerRect.right - popoverWidth > 0) ? 'right' : 'left';

    setPopoverAnchor({ v, h });
  }, [open]);

  /* ---- Core color state (hue/sat/lightness isolated) ---- */
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(0);
  const [lightness, setLightness] = useState(0);

  /* ---- Raw input strings (allow out-of-range during editing) ---- */
  const [hexRaw, setHexRaw] = useState('');
  const [rRaw, setRRaw] = useState('0');
  const [gRaw, setGRaw] = useState('0');
  const [bRaw, setBRaw] = useState('0');
  const [hRaw, setHRaw] = useState('0');
  const [sRaw, setSRaw] = useState('0');
  const [lRaw, setLRaw] = useState('0');

  /* ---- Refs for stable drag access & stale-closure safety ---- */
  const containerRef = useRef<HTMLDivElement>(null);
  const satCanvasRef = useRef<HTMLCanvasElement>(null);
  const hueCanvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef<'sat' | 'hue' | null>(null);
  const hueRef = useRef(hue);
  const satRef = useRef(sat);
  const lightnessRef = useRef(lightness);
  const onChangeRef = useRef(onChange);
  // Raw string refs for blur clamping (avoid stale closure)
  const rRef = useRef('0');
  const gRef = useRef('0');
  const bRef = useRef('0');
  const hRef = useRef('0');
  const sRef = useRef('0');
  const lRef = useRef('0');

  hueRef.current = hue;
  satRef.current = sat;
  lightnessRef.current = lightness;
  onChangeRef.current = onChange;

  /* ========== Grayscale-aware sync from external value ========== */

  const syncRawInputs = useCallback((hex: string, h: number, s: number, l: number, r: number, g: number, b: number) => {
    setHexRaw(hex);
    setRRaw(String(r)); rRef.current = String(r);
    setGRaw(String(g)); gRef.current = String(g);
    setBRaw(String(b)); bRef.current = String(b);
    setHRaw(String(Math.round(h))); hRef.current = String(Math.round(h));
    setSRaw(String(Math.round(s))); sRef.current = String(Math.round(s));
    setLRaw(String(Math.round(l))); lRef.current = String(Math.round(l));
  }, []);

  const syncFromHex = useCallback((hex: string) => {
    const [r, g, b] = hexToRgb(hex);
    const [h, s, l] = rgbToHsl(r, g, b);
    // Grayscale protection: when R=G=B (S=0), preserve current hue
    const finalHue = (s === 0) ? hueRef.current : h;
    setHue(finalHue);
    setSat(s);
    setLightness(l);
    syncRawInputs(hex, finalHue, s, l, r, g, b);
  }, [syncRawInputs]);

  useEffect(() => {
    syncFromHex(value);
  }, [value, syncFromHex]);

  /* ========== Notify parent (always respects grayscale protection) ========== */

  const notifyColor = useCallback((h: number, s: number, l: number) => {
    const [r, g, b] = hslToRgb(h, s, l);
    const hex = rgbToHex(r, g, b);
    setHexRaw(hex);
    setRRaw(String(r)); rRef.current = String(r);
    setGRaw(String(g)); gRef.current = String(g);
    setBRaw(String(b)); bRef.current = String(b);
    setHRaw(String(Math.round(h))); hRef.current = String(Math.round(h));
    setSRaw(String(Math.round(s))); sRef.current = String(Math.round(s));
    setLRaw(String(Math.round(l))); lRef.current = String(Math.round(l));
    onChangeRef.current(hex);
  }, []);

  /* ---- Grayscale protection: when S=0, preserve hue ---- */
  const applyColor = useCallback((h: number, s: number, l: number) => {
    const finalHue = (s === 0) ? hueRef.current : h;
    setHue(finalHue);
    setSat(s);
    setLightness(l);
    notifyColor(finalHue, s, l);
  }, [notifyColor]);

  /* ========== Close on outside click ========== */

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* ========== Canvas Drawing ========== */

  const drawSatCanvas = useCallback(() => {
    const canvas = satCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const currentHue = hueRef.current;
    const hueColor = `hsl(${currentHue}, 100%, 50%)`;

    const gradH = ctx.createLinearGradient(0, 0, w, 0);
    gradH.addColorStop(0, '#ffffff');
    gradH.addColorStop(1, hueColor);
    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, w, h);

    const gradV = ctx.createLinearGradient(0, 0, 0, h);
    gradV.addColorStop(0, 'rgba(0,0,0,0)');
    gradV.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, w, h);
  }, []);

  const drawHueCanvas = useCallback(() => {
    const canvas = hueCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 360; i += 30) {
      grad.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 4);
    ctx.fill();
  }, []);

  useEffect(() => {
    if (open) {
      drawSatCanvas();
    }
  }, [open, hue, drawSatCanvas]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => drawHueCanvas());
    }
  }, [open, drawHueCanvas]);

  /* ========== Interaction Helpers ========== */

  const getPos = (e: React.MouseEvent | MouseEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  /* ---- Sat panel: ONLY updates sat & lightness, NEVER hue ---- */
  const handleSatMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const { x, y } = getPos(e, el);
    const newSat = x * 100;
    const newLightness = 100 - y * 100;
    setSat(newSat);
    setLightness(newLightness);
    notifyColor(hueRef.current, newSat, newLightness);
  };

  /* ---- Hue slider: ONLY updates hue, NEVER sat/lightness ---- */
  const handleHueMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const { x } = getPos(e, el);
    const newHue = x * 360;
    setHue(newHue);
    notifyColor(newHue, satRef.current, lightnessRef.current);
  };

  /* ---- Drag support with strict isolation ---- */
  useEffect(() => {
    if (!open) return;
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      if (draggingRef.current === 'sat') {
        const el = satCanvasRef.current?.parentElement;
        if (!el) return;
        const { x, y } = getPos(e, el);
        const newSat = x * 100;
        const newLightness = 100 - y * 100;
        setSat(newSat);
        setLightness(newLightness);
        notifyColor(hueRef.current, newSat, newLightness);
      } else if (draggingRef.current === 'hue') {
        const el = hueCanvasRef.current?.parentElement;
        if (!el) return;
        const { x } = getPos(e, el);
        const newHue = x * 360;
        setHue(newHue);
        notifyColor(newHue, satRef.current, lightnessRef.current);
      }
    };
    const onUp = () => { draggingRef.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [open, notifyColor]);

  /* ========== Input Handlers (loose editing, strict blur) ========== */

  /* ---- HEX ---- */
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHexRaw(e.target.value);
  };

  const handleHexBlur = () => {
    let raw = hexRaw;
    if (!raw.startsWith('#')) raw = '#' + raw;
    // Pad to 7 chars (e.g. "#f" -> "#f00000")
    if (raw.length < 7) {
      raw = raw + '0'.repeat(7 - raw.length);
    }
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
      setHexRaw(raw);
      const [r, g, b] = hexToRgb(raw);
      const [h, s, l] = rgbToHsl(r, g, b);
      applyColor(h, s, l);
    } else {
      setHexRaw(value); // restore previous valid value
    }
  };

  const handleHexKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  /* ---- RGB ---- */
  const handleRgbChange = (channel: 0 | 1 | 2, raw: string) => {
    const setters = [setRRaw, setGRaw, setBRaw] as const;
    const refs = [rRef, gRef, bRef] as const;
    setters[channel](raw);
    refs[channel].current = raw;
  };

  const handleRgbBlur = () => {
    const clamped = [rRef.current, gRef.current, bRef.current].map(v => {
      const n = v === '' ? 0 : parseInt(v, 10);
      return isNaN(n) ? 0 : Math.max(0, Math.min(255, n));
    });
    setRRaw(String(clamped[0])); rRef.current = String(clamped[0]);
    setGRaw(String(clamped[1])); gRef.current = String(clamped[1]);
    setBRaw(String(clamped[2])); bRef.current = String(clamped[2]);
    const [h, s, l] = rgbToHsl(clamped[0], clamped[1], clamped[2]);
    applyColor(h, s, l);
  };

  const handleRgbKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  /* ---- HSL ---- */
  const handleHslChange = (channel: 0 | 1 | 2, raw: string) => {
    const setters = [setHRaw, setSRaw, setLRaw] as const;
    const refs = [hRef, sRef, lRef] as const;
    setters[channel](raw);
    refs[channel].current = raw;
  };

  const handleHslBlur = () => {
    const maxes = [360, 100, 100];
    const clamped = [hRef.current, sRef.current, lRef.current].map((v, i) => {
      const n = v === '' ? 0 : parseFloat(v);
      return isNaN(n) ? 0 : Math.max(0, Math.min(maxes[i], Math.round(n)));
    });
    setHRaw(String(clamped[0])); hRef.current = String(clamped[0]);
    setSRaw(String(clamped[1])); sRef.current = String(clamped[1]);
    setLRaw(String(clamped[2])); lRef.current = String(clamped[2]);
    // Grayscale protection: when S=0, preserve hue
    applyColor(clamped[0], clamped[1], clamped[2]);
  };

  const handleHslKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  /* ---- Presets ---- */
  const handlePresetClick = (c: string) => {
    syncFromHex(c);
    onChange(c);
  };

  /* ---- Derived positions ---- */
  const satX = sat;
  const satY = 100 - lightness;
  const hueX = (hue / 360) * 100;

  /* ========== Render ========== */

  const renderInputFields = () => {
    if (mode === 'hex') {
      return (
        <div className="md3-cp__input-row">
          <div className="md3-cp__textfield md3-cp__textfield--hex">
            <span className="md3-cp__hex-prefix">#</span>
            <input
              type="text"
              className="md3-cp__textfield-input md3-cp__textfield-input--hex"
              value={hexRaw.replace(/^#/, '')}
              onChange={(e) => handleHexChange({ target: { value: '#' + e.target.value.replace(/^#/, '') } } as any)}
              onBlur={handleHexBlur}
              onKeyDown={handleHexKeyDown}
              maxLength={6}
              spellCheck={false}
              autoComplete="off"
            />
            <div className="md3-cp__textfield-notch">
              <span className="md3-cp__textfield-label">Hex</span>
            </div>
          </div>
        </div>
      );
    }

    if (mode === 'rgb') {
      return (
        <div className="md3-cp__input-row md3-cp__input-row--triple">
          {(['R', 'G', 'B'] as const).map((label, i) => {
            const rawVals = [rRaw, gRaw, bRaw];
            const handlers = [
              (e: React.ChangeEvent<HTMLInputElement>) => handleRgbChange(i as 0 | 1 | 2, e.target.value),
            ];
            return (
              <div key={label} className="md3-cp__textfield md3-cp__textfield--compact">
                <input
                  type="number"
                  className="md3-cp__textfield-input"
                  value={rawVals[i]}
                  onChange={handlers[0]}
                  onBlur={handleRgbBlur}
                  onKeyDown={handleRgbKeyDown}
                  autoComplete="off"
                />
                <div className="md3-cp__textfield-notch">
                  <span className="md3-cp__textfield-label">{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // HSL
    return (
      <div className="md3-cp__input-row md3-cp__input-row--triple">
        {(['H', 'S', 'L'] as const).map((label, i) => {
          const rawVals = [hRaw, sRaw, lRaw];
          return (
            <div key={label} className="md3-cp__textfield md3-cp__textfield--compact">
              <input
                type="number"
                className="md3-cp__textfield-input"
                value={rawVals[i]}
                onChange={(e) => handleHslChange(i as 0 | 1 | 2, e.target.value)}
                onBlur={handleHslBlur}
                onKeyDown={handleHslKeyDown}
                autoComplete="off"
              />
              <div className="md3-cp__textfield-notch">
                <span className="md3-cp__textfield-label">{label}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`md3-color-picker${open ? ' md3-color-picker--open' : ''}`} ref={containerRef} id={id}>
      {/* Trigger */}
      <button
        className="md3-color-picker__trigger"
        style={{ backgroundColor: value }}
        onClick={() => setOpen(!open)}
        type="button"
        aria-label="Pick color"
      />

      {/* Popover */}
      {open && (
        <div
          className="md3-color-picker__popover"
          style={{
            top: popoverAnchor.v === 'bottom' ? 'calc(100% + 8px)' : 'auto',
            bottom: popoverAnchor.v === 'top' ? 'calc(100% + 8px)' : 'auto',
            left: popoverAnchor.h === 'left' ? '0' : 'auto',
            right: popoverAnchor.h === 'right' ? '0' : 'auto',
            transformOrigin: `${popoverAnchor.v === 'top' ? 'bottom' : 'top'} ${popoverAnchor.h === 'right' ? 'right' : 'left'}`,
          }}
        >
          {/* Saturation/Brightness panel */}
          <div
            className="md3-color-picker__sat-area"
            onMouseDown={(e) => { draggingRef.current = 'sat'; handleSatMouse(e); }}
          >
            <canvas ref={satCanvasRef} width={260} height={160} />
            <div
              className="md3-color-picker__thumb"
              style={{
                left: `calc(${satX}% - 10px)`,
                top: `calc(${satY}% - 10px)`,
                backgroundColor: `hsl(${hue}, ${satX}%, ${100 - satY}%)`,
              }}
            />
          </div>

          {/* Hue slider */}
          <div
            className="md3-color-picker__hue-area"
            onMouseDown={(e) => { draggingRef.current = 'hue'; handleHueMouse(e); }}
          >
            <canvas ref={hueCanvasRef} width={260} height={12} />
            <div
              className="md3-color-picker__thumb"
              style={{
                left: `calc(${hueX}% - 10px)`,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: `hsl(${hue}, 100%, 50%)`,
              }}
            />
          </div>

          {/* Mode Switcher：改用项目自研的胶囊切换控件 */}
          <div className="md3-cp__mode-group">
            <Md3Toggle
              size="small"
              options={[
                { value: 'hex', label: 'HEX' },
                { value: 'rgb', label: 'RGB' },
                { value: 'hsl', label: 'HSL' },
              ]}
              value={mode}
              onChange={(v) => setMode(v as ColorMode)}
            />
          </div>

          {/* Dynamic input fields */}
          {renderInputFields()}

          {/* Presets */}
          <div className="md3-color-picker__presets">
            {PRESET_COLORS.map((c,i) => (
              <button
                key={i}
                type="button"
                className={`md3-color-picker__preset${c === value ? ' md3-color-picker__preset--active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => handlePresetClick(c)}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}