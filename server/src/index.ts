import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import {
  corsOriginOption,
  isValidBoardId,
  isValidBoardName,
  isValidColor,
  isValidUsername,
  normalizeBoardName,
  sanitizeElement,
} from './validation';

const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);
const corsOrigin = corsOriginOption(process.env.CORS_ORIGIN);

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '256kb' }));

app.get('/', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'CollabSpace Backend API',
    uptime: process.uptime(),
  });
});

app.get('/api/boards', async (_req, res) => {
  try {
    const boards = await prisma.board.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    res.json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/boards', async (req, res) => {
  try {
    const { name } = req.body;
    if (!isValidBoardName(name)) {
      return res.status(400).json({ error: 'Board name is required (1–80 characters)' });
    }
    const board = await prisma.board.create({
      data: { name: normalizeBoardName(name) },
    });
    res.json(board);
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/boards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidBoardId(id)) {
      return res.status(400).json({ error: 'Invalid board id' });
    }
    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        elements: {
          orderBy: { zIndex: 'asc' },
        },
      },
    });
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    res.json(board);
  } catch (error) {
    console.error('Error fetching board details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/boards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidBoardId(id)) {
      return res.status(400).json({ error: 'Invalid board id' });
    }
    const { name, backgroundColor } = req.body;
    const updateData: { name?: string; backgroundColor?: string } = {};
    if (name !== undefined) {
      if (!isValidBoardName(name)) {
        return res.status(400).json({ error: 'Board name must be 1–80 characters' });
      }
      updateData.name = normalizeBoardName(name);
    }
    if (backgroundColor !== undefined) {
      if (!isValidColor(backgroundColor)) {
        return res.status(400).json({ error: 'Invalid background color' });
      }
      updateData.backgroundColor = backgroundColor;
    }

    const board = await prisma.board.update({
      where: { id },
      data: updateData,
    });
    res.json(board);
  } catch (error) {
    console.error('Error updating board:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/boards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidBoardId(id)) {
      return res.status(400).json({ error: 'Invalid board id' });
    }
    await prisma.element.deleteMany({ where: { boardId: id } });
    await prisma.board.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting board:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', async (payload: unknown) => {
    const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const boardId = body.boardId;
    if (!isValidBoardId(boardId)) return;
    const userName = isValidUsername(body.userName) ? body.userName.trim() : 'Anonymous';

    socket.join(`room-${boardId}`);
    console.log(`User ${userName} joined room: room-${boardId}`);

    try {
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: { elements: { orderBy: { zIndex: 'asc' } } },
      });
      socket.emit('canvas-history', {
        elements: board?.elements ?? [],
        backgroundColor: board?.backgroundColor,
      });
    } catch (err) {
      console.error('Error loading room history:', err);
    }
  });

  socket.on('draw-element', async (payload: unknown) => {
    const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const boardId = body.boardId;
    if (!isValidBoardId(boardId)) return;
    const element = sanitizeElement(body.element);
    if (!element) return;

    socket.to(`room-${boardId}`).emit('element-update', element);

    try {
      const boardExists = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true } });
      if (!boardExists) return;

      await prisma.element.upsert({
        where: { id: element.id },
        update: {
          x1: element.x1,
          y1: element.y1,
          x2: element.x2,
          y2: element.y2,
          points: element.points || '',
          color: element.color,
          strokeWidth: element.strokeWidth,
          strokeStyle: element.strokeStyle || 'solid',
          text: element.text,
          filled: element.filled ?? false,
          zIndex: element.zIndex ?? 0,
        },
        create: {
          id: element.id,
          boardId,
          type: element.type,
          x1: element.x1,
          y1: element.y1,
          x2: element.x2,
          y2: element.y2,
          points: element.points || '',
          color: element.color,
          strokeWidth: element.strokeWidth,
          strokeStyle: element.strokeStyle || 'solid',
          text: element.text,
          filled: element.filled ?? false,
          zIndex: element.zIndex ?? 0,
        },
      });

      await prisma.board.update({
        where: { id: boardId },
        data: { updatedAt: new Date() },
      });
    } catch (err) {
      console.error('Error persisting element:', err);
    }
  });

  socket.on('delete-element', async (payload: unknown) => {
    const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const boardId = body.boardId;
    const elementId = body.elementId;
    if (!isValidBoardId(boardId) || !isNonEmptyElementId(elementId)) return;

    socket.to(`room-${boardId}`).emit('element-delete', elementId);

    try {
      await prisma.element.deleteMany({
        where: { id: elementId, boardId },
      });
    } catch (err) {
      console.error('Error deleting element:', err);
    }
  });

  socket.on('cursor-move', (payload: unknown) => {
    const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const boardId = body.boardId;
    if (!isValidBoardId(boardId)) return;
    const userName = isValidUsername(body.userName) ? body.userName.trim() : 'Anonymous';
    const color = isValidColor(body.color) ? body.color : '#6366f1';
    const x = typeof body.x === 'number' && Number.isFinite(body.x) ? body.x : 0;
    const y = typeof body.y === 'number' && Number.isFinite(body.y) ? body.y : 0;
    socket.to(`room-${boardId}`).emit('cursor-update', {
      socketId: socket.id,
      userName,
      color,
      x,
      y,
    });
  });

  socket.on('laser-move', (payload: unknown) => {
    const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const boardId = body.boardId;
    if (!isValidBoardId(boardId)) return;
    if (!Array.isArray(body.points) || body.points.length > 400) return;
    const userName = isValidUsername(body.userName) ? body.userName.trim() : 'Anonymous';
    const color = isValidColor(body.color) ? body.color : '#ef4444';
    socket.to(`room-${boardId}`).emit('laser-update', {
      socketId: socket.id,
      userName,
      color,
      points: body.points,
    });
  });

  socket.on('rename-board', (payload: unknown) => {
    const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const boardId = body.boardId;
    if (!isValidBoardId(boardId) || !isValidBoardName(body.name)) return;
    socket.to(`room-${boardId}`).emit('board-renamed', { boardId, name: normalizeBoardName(body.name) });
  });

  socket.on('update-board-bg', (payload: unknown) => {
    const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const boardId = body.boardId;
    if (!isValidBoardId(boardId) || !isValidColor(body.backgroundColor)) return;
    socket.to(`room-${boardId}`).emit('board-bg-updated', { boardId, backgroundColor: body.backgroundColor });
  });

  socket.on('clear-board', async (payload: unknown) => {
    const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const boardId = body.boardId;
    if (!isValidBoardId(boardId)) return;

    socket.to(`room-${boardId}`).emit('canvas-cleared');

    try {
      await prisma.element.deleteMany({
        where: { boardId },
      });
    } catch (err) {
      console.error('Error clearing board elements:', err);
    }
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room.startsWith('room-')) {
        socket.to(room).emit('user-left', socket.id);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

function isNonEmptyElementId(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 80;
}

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`CollabSpace Backend server running on port ${PORT}`);
});
