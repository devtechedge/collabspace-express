import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production, customize this to your client URL
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Server health check
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'CollabSpace Backend API',
    uptime: process.uptime(),
  });
});

// API: Get all boards
app.get('/api/boards', async (req, res) => {
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

// API: Create a board
app.post('/api/boards', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Board name is required' });
    }
    const board = await prisma.board.create({
      data: { name },
    });
    res.json(board);
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Get single board details (with elements sorted by zIndex)
app.get('/api/boards/:id', async (req, res) => {
  try {
    const { id } = req.params;
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

// API: Rename or customize styling of a board
app.patch('/api/boards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, backgroundColor } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (backgroundColor !== undefined) updateData.backgroundColor = backgroundColor;

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

// API: Delete a board (and all its elements)
app.delete('/api/boards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Delete elements first (foreign key), then the board
    await prisma.element.deleteMany({ where: { boardId: id } });
    await prisma.board.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting board:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Socket.io Real-time connection handlers
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Track client join room
  socket.on('join-room', async ({ boardId, userName }) => {
    socket.join(`room-${boardId}`);
    console.log(`User ${userName || socket.id} joined room: room-${boardId}`);

    // Send board elements history to the newly connected user (sorted by zIndex)
    try {
      const elements = await prisma.element.findMany({
        where: { boardId },
        orderBy: { zIndex: 'asc' },
      });
      socket.emit('canvas-history', elements);
    } catch (err) {
      console.error('Error loading room history:', err);
    }
  });

  // Handle draw events (drawing/moving shapes)
  socket.on('draw-element', async ({ boardId, element }) => {
    // Broadcast shape changes to everyone else in the room immediately
    socket.to(`room-${boardId}`).emit('element-update', element);

    // Persist to the database in background
    try {
      // Guard: skip if the board no longer exists (was deleted mid-session)
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

      // Update the board's updatedAt timestamp
      await prisma.board.update({
        where: { id: boardId },
        data: { updatedAt: new Date() },
      });
    } catch (err) {
      console.error('Error persisting element:', err);
    }
  });

  // Handle delete element event
  socket.on('delete-element', async ({ boardId, elementId }) => {
    socket.to(`room-${boardId}`).emit('element-delete', elementId);

    try {
      await prisma.element.deleteMany({
        where: { id: elementId },
      });
    } catch (err) {
      console.error('Error deleting element:', err);
    }
  });

  // Handle cursor moves
  socket.on('cursor-move', ({ boardId, userName, color, x, y }) => {
    socket.to(`room-${boardId}`).emit('cursor-update', {
      socketId: socket.id,
      userName,
      color,
      x,
      y,
    });
  });

  // Handle laser movement events
  socket.on('laser-move', ({ boardId, userName, color, points }) => {
    socket.to(`room-${boardId}`).emit('laser-update', {
      socketId: socket.id,
      userName,
      color,
      points,
    });
  });

  // Handle board renaming socket broadcast
  socket.on('rename-board', ({ boardId, name }) => {
    socket.to(`room-${boardId}`).emit('board-renamed', { boardId, name });
  });

  // Handle board background color changes
  socket.on('update-board-bg', ({ boardId, backgroundColor }) => {
    socket.to(`room-${boardId}`).emit('board-bg-updated', { boardId, backgroundColor });
  });

  // Handle board clear
  socket.on('clear-board', async ({ boardId }) => {
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
    // Broadcast user leave to rooms they were in
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

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`CollabSpace Backend server running on port ${PORT}`);
});
