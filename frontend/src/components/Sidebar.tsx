"use client";

import React, { useState } from "react";
import { 
  Music, 
  Flame, 
  Home, 
  Search, 
  Heart, 
  FolderHeart, 
  Plus, 
  Folder,
  LogOut,
  User as UserIcon,
  Play,
  Trash2
} from "lucide-react";
import { useAudio } from "../context/AudioContext";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setSelectedPlaylistId: (id: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab,
  setSelectedPlaylistId
}) => {
  const { 
    isGymMode, 
    gymTimeLeft, 
    toggleGymMode, 
    playlists, 
    createPlaylist,
    deletePlaylist 
  } = useAudio();
  const { user, signOut, isGuest } = useAuth();
  
  const [newPlaylistName, setNewPlaylistName] = useState<string>("");
  const [showCreateInput, setShowCreateInput] = useState<boolean>(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCreatePlaylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName("");
    setShowCreateInput(false);
  };

  const handlePlaylistClick = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    setActiveTab("playlist-detail");
  };

  const handleDeletePlaylistClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this playlist?")) {
      deletePlaylist(id);
    }
  };

  return (
    <div className="w-64 bg-zinc-950/70 border-r border-[var(--border)] flex flex-col h-full glass-panel">
      {/* App Branding */}
      <div className="p-6 border-b border-[var(--border)] flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-[var(--accent)] text-white transition-theme shadow-md ${isGymMode ? "animate-pulse" : ""}`}>
          <Music className="h-6 w-6" />
        </div>
        <span className="font-extrabold text-lg tracking-tight text-white flex flex-col">
          <span>ANTIGRAVITY</span>
          <span className="text-[10px] tracking-[0.2em] font-medium text-[var(--accent)] font-mono">STREAM</span>
        </span>
      </div>

      {/* Main Navigation Section */}
      <div className="px-4 py-6 flex flex-col gap-1">
        <button
          onClick={() => {
            setActiveTab("dashboard");
            setSelectedPlaylistId(null);
          }}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "dashboard"
              ? "bg-[var(--accent)] text-white shadow-md accent-glow font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
          }`}
        >
          <Home className="h-4 w-4" />
          <span>Home Dashboard</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("search");
            setSelectedPlaylistId(null);
          }}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "search"
              ? "bg-[var(--accent)] text-white shadow-md accent-glow font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
          }`}
        >
          <Search className="h-4 w-4" />
          <span>Explore Library</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("favorites");
            setSelectedPlaylistId(null);
          }}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "favorites"
              ? "bg-[var(--accent)] text-white shadow-md accent-glow font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
          }`}
        >
          <Heart className="h-4 w-4" />
          <span>Liked Songs</span>
        </button>
      </div>

      {/* Gym Focus Mode Control */}
      <div className="px-4 py-2 border-t border-[var(--border)] border-b pb-6 pt-6">
        <div className={`p-4 rounded-xl border relative overflow-hidden transition-all duration-500 ${
          isGymMode 
            ? "bg-gradient-to-br from-orange-950/20 to-amber-950/40 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.15)]" 
            : "bg-zinc-900/30 border-zinc-800"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Focus Environment
            </span>
            {isGymMode && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${isGymMode ? "bg-orange-500 text-white animate-bounce" : "bg-zinc-800 text-zinc-400"}`}>
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Gym Mode</h4>
              <p className="text-[10px] text-zinc-500">Fast BPM, High Energy</p>
            </div>
          </div>

          {isGymMode && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-orange-400 mb-1 font-mono">
                <span>ACTIVE SESSION</span>
                <span>{formatTime(gymTimeLeft)}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-orange-500 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${(gymTimeLeft / 3600) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          <button
            onClick={toggleGymMode}
            className={`w-full py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              isGymMode 
                ? "bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/20" 
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            }`}
          >
            {isGymMode ? "End Focus Workout" : "Unleash Gym Mode"}
          </button>
        </div>
      </div>

      {/* Playlists Management */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest px-2 mb-4">
          <span>Your Playlists</span>
          <button 
            onClick={() => setShowCreateInput(!showCreateInput)}
            className="text-zinc-400 hover:text-white transition-colors"
            title="Create Playlist"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {showCreateInput && (
          <form onSubmit={handleCreatePlaylistSubmit} className="mb-4 px-2">
            <input
              type="text"
              required
              placeholder="Playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="w-full bg-zinc-900 border border-[var(--border)] rounded px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent)]"
              autoFocus
            />
          </form>
        )}

        <div className="flex flex-col gap-1">
          {playlists.length === 0 ? (
            <p className="text-xs text-zinc-500 italic px-2">No playlists created.</p>
          ) : (
            playlists.map((playlist) => (
              <div
                key={playlist.playlist_id}
                onClick={() => handlePlaylistClick(playlist.playlist_id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-900/30 cursor-pointer transition-colors ${
                  activeTab === "playlist-detail" && playlist.playlist_id === playlist.playlist_id
                    ? "bg-zinc-900/50 text-white border-l-2 border-[var(--accent)] pl-2"
                    : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Folder className="h-3.5 w-3.5 flex-shrink-0 text-zinc-500 group-hover:text-[var(--accent)]" />
                  <span className="truncate">{playlist.name}</span>
                </div>
                <button
                  onClick={(e) => handleDeletePlaylistClick(e, playlist.playlist_id)}
                  className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Playlist"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* User Session profile panel */}
      <div className="p-4 border-t border-[var(--border)] bg-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 flex-shrink-0">
              <UserIcon className="h-4 w-4 text-zinc-300" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">
                {user?.username}
              </span>
              <span className="text-[10px] text-zinc-500 truncate">
                {isGuest ? "Guest Access" : "AWS Live"}
              </span>
            </div>
          </div>
          <button
            onClick={signOut}
            className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
