export interface Point {
  x: number;
  y: number;
}

export type Tool = 'select' | 'pencil' | 'line' | 'rectangle' | 'circle' | 'text' | 'eraser' | 'laser' | 'highlighter' | 'image' | 'sticky-note';
export type LaserStyle = 'solid' | 'dashed' | 'dotted' | 'rough';


export interface GradientConfig {
  type: 'linear';
  color1: string;
  color2: string;
  angle: number;
}


export interface CanvasElement {
  id: string;
  type: 'pencil' | 'line' | 'rectangle' | 'circle' | 'text' | 'highlighter' | 'image' | 'sticky-note';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  points?: string; // JSON string representing Point[] (for pencil tool)
  color: string;
  strokeWidth: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted' | 'rough';
  text?: string;
  filled?: boolean;
  src?: string; // Base64 or URL for image elements
  width?: number; // optional rendered width
  height?: number; // optional rendered height
  zIndex?: number;
  // Sticky note specific fields (reuse color and text)
  // color already represents background color for sticky-note
  // text field contains note content


}

export type GridStyle = 'dots' | 'lines' | 'none';

export interface LaserTrail {
  socketId: string;
  userName: string;
  color: string;
  points: Point[];
  timestamp: number;
}

export interface Cursor {
  socketId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
}

export interface Board {
  id: string;
  name: string;
  backgroundColor?: string;
  createdAt: string;
  updatedAt: string;
}
