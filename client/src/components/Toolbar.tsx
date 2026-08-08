import React, { useState, useRef } from 'react';
import type { Tool, GridStyle } from '../types';
import {
  MousePointer2,
  Pencil,
  Minus,
  Square,
  Circle,
  Type,
  Trash2,
  Download,
  Eraser,
  Undo2,
  Redo2,
  Sparkles,
  Grid3x3,
  PaintBucket,
  ChevronUp,
  ChevronDown,
  Palette,
  Highlighter,
  ImagePlus,
  StickyNote,
  Layers,
} from 'lucide-react';
import './Toolbar.css';

interface ToolbarProps {
  activeTool: Tool;
  onChangeTool: (tool: Tool) => void;
  activeColor: string;
  onChangeColor: (color: string) => void;
  activeStrokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClearBoard: () => void;
  onExportImage: () => void;
  gridStyle: GridStyle;
  onChangeGridStyle: (style: GridStyle) => void;
  filled: boolean;
  onChangeFilled: (filled: boolean) => void;
  selectedElementExists: boolean;
  onBringToFront: () => void;
  onSendToBack: () => void;
  strokeStyle?: 'solid' | 'dashed' | 'dotted' | 'rough';
  onChangeStrokeStyle?: (style: 'solid' | 'dashed' | 'dotted' | 'rough') => void;
  backgroundColor: string;
  onChangeBackgroundColor: (color: string) => void;
  onAddImage: (src: string) => void;
  eraserSize: number;
  onChangeEraserSize: (size: number) => void;
  laserStyle: 'solid' | 'dashed' | 'dotted' | 'rough';
  onChangeLaserStyle: (style: 'solid' | 'dashed' | 'dotted' | 'rough') => void;
  isDark?: boolean;
}

// Preset palettes
const PALETTES = [
  { name: 'Sleek', colors: ['#ffffff', '#94a3b8', '#38bdf8', '#a855f7', '#f43f5e'] },
  { name: 'Pastel', colors: ['#fecdd3', '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff'] },
  { name: 'Neon',   colors: ['#39ff14', '#00ffff', '#ff007f', '#ff00ff', '#ffff00'] },
  { name: 'Earth',  colors: ['#e07a5f', '#f4f1de', '#3d5a80', '#98c1d9', '#ee6c4d'] },
];

// Drawing tools definition
const DRAW_TOOLS: { tool: Tool; icon: React.ReactNode; label: string; key?: string }[] = [
  { tool: 'select',      icon: <MousePointer2 size={16} />,  label: 'Select & Move (V)',    key: 'V' },
  { tool: 'pencil',      icon: <Pencil size={16} />,         label: 'Pencil (P)',            key: 'P' },
  { tool: 'highlighter', icon: <Highlighter size={16} />,    label: 'Highlighter (H)',       key: 'H' },
  { tool: 'eraser',      icon: <Eraser size={16} />,         label: 'Eraser (E)',            key: 'E' },
  { tool: 'line',        icon: <Minus size={16} />,          label: 'Line (L)',              key: 'L' },
  { tool: 'rectangle',   icon: <Square size={16} />,         label: 'Rectangle (R)',         key: 'R' },
  { tool: 'circle',      icon: <Circle size={16} />,         label: 'Circle (O)',            key: 'O' },
  { tool: 'text',        icon: <Type size={16} />,           label: 'Text (T)',              key: 'T' },
  { tool: 'sticky-note', icon: <StickyNote size={16} />,     label: 'Sticky Note' },
  { tool: 'laser',       icon: <Sparkles size={16} />,       label: 'Laser Pointer (Z)',     key: 'Z' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onChangeTool,
  activeColor,
  onChangeColor,
  activeStrokeWidth,
  onChangeStrokeWidth,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClearBoard,
  onExportImage,
  gridStyle,
  onChangeGridStyle,
  filled,
  onChangeFilled,
  selectedElementExists,
  onBringToFront,
  onSendToBack,
  backgroundColor,
  onChangeBackgroundColor,
  onAddImage,
  eraserSize,
  onChangeEraserSize,
  isDark = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'solid' | 'gradient'>('solid');
  const [gradColor1, setGradColor1] = useState('#ff007f');
  const [gradColor2, setGradColor2] = useState('#00ffff');
  const [gradAngle, setGradAngle] = useState(45);

  const handleApplyGradient = (c1: string, c2: string, angle: number) => {
    onChangeColor(JSON.stringify({ type: 'linear', color1: c1, color2: c2, angle }));
  };

  const isGradient = activeColor.startsWith('{') && activeColor.includes('"type":"linear"');
  let previewStyle: React.CSSProperties = {};
  if (isGradient) {
    try {
      const p = JSON.parse(activeColor);
      previewStyle = { background: `linear-gradient(${p.angle}deg, ${p.color1}, ${p.color2})` };
    } catch { previewStyle = { backgroundColor: '#fff' }; }
  } else {
    previewStyle = { backgroundColor: activeColor };
  }

  const gridIcons: Record<GridStyle, string> = { dots: '⬝', lines: '≡', none: '□' };
  const gridLabels: Record<GridStyle, string> = { dots: 'Dots', lines: 'Lines', none: 'None' };

  const cycleGrid = () => {
    const styles: GridStyle[] = ['dots', 'lines', 'none'];
    onChangeGridStyle(styles[(styles.indexOf(gridStyle) + 1) % styles.length]);
  };

  return (
    <div className={`toolbar-wrapper ${isDark ? 'toolbar-dark' : 'toolbar-light'}`}>
      {/* ── Main vertical tool rail ── */}
      <div className="toolbar-container">

        {/* Drawing tools */}
        <div className="toolbar-group">
          {DRAW_TOOLS.map(({ tool, icon, label }) => (
            <button
              key={tool}
              id={`tool-${tool}`}
              className={`tool-btn ${activeTool === tool ? 'active' : ''}`}
              onClick={() => {
                if (tool === 'image') { fileInputRef.current?.click(); return; }
                onChangeTool(tool);
              }}
              title={label}
              aria-label={label}
            >
              {icon}
            </button>
          ))}

          {/* Image upload trigger */}
          <button
            id="tool-image"
            className={`tool-btn ${activeTool === 'image' ? 'active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            title="Upload Image (I)"
            aria-label="Upload Image"
          >
            <ImagePlus size={16} />
          </button>
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === 'string') onAddImage(reader.result);
              };
              reader.readAsDataURL(file);
            }}
          />
        </div>

        <div className="toolbar-divider" />

        {/* Eraser size (only when eraser active) */}
        {activeTool === 'eraser' && (
          <>
            <div className="toolbar-group" style={{ padding: '4px 0', gap: '4px' }}>
              <span className="toolbar-section-label">Size</span>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={eraserSize}
                onChange={(e) => onChangeEraserSize(Number(e.target.value))}
                className="eraser-size-slider"
                title={`Eraser size: ${eraserSize}px`}
              />
            </div>
            <div className="toolbar-divider" />
          </>
        )}

        {/* Shape options — Fill (Rectangle & Circle only) */}
        {(activeTool === 'rectangle' || activeTool === 'circle') && (
          <>
            <div className="toolbar-group">
              <button
                id="btn-fill-toggle"
                className={`tool-btn ${filled ? 'active' : ''}`}
                onClick={() => onChangeFilled(!filled)}
                title="Toggle Fill"
                aria-label="Toggle fill"
              >
                <PaintBucket size={16} />
              </button>
            </div>
            <div className="toolbar-divider" />
          </>
        )}

        {/* Layering (only when element selected) */}
        {activeTool === 'select' && selectedElementExists && (
          <>
            <div className="toolbar-group">
              <button id="btn-bring-front" className="tool-btn" onClick={onBringToFront} title="Bring to Front (])">
                <ChevronUp size={16} />
              </button>
              <button id="btn-send-back" className="tool-btn" onClick={onSendToBack} title="Send to Back ([)">
                <ChevronDown size={16} />
              </button>
            </div>
            <div className="toolbar-divider" />
          </>
        )}

        {/* Color picker trigger */}
        <div className="toolbar-group">
          <button
            id="btn-color-picker"
            className={`tool-btn ${showColorMenu ? 'active' : ''}`}
            onClick={() => setShowColorMenu(!showColorMenu)}
            title="Colors & Gradients"
            style={{ position: 'relative' }}
          >
            <Palette size={16} />
            <span className="color-preview-swatch" style={previewStyle} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Stroke width */}
        <div className="toolbar-group">
          {[
            { w: 2,  h: '2px', label: 'Thin'   },
            { w: 5,  h: '4px', label: 'Medium'  },
            { w: 10, h: '7px', label: 'Thick'   },
          ].map(({ w, h, label }) => (
            <button
              key={w}
              className={`stroke-btn ${activeStrokeWidth === w ? 'active' : ''}`}
              onClick={() => onChangeStrokeWidth(w)}
              title={`${label} stroke`}
            >
              <div className="stroke-line" style={{ height: h }} />
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        {/* Undo / Redo */}
        <div className="toolbar-group">
          <button
            id="btn-undo"
            className="tool-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            id="btn-redo"
            className="tool-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Utility row */}
        <div className="toolbar-group">
          {/* Grid cycle */}
          <button
            id="btn-grid"
            className="tool-btn"
            onClick={cycleGrid}
            title={`Grid: ${gridLabels[gridStyle]}`}
            style={{ fontSize: '11px', flexDirection: 'column', gap: '1px', height: '44px' }}
          >
            <Grid3x3 size={14} />
            <span style={{ fontSize: '8px', fontWeight: 700, color: gridStyle !== 'none' ? '#a5b4fc' : '#475569', letterSpacing: '0.05em' }}>
              {gridLabels[gridStyle]}
            </span>
          </button>

          {/* Background color */}
          <button className="tool-btn" style={{ position: 'relative' }} title="Canvas Background">
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => onChangeBackgroundColor(e.target.value)}
              className="bg-color-picker"
              title="Canvas Background Color"
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            />
            <Layers size={16} />
            <span
              style={{
                position: 'absolute',
                bottom: '5px',
                right: '5px',
                width: '10px',
                height: '10px',
                borderRadius: '3px',
                background: backgroundColor,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          </button>

          {/* Export */}
          <button id="btn-export" className="tool-btn" onClick={onExportImage} title="Export PNG">
            <Download size={16} />
          </button>

          {/* Clear board */}
          <button id="btn-clear" className="tool-btn danger" onClick={onClearBoard} title="Clear Board">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* ── Color / Gradient slide-out panel ── */}
      {showColorMenu && (
        <div className="color-menu-panel" role="dialog" aria-label="Color picker">
          <div className="menu-tabs">
            <button className={`tab-btn ${activeTab === 'solid' ? 'active' : ''}`} onClick={() => setActiveTab('solid')}>
              Solid
            </button>
            <button className={`tab-btn ${activeTab === 'gradient' ? 'active' : ''}`} onClick={() => setActiveTab('gradient')}>
              Gradient
            </button>
          </div>

          {activeTab === 'solid' ? (
            <div className="tab-content">
              {PALETTES.map((palette) => (
                <div key={palette.name} className="palette-section">
                  <div className="palette-title">{palette.name}</div>
                  <div className="palette-colors">
                    {palette.colors.map((c) => (
                      <div
                        key={c}
                        className={`color-dot ${activeColor === c ? 'active' : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => { onChangeColor(c); setShowColorMenu(false); }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="palette-section">
                <div className="palette-title">Custom</div>
                <div className="custom-solid-row">
                  <input
                    type="color"
                    className="full-color-picker"
                    value={isGradient ? '#ffffff' : activeColor}
                    onChange={(e) => onChangeColor(e.target.value)}
                  />
                  <span className="hex-label">{isGradient ? '#ffffff' : activeColor}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="tab-content gradient-builder">
              <div className="gradient-preview" style={{ background: `linear-gradient(${gradAngle}deg, ${gradColor1}, ${gradColor2})` }} />
              <div className="gradient-inputs">
                {[
                  { label: 'Color 1', val: gradColor1, set: setGradColor1, other: gradColor2 },
                  { label: 'Color 2', val: gradColor2, set: setGradColor2, other: gradColor1 },
                ].map(({ label, val, set, other }) => (
                  <div key={label} className="grad-field">
                    <label>{label}</label>
                    <div className="color-input-group">
                      <input type="color" value={val} onChange={(e) => {
                        set(e.target.value);
                        const isC1 = label === 'Color 1';
                        handleApplyGradient(isC1 ? e.target.value : other, isC1 ? other : e.target.value, gradAngle);
                      }} />
                      <span>{val}</span>
                    </div>
                  </div>
                ))}
                <div className="grad-field">
                  <label>Angle ({gradAngle}°)</label>
                  <input type="range" min="0" max="360" step="45" value={gradAngle}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setGradAngle(v);
                      handleApplyGradient(gradColor1, gradColor2, v);
                    }}
                  />
                </div>
              </div>
              <button className="apply-grad-btn" onClick={() => { handleApplyGradient(gradColor1, gradColor2, gradAngle); setShowColorMenu(false); }}>
                Apply Gradient
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
