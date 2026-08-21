import React, { useRef, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { Tool, CanvasElement, Cursor, Point, GridStyle, LaserTrail } from '../types';
import { getBackendUrl, upsertById } from '../lib/validation';
import './DrawingBoard.css';

// Props interface for DrawingBoard
interface DrawingBoardProps {
  boardId: string | null;
  userName: string;
  tool: Tool;
  color: string;
  strokeWidth: number;
  undoTrigger: number;
  redoTrigger: number;
  onUndoStateChange: (canUndo: boolean, canRedo: boolean) => void;
  clearTrigger: number;
  exportTrigger: number;
  onActiveUsersChange: (users: { socketId: string; userName: string; color: string }[]) => void;
  onChangeTool: (tool: Tool) => void;
  gridStyle: GridStyle;
  filled: boolean;
  strokeStyle?: 'solid' | 'dashed' | 'dotted' | 'rough';
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  bringToFrontTrigger: number;
  sendToBackTrigger: number;
  laserStyle: 'solid' | 'dashed' | 'dotted' | 'rough';
  onSelectedElementExistsChange: (exists: boolean) => void;
  // New props for image handling
  pendingImageSrc: string | null;
  eraserSize: number;
  onImagePlaced: () => void;
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const distance = (a: Point, b: Point) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

const isNearLine = (x: number, y: number, x1: number, y1: number, x2: number, y2: number, threshold = 6): boolean => {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;
  let xx, yy;
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }
  const dx = x - xx;
  const dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
};

const getElementAtPosition = (x: number, y: number, elements: CanvasElement[]): CanvasElement | null => {
  const sorted = [...elements].sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0));
  for (const el of sorted) {
    switch (el.type) {
      case 'rectangle': {
        const minX = Math.min(el.x1, el.x2);
        const maxX = Math.max(el.x1, el.x2);
        const minY = Math.min(el.y1, el.y2);
        const maxY = Math.max(el.y1, el.y2);
        if (x >= minX - 4 && x <= maxX + 4 && y >= minY - 4 && y <= maxY + 4) return el;
        break;
      }
      case 'circle': {
        const r = distance({ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 });
        const dist = distance({ x, y }, { x: el.x1, y: el.y1 });
        if (Math.abs(dist - r) < 6 || dist <= r) return el;
        break;
      }
      case 'line': {
        if (isNearLine(x, y, el.x1, el.y1, el.x2, el.y2)) return el;
        break;
      }
      case 'pencil': {
        if (el.points) {
          const points: Point[] = JSON.parse(el.points);
          for (let j = 0; j < points.length - 1; j++) {
            if (isNearLine(x, y, points[j].x, points[j].y, points[j + 1].x, points[j + 1].y, 8)) return el;
          }
        }
        break;
      }
      case 'text': {
        const minX = Math.min(el.x1, el.x2);
        const maxX = Math.max(el.x1, el.x2);
        const minY = Math.min(el.y1, el.y2);
        const maxY = Math.max(el.y1, el.y2);
        if (x >= minX - 4 && x <= maxX + 4 && y >= minY - 4 && y <= maxY + 4) return el;
        break;
      }
    }
  }
  return null;
};

const USER_COLORS = [
  '#ec4899', '#f43f5e', '#e11d48', '#d946ef', '#a855f7',
  '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4',
  '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308'
];

const LASER_FADE_MS = 1500;

export const DrawingBoard: React.FC<DrawingBoardProps> = ({
  boardId,
  userName,
  tool,
  color,
  strokeWidth,
  undoTrigger,
  redoTrigger,
  onUndoStateChange,
  clearTrigger,
  exportTrigger,
  onActiveUsersChange,
  onChangeTool,
  gridStyle,
  filled,
  strokeStyle = 'solid',
  backgroundColor,
  onBackgroundColorChange,
  bringToFrontTrigger,
  sendToBackTrigger,
  laserStyle: _laserStyle,
  onSelectedElementExistsChange,
  pendingImageSrc,
  eraserSize,
  onImagePlaced,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [undoStack, setUndoStack] = useState<CanvasElement[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasElement[][]>([]);

  const [action, setAction] = useState<'none' | 'drawing' | 'moving' | 'panning'>('none');
  const [selectedElement, setSelectedElement] = useState<CanvasElement | null>(null);
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [currentPoint, setCurrentPoint] = useState<Point>({ x: 0, y: 0 });

  // Pan & Zoom
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);

  // Text Tool
  const [textInput, setTextInput] = useState<{ x: number; y: number; text: string; id: string } | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
// Sticky note editing state
const [editingNote, setEditingNote] = React.useState<CanvasElement | null>(null);
const [editingText, setEditingText] = React.useState('');
  const editTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Remote Cursors
  const [remoteCursors, setRemoteCursors] = useState<Cursor[]>([]);

  // Laser trails (local + remote)
  const [laserTrails, setLaserTrails] = useState<LaserTrail[]>([]);
  const laserPointsRef = useRef<Point[]>([]);
  const laserAnimFrameRef = useRef<number | null>(null);

  const userCursorColor = useRef(USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]);
  const lastCursorEmitRef = useRef<number>(0);
  const lastLaserEmitRef = useRef<number>(0);

  // Notify parent when selected element existence changes
  useEffect(() => {
    onSelectedElementExistsChange(!!selectedElement);
  }, [selectedElement]);

  // Socket connection
  useEffect(() => {
    if (!boardId) return;

    setElements([]);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedElement(null);
    setRemoteCursors([]);
    setLaserTrails([]);
    laserPointsRef.current = [];

    const BACKEND_URL = getBackendUrl(import.meta.env.VITE_API_URL as string | undefined);
    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    socket.emit('join-room', { boardId, userName });

    socket.on('canvas-history', ({ elements: historyElements = [], backgroundColor: bg }: { elements: CanvasElement[], backgroundColor: string }) => {
      setElements(historyElements || []);
      onUndoStateChange((historyElements || []).length > 0, false);
      if (bg) onBackgroundColorChange(bg);
    });

    socket.on('board-bg-updated', ({ backgroundColor: newBg }: { backgroundColor: string }) => {
      onBackgroundColorChange(newBg);
    });

    socket.on('element-update', (element: CanvasElement) => {
      setElements((prev) => upsertById(prev, element));
    });

    socket.on('element-delete', (elementId: string) => {
      setElements((prev) => prev.filter((el) => el.id !== elementId));
      setSelectedElement((prev) => prev?.id === elementId ? null : prev);
    });

    socket.on('cursor-update', (cursor: Cursor) => {
      setRemoteCursors((prev) => {
        const index = prev.findIndex((c) => c.socketId === cursor.socketId);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = cursor;
          return updated;
        }
        return [...prev, cursor];
      });
    });

    // Laser pointer from remote peers
    socket.on('laser-update', ({ socketId, userName: remoteUser, color: remoteColor, points }: {
      socketId: string; userName: string; color: string; points: Point[];
    }) => {
      setLaserTrails((prev) => {
        const index = prev.findIndex((t) => t.socketId === socketId);
        const trail: LaserTrail = { socketId, userName: remoteUser, color: remoteColor, points, timestamp: Date.now() };
        if (index > -1) {
          const updated = [...prev];
          updated[index] = trail;
          return updated;
        }
        return [...prev, trail];
      });
    });

    socket.on('user-left', (socketId: string) => {
      setRemoteCursors((prev) => prev.filter((c) => c.socketId !== socketId));
      setLaserTrails((prev) => prev.filter((t) => t.socketId !== socketId));
    });

    socket.on('canvas-cleared', () => {
      setElements([]);
      setUndoStack([]);
      setRedoStack([]);
      setSelectedElement(null);
    });

    return () => { socket.disconnect(); };
  }, [boardId]);

  // Sync collaborators list
  useEffect(() => {
    const usersList = remoteCursors.map(c => ({ socketId: c.socketId, userName: c.userName, color: c.color }));
    usersList.unshift({ socketId: 'local', userName, color: userCursorColor.current });
    onActiveUsersChange(usersList);
  }, [remoteCursors, userName]);

  // Username change broadcast
  useEffect(() => {
    if (socketRef.current && boardId) {
      socketRef.current.emit('cursor-move', { boardId, userName, color: userCursorColor.current, x: -9999, y: -9999 });
    }
  }, [userName, boardId]);

  // Redraw when anything changes
  useEffect(() => {
    drawCanvas();
  }, [elements, pan, zoom, selectedElement, currentPoint, action, tool, gridStyle, laserTrails, backgroundColor, strokeStyle]);
  // Emit background color changes to server for persistence and sync
  useEffect(() => {
    if (socketRef.current && boardId) {
      socketRef.current.emit('update-board-bg', { boardId, backgroundColor });
    }
  }, [backgroundColor, boardId]);
  // Undo trigger
  useEffect(() => {
    if (undoTrigger > 0 && elements.length > 0) handleUndo();
  }, [undoTrigger]);

  // Redo trigger
  useEffect(() => {
    if (redoTrigger > 0 && redoStack.length > 0) handleRedo();
  }, [redoTrigger]);

  // Clear trigger
  useEffect(() => {
    if (clearTrigger > 0 && boardId) {
      setUndoStack((prev) => [...prev, elements]);
      setElements([]);
      socketRef.current?.emit('clear-board', { boardId });
    }
  }, [clearTrigger]);

  // Export trigger
  useEffect(() => {
    if (exportTrigger > 0) exportCanvasImage();
  }, [exportTrigger]);

  // Bring to Front
  useEffect(() => {
    if (bringToFrontTrigger > 0 && selectedElement && boardId) {
      const maxZ = Math.max(...elements.map(e => e.zIndex ?? 0));
      const newZ = maxZ + 1;
      const updated = { ...selectedElement, zIndex: newZ };
      setElements(prev => prev.map(el => el.id === selectedElement.id ? updated : el));
      setSelectedElement(updated);
      socketRef.current?.emit('draw-element', { boardId, element: updated });
    }
  }, [bringToFrontTrigger]);

  // Send to Back
  useEffect(() => {
    if (sendToBackTrigger > 0 && selectedElement && boardId) {
      const minZ = Math.min(...elements.map(e => e.zIndex ?? 0));
      const newZ = minZ - 1;
      const updated = { ...selectedElement, zIndex: newZ };
      setElements(prev => prev.map(el => el.id === selectedElement.id ? updated : el));
      setSelectedElement(updated);
      socketRef.current?.emit('draw-element', { boardId, element: updated });
    }
  }, [sendToBackTrigger]);

  // Animate laser fade — runs only when there are active trails
  useEffect(() => {
    if (laserTrails.length === 0) {
      if (laserAnimFrameRef.current) {
        cancelAnimationFrame(laserAnimFrameRef.current);
        laserAnimFrameRef.current = null;
      }
      return;
    }

    const animate = () => {
      const now = Date.now();
      setLaserTrails(prev => {
        const stillActive = prev.filter(t => now - t.timestamp < LASER_FADE_MS);
        return stillActive;
      });
      drawCanvas();
      laserAnimFrameRef.current = requestAnimationFrame(animate);
    };

    laserAnimFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (laserAnimFrameRef.current) cancelAnimationFrame(laserAnimFrameRef.current);
    };
  }, [laserTrails.length > 0]);

  // Canvas setup on board change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Fetch initial background color from API
    if (boardId) {
      fetch(`${getBackendUrl(import.meta.env.VITE_API_URL as string | undefined)}/api/boards/${boardId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.backgroundColor) {
            onBackgroundColorChange(data.backgroundColor);
          }
        })
        .catch(err => console.error('Error fetching board styling details:', err));
    }

    drawCanvas();

    const handleResize = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      drawCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [boardId]);

  // Helper to parse gradient JSON configurations and build linear gradients
  const getCanvasStyle = (ctx: CanvasRenderingContext2D, colorVal: string, x1: number, y1: number, x2: number, y2: number) => {
    if (colorVal.startsWith('{') && colorVal.includes('"type":"linear"')) {
      try {
        const parsed = JSON.parse(colorVal);
        const angleRad = (parsed.angle * Math.PI) / 180;
        
        // Calculate dynamic start and end points based on angle and element bounds
        const dx = (x2 - x1);
        const dy = (y2 - y1);
        const cx = x1 + dx / 2;
        const cy = y1 + dy / 2;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;

        const startX = cx - (Math.cos(angleRad) * length) / 2;
        const startY = cy - (Math.sin(angleRad) * length) / 2;
        const endX = cx + (Math.cos(angleRad) * length) / 2;
        const endY = cy + (Math.sin(angleRad) * length) / 2;

        const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
        gradient.addColorStop(0, parsed.color1);
        gradient.addColorStop(1, parsed.color2);
        return gradient;
      } catch (e) {
        return colorVal;
      }
    }
    return colorVal;
  };

  // Helper to draw rough hand-drawn lines
  const drawRoughLine = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    const seed = (x1 + y1 + x2 + y2) || 1;
    // Generate simple pseudo-random offset
    const pseudoRandom = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    // Draw two overlapping shivering lines to simulate sketch style
    for (let iteration = 0; iteration < 2; iteration++) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      
      const dx = x2 - x1;
      const dy = y2 - y1;
      const distanceVal = Math.sqrt(dx * dx + dy * dy);
      const segmentsCount = Math.max(2, Math.floor(distanceVal / 15));

      for (let i = 1; i <= segmentsCount; i++) {
        const t = i / segmentsCount;
        const cx = x1 + dx * t;
        const cy = y1 + dy * t;
        
        // Shivering offset
        const offsetRange = 1.2 + (iteration * 0.4);
        const randSeedX = seed + i * 17 + iteration * 31;
        const randSeedY = seed + i * 23 + iteration * 43;
        
        const ox = (pseudoRandom(randSeedX) - 0.5) * offsetRange;
        const oy = (pseudoRandom(randSeedY) - 0.5) * offsetRange;

        if (i === segmentsCount) {
          ctx.lineTo(x2, y2);
        } else {
          ctx.lineTo(cx + ox, cy + oy);
        }
      }
      ctx.stroke();
    }
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fill background dynamically
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    drawGrid(ctx, canvas.width, canvas.height);

    // Sort by zIndex before rendering
    const sorted = [...(elements || [])].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

    sorted.forEach((el) => {
      const style = getCanvasStyle(ctx, el.color, el.x1, el.y1, el.x2, el.y2);
      ctx.strokeStyle = style;
      ctx.fillStyle = style;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Apply line dash properties
      const sStyle = el.strokeStyle || 'solid';
      if (sStyle === 'dashed') {
        ctx.setLineDash([12, 6]);
      } else if (sStyle === 'dotted') {
        ctx.setLineDash([3, 6]);
      } else {
        ctx.setLineDash([]);
      }

      switch (el.type) {
        case 'pencil':
          if (el.points) {
            const pointsList: Point[] = JSON.parse(el.points);
            if (pointsList.length > 0) {
              if (sStyle === 'rough') {
                for (let i = 0; i < pointsList.length - 1; i++) {
                  drawRoughLine(ctx, pointsList[i].x, pointsList[i].y, pointsList[i+1].x, pointsList[i+1].y);
                }
              } else {
                ctx.beginPath();
                ctx.moveTo(pointsList[0].x, pointsList[0].y);
                for (let i = 1; i < pointsList.length; i++) ctx.lineTo(pointsList[i].x, pointsList[i].y);
                ctx.stroke();
              }
            }
          }
          break;
        case 'line':
          if (sStyle === 'rough') {
            drawRoughLine(ctx, el.x1, el.y1, el.x2, el.y2);
          } else {
            ctx.beginPath();
            ctx.moveTo(el.x1, el.y1);
            ctx.lineTo(el.x2, el.y2);
            ctx.stroke();
          }
          break;
        case 'rectangle':
          ctx.beginPath();
          ctx.rect(el.x1, el.y1, el.x2 - el.x1, el.y2 - el.y1);
          if (el.filled) {
            ctx.globalAlpha = 0.25;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          ctx.stroke();
          break;
        case 'circle': {
          const r = distance({ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 });
          ctx.beginPath();
          ctx.arc(el.x1, el.y1, r, 0, 2 * Math.PI);
          if (el.filled) {
            ctx.globalAlpha = 0.25;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          ctx.stroke();
          break;
        }
        case 'text':
          if (el.text) {
            ctx.font = '18px Inter, sans-serif';
            ctx.textBaseline = 'top';
            ctx.fillText(el.text, el.x1, el.y1);
          }
          break;
        case 'sticky-note': {
          // Background rectangle
          const w = el.width ?? (el.x2 - el.x1);
          const h = el.height ?? (el.y2 - el.y1);
          ctx.fillStyle = el.color || '#fff9b0';
          ctx.fillRect(el.x1, el.y1, w, h);
          // Text wrapping
          if (el.text) {
            ctx.fillStyle = '#000';
            ctx.font = '16px Inter, sans-serif';
            const lineHeight = 18;
            const words = el.text.split(' ');
            let line = '';
            let y = el.y1 + lineHeight;
            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              const metrics = ctx.measureText(testLine);
              if (metrics.width > w && n > 0) {
                ctx.fillText(line, el.x1 + 4, y);
                line = words[n] + ' ';
                y += lineHeight;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, el.x1 + 4, y);
          }
          break;
        }
        case 'image': {
          const img = new Image();
          img.src = el.src || '';
          const w = el.width ?? (el.x2 - el.x1);
          const h = el.height ?? (el.y2 - el.y1);
          ctx.drawImage(img, el.x1, el.y1, w, h);
          break;
        }
        // Render highlighter with semi-transparency
        case 'highlighter': {
          const prevAlpha = ctx.globalAlpha;
          ctx.globalAlpha = 0.4;
          if (el.points) {
            const pointsList: Point[] = JSON.parse(el.points);
            if (pointsList.length > 0) {
              ctx.beginPath();
              ctx.moveTo(pointsList[0].x, pointsList[0].y);
              for (let i = 1; i < pointsList.length; i++) ctx.lineTo(pointsList[i].x, pointsList[i].y);
              ctx.stroke();
            }
          } else {
            ctx.beginPath();
            ctx.moveTo(el.x1, el.y1);
            ctx.lineTo(el.x2, el.y2);
            ctx.stroke();
          }
          ctx.globalAlpha = prevAlpha;
          break;
        }
      }
    });

    // Active drawing preview
    if (action === 'drawing') {
      const previewStyle = getCanvasStyle(ctx, color, startPoint.x, startPoint.y, currentPoint.x, currentPoint.y);
      ctx.strokeStyle = previewStyle;
      ctx.fillStyle = previewStyle;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';

      switch (tool) {
        case 'line':
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(currentPoint.x, currentPoint.y);
          ctx.stroke();
          break;
        case 'rectangle':
          ctx.beginPath();
          ctx.rect(startPoint.x, startPoint.y, currentPoint.x - startPoint.x, currentPoint.y - startPoint.y);
          if (filled) {
            ctx.globalAlpha = 0.25;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          ctx.stroke();
          break;
        case 'circle': {
          const r = distance(startPoint, currentPoint);
          ctx.beginPath();
          ctx.arc(startPoint.x, startPoint.y, r, 0, 2 * Math.PI);
          if (filled) {
            ctx.globalAlpha = 0.25;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          ctx.stroke();
          break;
        }
      }
    }

    // Selection outline
    if (tool === 'select' && selectedElement) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      const el = selectedElement;
      switch (el.type) {
        case 'rectangle': {
          const minX = Math.min(el.x1, el.x2); const maxX = Math.max(el.x1, el.x2);
          const minY = Math.min(el.y1, el.y2); const maxY = Math.max(el.y1, el.y2);
          ctx.strokeRect(minX - 6, minY - 6, (maxX - minX) + 12, (maxY - minY) + 12);
          break;
        }
        case 'circle': {
          const r = distance({ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 });
          ctx.beginPath(); ctx.arc(el.x1, el.y1, r + 6, 0, 2 * Math.PI); ctx.stroke();
          break;
        }
        case 'line': case 'pencil': case 'text': {
          const minX = Math.min(el.x1, el.x2); const maxX = Math.max(el.x1, el.x2);
          const minY = Math.min(el.y1, el.y2); const maxY = Math.max(el.y1, el.y2);
          ctx.strokeRect(minX - 8, minY - 8, (maxX - minX) + 16, (maxY - minY) + 16);
          break;
        }
      }
      ctx.setLineDash([]);
    }

    // Laser trails (local + remote) — drawn last, on top
    const now = Date.now();
    laserTrails.forEach((trail) => {
      const age = now - trail.timestamp;
      const opacity = Math.max(0, 1 - age / LASER_FADE_MS);
      if (trail.points.length < 2 || opacity <= 0) return;

      for (let i = 1; i < trail.points.length; i++) {
        const segOpacity = opacity * (i / trail.points.length);
        ctx.globalAlpha = segOpacity;
        ctx.strokeStyle = trail.color;
        ctx.lineWidth = 4 + (1 - i / trail.points.length) * 6;
        ctx.lineCap = 'round';
        ctx.shadowColor = trail.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(trail.points[i - 1].x, trail.points[i - 1].y);
        ctx.lineTo(trail.points[i].x, trail.points[i].y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    });
  }, [elements, pan, zoom, selectedElement, currentPoint, action, tool, color, strokeWidth, gridStyle, filled, laserTrails]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 40;
    const startX = Math.floor(-pan.x / zoom / gridSize) * gridSize - gridSize;
    const startY = Math.floor(-pan.y / zoom / gridSize) * gridSize - gridSize;
    const endX = startX + (width / zoom) + (gridSize * 2);
    const endY = startY + (height / zoom) + (gridSize * 2);

    if (gridStyle === 'dots') {
      for (let x = startX; x < endX; x += gridSize) {
        for (let y = startY; y < endY; y += gridSize) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }
    } else if (gridStyle === 'lines') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      for (let x = startX; x < endX; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
      }
      for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
      }
    }
    // 'none' = no grid
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
  if (!boardId) return;

  if (textInput && e.button !== 2) {
    finalizeTextInput();
    return;
  }

  const coords = getCanvasCoords(e);
  setStartPoint(coords);
  setCurrentPoint(coords);

  if (e.button === 1 || e.shiftKey) {
    setAction('panning');
    return;
  }

  if (tool === 'laser') {
    laserPointsRef.current = [coords];
      return;
    }

    // Image placement
    if (tool === 'image' && pendingImageSrc) {
      const defaultW = 200; // default width
      const newEl: CanvasElement = {
        id: generateId(),
        type: 'image',
        x1: coords.x,
        y1: coords.y,
        x2: coords.x + defaultW,
        y2: coords.y + defaultW, // placeholder height; will use natural ratio later
        src: pendingImageSrc,
        width: defaultW,
        height: defaultW,
        zIndex: 0,
        color: color,
        strokeWidth: strokeWidth,
        strokeStyle: strokeStyle,
      };
      setElements((prev) => [...prev, newEl]);
      setSelectedElement(newEl);
      onImagePlaced();
      return;
    }

    if (tool === 'select') {
    const clickedEl = getElementAtPosition(coords.x, coords.y, elements);
    if (clickedEl) {
      setSelectedElement(clickedEl);
      setAction('moving');
    } else {
      setSelectedElement(null);
      setAction('none');
    }
    return;
  }

  if (tool === 'eraser') {
  // Delete any element whose center is within eraserSize of the cursor
  const elementsToDelete = elements.filter((el) => {
    // Simple center calculation for most shapes
    const centerX = (el.x1 + el.x2) / 2;
    const centerY = (el.y1 + el.y2) / 2;
    return distance({ x: coords.x, y: coords.y }, { x: centerX, y: centerY }) <= eraserSize;
  });
  if (elementsToDelete.length > 0) {
    setUndoStack((prev) => [...prev, elements]);
    const remaining = elements.filter((el) => !elementsToDelete.includes(el));
    setElements(remaining);
    // Emit delete for each removed element
    elementsToDelete.forEach((el) => {
      socketRef.current?.emit('delete-element', { boardId, elementId: el.id });
    });
  }
  return;
}


  if (tool === 'highlighter') {
    const newElement: CanvasElement = {
      id: generateId(),
      type: 'highlighter',
      x1: coords.x,
      y1: coords.y,
      x2: coords.x,
      y2: coords.y,
      points: JSON.stringify([coords]),
      color,
      strokeWidth,
      strokeStyle,
      zIndex: 0,
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedElement(newElement);
    setAction('drawing');
    return;
  }

  // Default drawing for other tools (pencil, line, rectangle, circle, text, etc.)
  setAction('drawing');

  if (tool === 'pencil') {
    const newElement: CanvasElement = {
      id: generateId(),
      type: 'pencil',
      x1: coords.x,
      y1: coords.y,
      x2: coords.x,
      y2: coords.y,
      points: JSON.stringify([coords]),
      color,
      strokeWidth,
      strokeStyle,
      zIndex: 0,
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedElement(newElement);
  } else if (tool === 'text') {
    const newId = generateId();
    setTextInput({ x: coords.x, y: coords.y, text: '', id: newId });
    setTimeout(() => textInputRef.current?.focus(), 50);
  }
};

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setCurrentPoint(coords);

    const now = Date.now();

    // Cursor broadcast
    if (socketRef.current && boardId && now - lastCursorEmitRef.current > 33) {
      lastCursorEmitRef.current = now;
      socketRef.current.emit('cursor-move', { boardId, userName, color: userCursorColor.current, x: coords.x, y: coords.y });
    }

    // Laser pointer
    if (tool === 'laser' && e.buttons === 1 && boardId) {
      laserPointsRef.current = [...laserPointsRef.current, coords].slice(-40);
      const localTrail: LaserTrail = {
        socketId: 'local',
        userName,
        color: userCursorColor.current,
        points: laserPointsRef.current,
        timestamp: now,
      };
      setLaserTrails(prev => {
        const index = prev.findIndex(t => t.socketId === 'local');
        if (index > -1) { const u = [...prev]; u[index] = localTrail; return u; }
        return [...prev, localTrail];
      });
      if (now - lastLaserEmitRef.current > 33) {
        lastLaserEmitRef.current = now;
        socketRef.current?.emit('laser-move', { boardId, userName, color: userCursorColor.current, points: laserPointsRef.current });
      }
      return;
    }

    if (action === 'panning') {
      setPan((prev) => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
      return;
    }

    if (action === 'drawing') {
      if (tool === 'pencil' && selectedElement) {
        setElements((prev) => {
          const index = prev.findIndex((el) => el.id === selectedElement.id);
          if (index > -1) {
            const updated = [...prev];
            const el = updated[index];
            const pts: Point[] = JSON.parse(el.points || '[]');
            pts.push(coords);
            const minX = Math.min(...pts.map(p => p.x));
            const maxX = Math.max(...pts.map(p => p.x));
            const minY = Math.min(...pts.map(p => p.y));
            const maxY = Math.max(...pts.map(p => p.y));
            const newEl = { ...el, x1: minX, y1: minY, x2: maxX, y2: maxY, points: JSON.stringify(pts), strokeStyle };
            socketRef.current?.emit('draw-element', { boardId, element: newEl });
            return updated.map((item) => (item.id === selectedElement.id ? newEl : item));
          }
          return prev;
        });
      }
    } else if (action === 'moving' && selectedElement) {
      const dx = coords.x - startPoint.x;
      const dy = coords.y - startPoint.y;
      setElements((prev) => {
        const index = prev.findIndex((el) => el.id === selectedElement.id);
        if (index > -1) {
          const updated = [...prev];
          const el = updated[index];
          let updatedElement: CanvasElement;
          if (el.type === 'pencil' && el.points) {
            const pts: Point[] = JSON.parse(el.points);
            const shifted = pts.map((p) => ({ x: p.x + dx, y: p.y + dy }));
            updatedElement = { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy, points: JSON.stringify(shifted) };
          } else {
            updatedElement = { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
          }
          socketRef.current?.emit('draw-element', { boardId, element: updatedElement });
          return updated.map((item) => (item.id === selectedElement.id ? updatedElement : item));
        }
        return prev;
      });
      setStartPoint(coords);
    }
  };

  const handleMouseUp = () => {
    if (!boardId) return;

    // Stop laser emission, let fade animation run
    if (tool === 'laser') return;

    if (action === 'drawing') {
      let finalElement: CanvasElement | null = null;
      const id = generateId();
      const maxZ = elements.length > 0 ? Math.max(...elements.map(e => e.zIndex ?? 0)) : 0;

      if (tool === 'pencil' && selectedElement) {
        finalElement = elements.find(el => el.id === selectedElement.id) || null;
      } else if (['line', 'rectangle', 'circle'].includes(tool)) {
        finalElement = {
          id, type: tool as any,
          x1: startPoint.x, y1: startPoint.y,
          x2: currentPoint.x, y2: currentPoint.y,
          color, strokeWidth, strokeStyle,
          filled: (tool === 'rectangle' || tool === 'circle') ? filled : false,
          zIndex: maxZ + 1,
        };
        setElements((prev) => [...prev, finalElement as CanvasElement]);
      }

      if (finalElement) {
        setUndoStack((prev) => [...prev, elements.filter(el => el.id !== finalElement?.id)]);
        setRedoStack([]);
        socketRef.current?.emit('draw-element', { boardId, element: finalElement });
        onUndoStateChange(true, false);
      }
    } else if (action === 'moving' && selectedElement) {
      const finalElement = elements.find(el => el.id === selectedElement.id);
      if (finalElement) {
        setUndoStack((prev) => [...prev, elements.map(el => el.id === selectedElement.id ? selectedElement : el)]);
        socketRef.current?.emit('draw-element', { boardId, element: finalElement });
      }
    }
    setAction('none');
  };

  // Double‑click handler for sticky notes
  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!boardId) return;
    const coords = getCanvasCoords(e);
    const clickedEl = getElementAtPosition(coords.x, coords.y, elements);
    if (clickedEl && clickedEl.type === 'sticky-note') {
      setEditingNote(clickedEl);
      setEditingText(clickedEl.text || '');
      // focus after state update
      setTimeout(() => editTextareaRef.current?.focus(), 0);
    }
  };

  // Save edited sticky note
  const finishEditing = () => {
    if (!editingNote) return;
    const updatedElement: CanvasElement = { ...editingNote, text: editingText };
    setElements(prev => prev.map(el => el.id === editingNote.id ? updatedElement : el));
    socketRef.current?.emit('draw-element', { boardId, element: updatedElement });
    setEditingNote(null);
    setEditingText('');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && tool === 'select' && selectedElement && boardId) {
        setUndoStack((prev) => [...prev, elements]);
        setElements((prev) => prev.filter((el) => el.id !== selectedElement.id));
        socketRef.current?.emit('delete-element', { boardId, elementId: selectedElement.id });
        setSelectedElement(null);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); handleRedo(); return; }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v': onChangeTool('select'); break;
          case 'p': onChangeTool('pencil'); break;
          case 'e': onChangeTool('eraser'); break;
          case 'l': onChangeTool('line'); break;
          case 'r': onChangeTool('rectangle'); break;
          case 'o': onChangeTool('circle'); break;
          case 't': onChangeTool('text'); break;
          case 'z': onChangeTool('laser'); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, elements, boardId, tool, onChangeTool]);

  const handleUndo = () => {
    if (undoStack.length === 0 || !boardId) return;
    const previousState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    setRedoStack((prev) => [...prev, elements]);
    const currentMap = new Map(elements.map(e => [e.id, e]));
    const previousMap = new Map(previousState.map(e => [e.id, e]));
    elements.forEach(el => {
      if (!previousMap.has(el.id)) socketRef.current?.emit('delete-element', { boardId, elementId: el.id });
    });
    previousState.forEach(el => {
      const current = currentMap.get(el.id);
      if (!current || JSON.stringify(current) !== JSON.stringify(el)) socketRef.current?.emit('draw-element', { boardId, element: el });
    });
    setElements(previousState);
    setUndoStack(newUndoStack);
    onUndoStateChange(newUndoStack.length > 0, true);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !boardId) return;
    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    setUndoStack((prev) => [...prev, elements]);
    const currentMap = new Map(elements.map(e => [e.id, e]));
    const nextMap = new Map(nextState.map(e => [e.id, e]));
    elements.forEach(el => {
      if (!nextMap.has(el.id)) socketRef.current?.emit('delete-element', { boardId, elementId: el.id });
    });
    nextState.forEach(el => {
      const current = currentMap.get(el.id);
      if (!current || JSON.stringify(current) !== JSON.stringify(el)) socketRef.current?.emit('draw-element', { boardId, element: el });
    });
    setElements(nextState);
    setRedoStack(newRedoStack);
    onUndoStateChange(true, newRedoStack.length > 0);
  };

  const finalizeTextInput = () => {
    if (!textInput || !boardId) return;
    const trimmed = textInput.text.trim();
    if (trimmed) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      let textWidth = 100;
      if (ctx) { ctx.font = '18px Inter, sans-serif'; textWidth = ctx.measureText(trimmed).width; }
      const maxZ = elements.length > 0 ? Math.max(...elements.map(e => e.zIndex ?? 0)) : 0;
      const textElement: CanvasElement = {
        id: textInput.id, type: 'text',
        x1: textInput.x, y1: textInput.y,
        x2: textInput.x + textWidth, y2: textInput.y + 24,
        color, strokeWidth, text: trimmed, zIndex: maxZ + 1,
      };
      setUndoStack((prev) => [...prev, elements]);
      setElements((prev) => [...prev, textElement]);
      socketRef.current?.emit('draw-element', { boardId, element: textElement });
      onUndoStateChange(true, false);
    }
    setTextInput(null);
  };

  const handleZoom = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const currentZoom = zoom;
    let nextZoom = currentZoom;
    if (e.deltaY < 0) nextZoom = Math.min(currentZoom * zoomFactor, 6);
    else nextZoom = Math.max(currentZoom / zoomFactor, 0.2);
    const dx = mouseX - pan.x;
    const dy = mouseY - pan.y;
    setZoom(nextZoom);
    setPan({ x: mouseX - dx * (nextZoom / currentZoom), y: mouseY - dy * (nextZoom / currentZoom) });
  };

  const exportCanvasImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || elements.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    elements.forEach((el) => {
      minX = Math.min(minX, el.x1, el.x2); maxX = Math.max(maxX, el.x1, el.x2);
      minY = Math.min(minY, el.y1, el.y2); maxY = Math.max(maxY, el.y1, el.y2);
    });
    const margin = 30;
    minX -= margin; minY -= margin; maxX += margin; maxY += margin;
    const exportWidth = maxX - minX;
    const exportHeight = maxY - minY;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = exportWidth; tempCanvas.height = exportHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    tempCtx.fillStyle = backgroundColor;
    tempCtx.fillRect(0, 0, exportWidth, exportHeight);
    tempCtx.translate(-minX, -minY);
    const sorted = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    sorted.forEach((el) => {
      const style = getCanvasStyle(tempCtx, el.color, el.x1, el.y1, el.x2, el.y2);
      tempCtx.strokeStyle = style; tempCtx.fillStyle = style;
      tempCtx.lineWidth = el.strokeWidth; tempCtx.lineCap = 'round'; tempCtx.lineJoin = 'round';
      
      const sStyle = el.strokeStyle || 'solid';
      if (sStyle === 'dashed') {
        tempCtx.setLineDash([12, 6]);
      } else if (sStyle === 'dotted') {
        tempCtx.setLineDash([3, 6]);
      } else {
        tempCtx.setLineDash([]);
      }

      switch (el.type) {
        case 'pencil':
          if (el.points) {
            const pts: Point[] = JSON.parse(el.points);
            if (pts.length > 0) {
              if (sStyle === 'rough') {
                for (let i = 0; i < pts.length - 1; i++) {
                  drawRoughLine(tempCtx, pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);
                }
              } else {
                tempCtx.beginPath(); tempCtx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) tempCtx.lineTo(pts[i].x, pts[i].y);
                tempCtx.stroke();
              }
            }
          }
          break;
        case 'line':
          if (sStyle === 'rough') {
            drawRoughLine(tempCtx, el.x1, el.y1, el.x2, el.y2);
          } else {
            tempCtx.beginPath(); tempCtx.moveTo(el.x1, el.y1); tempCtx.lineTo(el.x2, el.y2); tempCtx.stroke();
          }
          break;
        case 'rectangle':
          tempCtx.beginPath(); tempCtx.rect(el.x1, el.y1, el.x2 - el.x1, el.y2 - el.y1);
          if (el.filled) { tempCtx.globalAlpha = 0.25; tempCtx.fill(); tempCtx.globalAlpha = 1; }
          tempCtx.stroke(); break;
        case 'circle': {
          const r = distance({ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 });
          tempCtx.beginPath(); tempCtx.arc(el.x1, el.y1, r, 0, 2 * Math.PI);
          if (el.filled) { tempCtx.globalAlpha = 0.25; tempCtx.fill(); tempCtx.globalAlpha = 1; }
          tempCtx.stroke(); break;
        }
        case 'text':
          if (el.text) { tempCtx.font = '18px Inter, sans-serif'; tempCtx.textBaseline = 'top'; tempCtx.fillText(el.text, el.x1, el.y1); }
          break;
      }
    });
    const dataUrl = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `collabspace-board-${boardId || 'export'}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="drawing-board-container" data-testid="drawing-board">
      {boardId ? (
        <>
          <canvas
              ref={canvasRef}
              data-testid="drawing-canvas"
              className={`canvas-element ${tool === 'select' ? 'select-tool' : ''} ${action === 'panning' ? 'pan-tool' : ''} ${tool === 'laser' ? 'laser-tool' : ''}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onDoubleClick={handleCanvasDoubleClick}
              onWheel={handleZoom}
            />

          {textInput && (
              <textarea
                ref={textInputRef}
                className="canvas-textarea"
                style={{
                  left: `${textInput.x * zoom + pan.x}px`,
                  top: `${textInput.y * zoom + pan.y}px`,
                  font: `${18 * zoom}px Inter, sans-serif`,
                  color: color,
                }}
                value={textInput.text}
                onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
                onBlur={finalizeTextInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finalizeTextInput(); }
                }}
              />
            )}
            {editingNote && (
              <textarea
                ref={editTextareaRef}
                className="canvas-textarea"
                style={{
                  left: `${editingNote.x1 * zoom + pan.x}px`,
                  top: `${editingNote.y1 * zoom + pan.y}px`,
                  font: `${18 * zoom}px Inter, sans-serif`,
                  color: editingNote.color,
                }}
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={finishEditing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finishEditing(); }
                }}
              />
            )}
          

          {remoteCursors.map((cursor) => {
            const screenX = cursor.x * zoom + pan.x;
            const screenY = cursor.y * zoom + pan.y;
            if (cursor.x === -9999 || screenX < 0 || screenY < 0 || screenX > window.innerWidth || screenY > window.innerHeight) return null;
            return (
              <div key={cursor.socketId} className="remote-cursor" style={{ transform: `translate(${screenX}px, ${screenY}px)` }}>
                <svg className="cursor-pointer-svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4.5 3V17L9.5 12.5H16.5L4.5 3Z" fill={cursor.color} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
                <div className="cursor-label" style={{ borderLeft: `3px solid ${cursor.color}` }}>
                  {cursor.userName || 'Anonymous'}
                </div>
              </div>
            );
          })}

          <div className="zoom-indicator">{Math.round(zoom * 100)}%</div>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', flexDirection: 'column', gap: '8px' }}>
          <h2>Select or Create a Board to Start</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Use the sidebar panel to setup your room session</p>
        </div>
      )}
    </div>
  );
};
