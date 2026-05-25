"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Heart, Plus, Check } from "lucide-react";
import { Track, useAudio } from "../context/AudioContext";

interface TrackCardProps {
  track: Track;
  displayQueue?: Track[];
}

export const TrackCard: React.FC<TrackCardProps> = ({ track, displayQueue }) => {
  const { 
    currentTrack, 
    isPlaying, 
    playTrack, 
    pauseTrack, 
    resumeTrack, 
    toggleFavorite, 
    likedTracks,
    playlists,
    addTrackToPlaylist
  } = useAudio();

  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState<boolean>(false);
  
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const isCurrent = currentTrack?.track_id === track.track_id;
  const isLiked = likedTracks.includes(track.track_id);

  // Setup preview audio on client side
  useEffect(() => {
    previewAudioRef.current = new Audio(track.s3_preview_url);
    previewAudioRef.current.loop = false;
    previewAudioRef.current.volume = 0.5; // lower volume for previews

    // Monitor ended state
    const handleEnded = () => {
      setIsPreviewPlaying(false);
    };
    previewAudioRef.current.addEventListener("ended", handleEnded);

    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.removeEventListener("ended", handleEnded);
        previewAudioRef.current.pause();
      }
    };
  }, [track.s3_preview_url]);

  // Handle Hover preview playback
  useEffect(() => {
    if (isHovered) {
      // Start 300ms debounce timer
      hoverTimeoutRef.current = setTimeout(() => {
        if (previewAudioRef.current) {
          // Play climax preview
          previewAudioRef.current.currentTime = 0;
          previewAudioRef.current.play()
            .then(() => {
              setIsPreviewPlaying(true);
            })
            .catch(err => {
              console.log("Hover preview blocked or failed:", err);
            });
        }
      }, 300);
    } else {
      // Clear timeout if mouse left early
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      
      // Stop preview playback if mouse leaves
      if (previewAudioRef.current && isPreviewPlaying) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
        setIsPreviewPlaying(false);
      }
    }

    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [isHovered, isPreviewPlaying]);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      if (isPlaying) {
        pauseTrack();
      } else {
        resumeTrack();
      }
    } else {
      // Play full audio stream
      playTrack(track, displayQueue);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(track.track_id);
  };

  const handlePlaylistSelect = (e: React.MouseEvent, playlistId: string) => {
    e.stopPropagation();
    addTrackToPlaylist(playlistId, track.track_id);
    setShowPlaylistMenu(false);
  };

  return (
    <div
      className={`group relative flex flex-col rounded-xl glass-panel p-4 transition-theme hover:bg-[var(--card-hover)] cursor-pointer select-none overflow-visible ${
        isCurrent ? "border-[var(--accent)] accent-glow" : "border-[var(--border)]"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowPlaylistMenu(false);
      }}
      onClick={handlePlayClick}
    >
      {/* Album Art Image Container */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-zinc-900 mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={track.album_art_url}
          alt={track.track_name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Climax Preview Indicator */}
        {isPreviewPlaying && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center transition-opacity">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent)] text-glow animate-pulse">
              10s Preview Climax
            </span>
            <div className="flex items-end gap-1 mt-2">
              <div className="w-1 h-4 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:0.1s]"></div>
              <div className="w-1 h-6 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1 h-3 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:0.3s]"></div>
            </div>
          </div>
        )}

        {/* Play/Pause Button overlay */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
          isHovered || isCurrent ? "opacity-100" : "opacity-0"
        }`}>
          <button
            onClick={handlePlayClick}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
          >
            {isCurrent && isPlaying ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 fill-current translate-x-0.5" />
            )}
          </button>
        </div>

        {/* Novelty Boost label */}
        {track.novelty_boosted && (
          <span className="absolute top-2 left-2 px-2 py-0.5 text-[9px] font-extrabold uppercase rounded bg-[var(--accent)] text-white tracking-wider shadow">
            Novelty Discovery
          </span>
        )}
      </div>

      {/* Info Section */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <h3 className="font-semibold text-sm truncate text-white min-w-0" title={track.track_name}>
            {track.track_name}
          </h3>
          <button 
            onClick={handleFavoriteClick}
            className="text-zinc-500 hover:text-red-500 transition-colors"
          >
            <Heart 
              className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} 
            />
          </button>
        </div>
        <p className="text-xs text-[var(--muted)] truncate mt-1">
          {track.artist_name}
        </p>

        {/* Metadata Details Row */}
        <div className="flex items-center gap-2 mt-3 text-[10px] text-zinc-500">
          <span className="bg-zinc-800/60 px-1.5 py-0.5 rounded border border-zinc-700/50">
            {track.genre}
          </span>
          <span>•</span>
          <span>{track.bpm} BPM</span>
          <span>•</span>
          <span>Energy {Math.round(track.energy * 100)}%</span>
        </div>
      </div>

      {/* Quick Add to Playlist Button & Menu */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowPlaylistMenu(!showPlaylistMenu);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur border border-zinc-700/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
        </button>
        
        {showPlaylistMenu && (
          <div className="absolute right-0 mt-1 w-44 rounded-lg bg-zinc-900 border border-zinc-800 p-1 shadow-xl z-20">
            <p className="text-[10px] font-bold text-zinc-500 px-2 py-1 uppercase tracking-wider">
              Add to playlist
            </p>
            <div className="max-h-28 overflow-y-auto">
              {playlists.length === 0 ? (
                <p className="text-[10px] text-zinc-400 px-2 py-1.5 italic">No playlists found</p>
              ) : (
                playlists.map(p => {
                  const hasTrack = p.track_ids.includes(track.track_id);
                  return (
                    <button
                      key={p.playlist_id}
                      onClick={(e) => handlePlaylistSelect(e, p.playlist_id)}
                      disabled={hasTrack}
                      className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-zinc-800 text-white flex items-center justify-between disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      <span className="truncate">{p.name}</span>
                      {hasTrack && <Check className="h-3 w-3 text-emerald-500" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
