import React, { useState, useEffect, useRef } from 'react';
import type { Board } from '../types';
import {
  Plus, Users, Copy, Check, Hash, Trash2, Pencil,
  Sun, Moon, LogIn, Shield,
} from 'lucide-react';
import { getBackendUrl, isValidBoardId, isValidBoardName, normalizeBoardName } from '../lib/validation';
import './Sidebar.css';

interface SidebarProps {
  currentBoardId: string | null;
  onSelectBoard: (boardId: string) => void;
  userName: string;
  onUserNameChange: (name: string) => void;
  activeUsers: { socketId: string; userName: string; color: string }[];
  isDark: boolean;
  onToggleTheme: () => void;
}

const LOCAL_BOARDS_KEY = 'collabspace_local_boards';

function readLocalBoards(): Board[] {
  try {
    const raw = localStorage.getItem(LOCAL_BOARDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Board[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalBoards(boards: Board[]) {
  localStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(boards));
}

const JoinByIdForm: React.FC<{ onSelectBoard: (id: string) => void }> = ({ onSelectBoard }) => {
  const [joinId, setJoinId] = useState('');
  const [joinError, setJoinError] = useState('');
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinId.trim();
    if (!isValidBoardId(trimmed)) {
      setJoinError('Room IDs are 8–80 letters, numbers, _ or -.');
      return;
    }
    onSelectBoard(trimmed);
    setJoinId('');
    setJoinError('');
  };
  return (
    <form onSubmit={handleJoin} className="create-board-form" data-testid="join-room-form">
      <input
        type="text"
        className="input-field"
        placeholder="Paste Room ID…"
        value={joinId}
        onChange={(e) => {
          setJoinId(e.target.value);
          if (joinError) setJoinError('');
        }}
        data-testid="join-room-input"
      />
      {joinError && <span className="error-text">{joinError}</span>}
      <button type="submit" className="btn-secondary" style={{ justifyContent: 'center' }} data-testid="join-room-submit">
        <LogIn size={14} /> Join Room
      </button>
    </form>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentBoardId,
  onSelectBoard,
  userName,
  onUserNameChange,
  activeUsers,
  isDark,
  onToggleTheme,
}) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoardName, setNewBoardName] = useState('');
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [offline, setOffline] = useState(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const BACKEND_URL = getBackendUrl(import.meta.env.VITE_API_URL as string | undefined);
  const API_URL = `${BACKEND_URL}/api/boards`;

  const fetchBoards = async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('unexpected payload');
      setBoards(data);
      setOffline(false);
    } catch (err) {
      console.error('Error fetching boards:', err);
      setOffline(true);
      setBoards(readLocalBoards());
    }
  };

  useEffect(() => {
    fetchBoards();
    const interval = setInterval(fetchBoards, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newBoardName.trim();
    if (!isValidBoardName(trimmed)) {
      setCreateError('Enter a board name (1–80 characters).');
      return;
    }
    setCreateError('');
    setIsCreating(true);
    const name = normalizeBoardName(trimmed);

    if (offline) {
      const board: Board = {
        id: crypto.randomUUID(),
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const next = [board, ...readLocalBoards()];
      writeLocalBoards(next);
      setBoards(next);
      setNewBoardName('');
      onSelectBoard(board.id);
      setIsCreating(false);
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNewBoardName('');
      fetchBoards();
      if (data?.id) onSelectBoard(data.id);
    } catch (err) {
      console.error('Error creating board:', err);
      setCreateError('Failed to create. Is the server running?');
      setOffline(true);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    setDeletingId(boardId);
    setDeleteError(null);

    if (offline) {
      const next = readLocalBoards().filter((b) => b.id !== boardId);
      writeLocalBoards(next);
      setBoards(next);
      setConfirmDeleteId(null);
      setDeletingId(null);
      if (currentBoardId === boardId) {
        window.history.pushState({}, '', '/');
        window.location.reload();
      }
      return;
    }

    try {
      const res = await fetch(`${API_URL}/${boardId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setConfirmDeleteId(null);
      fetchBoards();
      if (currentBoardId === boardId) {
        window.history.pushState({}, '', '/');
        window.location.reload();
      }
    } catch (err) {
      console.error('Error deleting board:', err);
      setDeleteError('Failed to delete. Please try again.');
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRenameStart = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(board.id);
    setRenameValue(board.name);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const handleRenameSubmit = async (boardId: string) => {
    const trimmed = renameValue.trim();
    if (!isValidBoardName(trimmed) || !renamingId) { setRenamingId(null); return; }
    const name = normalizeBoardName(trimmed);

    if (offline) {
      const next = readLocalBoards().map((b) => (b.id === boardId ? { ...b, name } : b));
      writeLocalBoards(next);
      setBoards(next);
      setRenamingId(null);
      return;
    }

    try {
      await fetch(`${API_URL}/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, name } : b)));
    } catch (err) {
      console.error('Error renaming board:', err);
    }
    setRenamingId(null);
  };

  const copyRoomId = () => {
    if (!currentBoardId) return;
    navigator.clipboard.writeText(currentBoardId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const getInitial = (name: string) => (name || 'A').charAt(0).toUpperCase();

  return (
    <aside className="sidebar" data-testid="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo-icon">
            <Shield size={16} color="white" />
          </div>
          <span className="sidebar-title">CollabSpace</span>
        </div>
        <div className="sidebar-header-actions">
          <button
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
            data-testid="theme-toggle"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>

      <div className="sidebar-content">
        <div className="sidebar-section">
          <div className="section-title">Your Profile</div>
          <div className="profile-card">
            <div className="profile-avatar-seed">
              {getInitial(userName)}
            </div>
            <input
              type="text"
              className="profile-input"
              placeholder="Your name…"
              value={userName}
              onChange={(e) => onUserNameChange(e.target.value)}
              maxLength={32}
              data-testid="username-input"
            />
          </div>
        </div>

        {offline && (
          <div className="sidebar-section" data-testid="offline-banner">
            <span className="error-text">
              Backend unreachable — boards in this browser only. Run the Express server for live multiplayer.
            </span>
          </div>
        )}

        <div className="section-divider" />

        {currentBoardId && (
          <>
            <div className="sidebar-section">
              <div className="section-title">Room Code</div>
              <div className="room-code-card">
                <span className="room-code-text" data-testid="room-code">{currentBoardId}</span>
                <button
                  className={`icon-btn ${copied ? 'copied' : ''}`}
                  onClick={copyRoomId}
                  title="Copy Room ID"
                  data-testid="copy-room-id"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            </div>
            <div className="section-divider" />
          </>
        )}

        <div className="sidebar-section">
          <div className="section-title">
            <Users size={11} />
            Collaborators ({activeUsers.length})
          </div>
          <div className="collab-list" data-testid="collaborators">
            {activeUsers.map((user) => (
              <div key={user.socketId} className="user-badge">
                <span className="user-avatar" style={{ backgroundColor: user.color }}>
                  {getInitial(user.userName)}
                </span>
                <span className="user-name">{user.userName || 'Anonymous'}</span>
                {user.socketId === 'local' && (
                  <span className="user-you-tag">You</span>
                )}
              </div>
            ))}
            {activeUsers.length === 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px 0' }}>
                Waiting for collaborators…
              </span>
            )}
          </div>
        </div>

        <div className="section-divider" />

        <div className="sidebar-section">
          <div className="section-title">New Board</div>
          <form onSubmit={handleCreateBoard} className="create-board-form" data-testid="create-board-form">
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Design Sprint, Brainstorm…"
              value={newBoardName}
              onChange={(e) => {
                setNewBoardName(e.target.value);
                if (createError) setCreateError('');
              }}
              style={createError ? { borderColor: '#ef4444' } : {}}
              data-testid="create-board-input"
            />
            {createError && <span className="error-text">{createError}</span>}
            <button
              type="submit"
              className="btn-primary"
              disabled={isCreating}
              style={{ justifyContent: 'center' }}
              data-testid="create-board-submit"
            >
              <Plus size={15} />
              {isCreating ? 'Creating…' : 'Create Board'}
            </button>
          </form>
        </div>

        <div className="sidebar-section">
          <div className="section-title">Join by ID</div>
          <JoinByIdForm onSelectBoard={onSelectBoard} />
        </div>

        <div className="section-divider" />

        <div className="sidebar-section">
          <div className="section-title">
            <Hash size={11} />
            Boards & Rooms
          </div>
          <div className="board-list" data-testid="board-list">
            {boards.map((board) => (
              <div
                key={board.id}
                className={`board-item ${currentBoardId === board.id ? 'active' : ''}`}
                onClick={() => onSelectBoard(board.id)}
                data-testid={`board-item-${board.id}`}
              >
                <Hash size={13} className="board-hash-icon" />
                <div className="board-info">
                  {renamingId === board.id ? (
                    <input
                      ref={renameInputRef}
                      className="input-field"
                      style={{ padding: '3px 7px', fontSize: '12px', height: '26px' }}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameSubmit(board.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(board.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <div className="board-name">{board.name}</div>
                      <div className="board-date">{formatDate(board.createdAt)}</div>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  {currentBoardId === board.id && <div className="live-indicator" />}
                  {confirmDeleteId === board.id ? (
                    <div className="board-confirm-row">
                      <button
                        className="icon-btn"
                        title="Confirm delete"
                        onClick={(e) => { e.stopPropagation(); handleDeleteBoard(board.id); }}
                        disabled={deletingId === board.id}
                      >
                        <Check size={13} />
                      </button>
                      <button
                        className="icon-btn"
                        title="Cancel"
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        className="icon-btn"
                        title="Rename"
                        onClick={(e) => handleRenameStart(board, e)}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="icon-btn"
                        title="Delete"
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(board.id); setDeleteError(null); }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {boards.length === 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px 0' }}>
                No boards yet — create one above.
              </span>
            )}
            {deleteError && <span className="error-text">{deleteError}</span>}
          </div>
        </div>
      </div>
    </aside>
  );
};
