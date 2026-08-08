import React, { useState, useEffect, useRef } from 'react';
import type { Board } from '../types';
import {
  Plus, Users, Copy, Check, Hash, Trash2, Pencil,
  Sun, Moon, LogIn, Shield,
} from 'lucide-react';
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

// ── Join-by-ID form (sub-component) ──────────────────────
const JoinByIdForm: React.FC<{ onSelectBoard: (id: string) => void }> = ({ onSelectBoard }) => {
  const [joinId, setJoinId] = useState('');
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinId.trim();
    if (!trimmed) return;
    onSelectBoard(trimmed);
    setJoinId('');
  };
  return (
    <form onSubmit={handleJoin} className="create-board-form">
      <input
        type="text"
        className="input-field"
        placeholder="Paste Room ID…"
        value={joinId}
        onChange={(e) => setJoinId(e.target.value)}
      />
      <button type="submit" className="btn-secondary" style={{ justifyContent: 'center' }}>
        <LogIn size={14} /> Join Room
      </button>
    </form>
  );
};

// ── Main Sidebar ─────────────────────────────────────────
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
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
  const API_URL = `${BACKEND_URL}/api/boards`;

  const fetchBoards = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setBoards(data);
    } catch (err) {
      console.error('Error fetching boards:', err);
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
    if (!trimmed) { setCreateError('Enter a board name first.'); return; }
    setCreateError('');
    setIsCreating(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      setNewBoardName('');
      fetchBoards();
      onSelectBoard(data.id);
    } catch (err) {
      console.error('Error creating board:', err);
      setCreateError('Failed to create. Is the server running?');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    setDeletingId(boardId);
    setDeleteError(null);
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
    if (!trimmed || !renamingId) { setRenamingId(null); return; }
    try {
      await fetch(`${API_URL}/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, name: trimmed } : b)));
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
    <aside className="sidebar">
      {/* ── Header ── */}
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
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="sidebar-content">

        {/* Profile */}
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
            />
          </div>
        </div>

        <div className="section-divider" />

        {/* Current Room Code */}
        {currentBoardId && (
          <>
            <div className="sidebar-section">
              <div className="section-title">Room Code</div>
              <div className="room-code-card">
                <span className="room-code-text">{currentBoardId}</span>
                <button
                  className={`icon-btn ${copied ? 'copied' : ''}`}
                  onClick={copyRoomId}
                  title="Copy Room ID"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            </div>
            <div className="section-divider" />
          </>
        )}

        {/* Collaborators */}
        <div className="sidebar-section">
          <div className="section-title">
            <Users size={11} />
            Collaborators ({activeUsers.length})
          </div>
          <div className="collab-list">
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

        {/* Create Board */}
        <div className="sidebar-section">
          <div className="section-title">New Board</div>
          <form onSubmit={handleCreateBoard} className="create-board-form">
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
            />
            {createError && <span className="error-text">{createError}</span>}
            <button
              type="submit"
              className="btn-primary"
              disabled={isCreating}
              style={{ justifyContent: 'center' }}
            >
              <Plus size={15} />
              {isCreating ? 'Creating…' : 'Create Board'}
            </button>
          </form>
        </div>

        {/* Join by Room ID */}
        <div className="sidebar-section">
          <div className="section-title">Join by ID</div>
          <JoinByIdForm onSelectBoard={onSelectBoard} />
        </div>

        <div className="section-divider" />

        {/* Boards & Rooms list */}
        <div className="sidebar-section">
          <div className="section-title">
            <Hash size={11} />
            Boards & Rooms
          </div>
          <div className="board-list">
            {boards.map((board) => (
              <div
                key={board.id}
                className={`board-item ${currentBoardId === board.id ? 'active' : ''}`}
                onClick={() => onSelectBoard(board.id)}
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

                {/* Live dot + action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  {currentBoardId === board.id && <div className="live-indicator" />}
                  {confirmDeleteId === board.id ? (
                    <div className="board-confirm-row">
                      <span>Delete?</span>
                      <button
                        className="confirm-yes-btn"
                        disabled={deletingId === board.id}
                        onClick={(e) => { e.stopPropagation(); handleDeleteBoard(board.id); }}
                      >
                        {deletingId === board.id ? '…' : 'Yes'}
                      </button>
                      <button
                        className="confirm-no-btn"
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="board-actions">
                      <button
                        className="board-delete-btn"
                        onClick={(e) => handleRenameStart(board, e)}
                        title={`Rename "${board.name}"`}
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        className="board-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(board.id);
                          setDeleteError(null);
                        }}
                        title={`Delete "${board.name}"`}
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {boards.length === 0 && (
              <div className="empty-boards-msg">No boards yet. Create one above!</div>
            )}
            {deleteError && <div className="delete-error-msg">{deleteError}</div>}
          </div>
        </div>
      </div>
    </aside>
  );
};
