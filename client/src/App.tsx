import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { DrawingBoard } from './components/DrawingBoard';
import type { Tool, GridStyle } from './types';

const App: React.FC = () => {
  // ── Theme ──────────────────────────────────────────────
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('collabspace_theme');
    if (stored) return stored === 'dark';
    // Default: light mode
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    localStorage.setItem('collabspace_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // ── Room / board ───────────────────────────────────────
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>(() =>
    localStorage.getItem('collabspace_username') || `User_${Math.floor(1000 + Math.random() * 9000)}`
  );

  // ── Canvas tool state ──────────────────────────────────
  const [activeTool, setActiveTool] = useState<Tool>('pencil');
  const [activeColor, setActiveColor] = useState<string>('#6366f1');
  const [backgroundColor, setBackgroundColor] = useState<string>(isDark ? '#0b0f17' : '#e8e9f0');
  const [activeStrokeWidth, setActiveStrokeWidth] = useState<number>(5);
  const [laserStyle, setLaserStyle] = useState<'solid' | 'dashed' | 'dotted' | 'rough'>('solid');
  const [eraserSize, setEraserSize] = useState<number>(20);

  // Update canvas bg when theme switches (if it's still at the default)
  useEffect(() => {
    setBackgroundColor(isDark ? '#0b0f17' : '#e8e9f0');
  }, [isDark]);

  // Image upload
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const handleAddImage = (src: string) => {
    setPendingImageSrc(src);
    setActiveTool('image');
  };

  // Undo / Redo
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [redoTrigger, setRedoTrigger] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Clear / Export
  const [clearTrigger, setClearTrigger] = useState(0);
  const [exportTrigger, setExportTrigger] = useState(0);

  // Grid & Fill
  const [gridStyle, setGridStyle] = useState<GridStyle>('dots');
  const [filled, setFilled] = useState(false);

  // Layering
  const [bringToFrontTrigger, setBringToFrontTrigger] = useState(0);
  const [sendToBackTrigger, setSendToBackTrigger] = useState(0);
  const [selectedElementExists, setSelectedElementExists] = useState(false);

  // Collaborators
  const [activeUsers, setActiveUsers] = useState<{ socketId: string; userName: string; color: string }[]>([]);

  const handleUserNameChange = (name: string) => {
    setUserName(name);
    localStorage.setItem('collabspace_username', name);
  };

  const selectBoard = (boardId: string) => {
    setCurrentBoardId(boardId);
    const url = new URL(window.location.href);
    url.searchParams.set('room', boardId);
    window.history.pushState({}, '', url);
  };

  // Support direct room URL links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) setCurrentBoardId(room);
  }, []);

  return (
    <div
      data-testid="app-shell"
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-app)',
        transition: 'background-color 0.25s ease',
      }}
    >
      {/* Left Sidebar */}
      <Sidebar
        currentBoardId={currentBoardId}
        onSelectBoard={selectBoard}
        userName={userName}
        onUserNameChange={handleUserNameChange}
        activeUsers={activeUsers}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* Canvas area */}
      <div style={{ flex: 1, position: 'relative', height: '100vh', overflow: 'hidden' }}>
        {currentBoardId && (
          <Toolbar
            activeTool={activeTool}
            onChangeTool={setActiveTool}
            activeColor={activeColor}
            onChangeColor={setActiveColor}
            activeStrokeWidth={activeStrokeWidth}
            onChangeStrokeWidth={setActiveStrokeWidth}
            onUndo={() => setUndoTrigger((p) => p + 1)}
            onRedo={() => setRedoTrigger((p) => p + 1)}
            canUndo={canUndo}
            canRedo={canRedo}
            onClearBoard={() => setClearTrigger((p) => p + 1)}
            onExportImage={() => setExportTrigger((p) => p + 1)}
            gridStyle={gridStyle}
            onChangeGridStyle={setGridStyle}
            filled={filled}
            onChangeFilled={setFilled}
            selectedElementExists={selectedElementExists}
            onBringToFront={() => setBringToFrontTrigger((p) => p + 1)}
            onSendToBack={() => setSendToBackTrigger((p) => p + 1)}
            backgroundColor={backgroundColor}
            onChangeBackgroundColor={setBackgroundColor}
            onAddImage={handleAddImage}
            eraserSize={eraserSize}
            onChangeEraserSize={setEraserSize}
            laserStyle={laserStyle}
            onChangeLaserStyle={setLaserStyle}
            isDark={isDark}
          />
        )}

        <DrawingBoard
          boardId={currentBoardId}
          userName={userName}
          tool={activeTool}
          color={activeColor}
          strokeWidth={activeStrokeWidth}
          undoTrigger={undoTrigger}
          redoTrigger={redoTrigger}
          onUndoStateChange={(u, r) => { setCanUndo(u); setCanRedo(r); }}
          clearTrigger={clearTrigger}
          exportTrigger={exportTrigger}
          onActiveUsersChange={setActiveUsers}
          onChangeTool={setActiveTool}
          gridStyle={gridStyle}
          filled={filled}
          backgroundColor={backgroundColor}
          onBackgroundColorChange={setBackgroundColor}
          bringToFrontTrigger={bringToFrontTrigger}
          sendToBackTrigger={sendToBackTrigger}
          onSelectedElementExistsChange={setSelectedElementExists}
          pendingImageSrc={pendingImageSrc}
          eraserSize={eraserSize}
          laserStyle={laserStyle}
          onImagePlaced={() => setPendingImageSrc(null)}
        />
      </div>
    </div>
  );
};

export default App;
