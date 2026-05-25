"use client";

import React from "react";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Shuffle, 
  Repeat, 
  Volume2, 
  VolumeX,
  Heart,
  Music
} from "lucide-react";
import { useAudio } from "../context/AudioContext";

export const Player: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    isLooping,
    isShuffled,
    
    pauseTrack,
    resumeTrack,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleLoop,
    toggleShuffle,
    toggleFavorite,
    likedTracks
  } = useAudio();

  const isLiked = currentTrack ? likedTracks.includes(currentTrack.track_id) : false;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const toggleMute = () => {
    setVolume(volume > 0 ? 0 : 0.8);
  };

  if (!currentTrack) {
    return (
      <div className="h-20 bg-zinc-950 border-t border-[var(--border)] px-6 flex items-center justify-center text-zinc-500 text-xs italic glass-panel">
        <Music className="h-4 w-4 mr-2 animate-pulse" />
        Select a track to start listening
      </div>
    );
  }

  return (
    <div className="h-24 bg-zinc-950 border-t border-[var(--border)] px-6 flex items-center justify-between glass-panel select-none">
      
      {/* Track Info Section */}
      <div className="flex items-center gap-3 w-1/4 min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentTrack.album_art_url}
          alt={currentTrack.track_name}
          className="h-14 w-14 rounded-md object-cover border border-zinc-800"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-white truncate" title={currentTrack.track_name}>
            {currentTrack.track_name}
          </span>
          <span className="text-xs text-[var(--muted)] truncate">
            {currentTrack.artist_name}
          </span>
        </div>
        <button
          onClick={() => toggleFavorite(currentTrack.track_id)}
          className="text-zinc-500 hover:text-red-500 transition-colors ml-2"
        >
          <Heart className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
        </button>
      </div>

      {/* Main Playback Control Bar */}
      <div className="flex flex-col items-center gap-2 w-2/4">
        {/* Buttons Row */}
        <div className="flex items-center gap-6">
          <button
            onClick={toggleShuffle}
            className={`p-1 transition-colors ${
              isShuffled ? "text-[var(--accent)] text-glow" : "text-zinc-500 hover:text-zinc-200"
            }`}
            title="Shuffle"
          >
            <Shuffle className="h-4 w-4" />
          </button>
          
          <button
            onClick={prevTrack}
            className="text-zinc-400 hover:text-white transition-colors"
            title="Previous"
          >
            <SkipBack className="h-5 w-5 fill-current" />
          </button>

          <button
            onClick={isPlaying ? pauseTrack : resumeTrack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="text-zinc-400 hover:text-white transition-colors"
            title="Next"
          >
            <SkipForward className="h-5 w-5 fill-current" />
          </button>

          <button
            onClick={toggleLoop}
            className={`p-1 transition-colors ${
              isLooping ? "text-[var(--accent)] text-glow" : "text-zinc-500 hover:text-zinc-200"
            }`}
            title="Repeat"
          >
            <Repeat className="h-4 w-4" />
          </button>
        </div>

        {/* Timeline Slider Progress Row */}
        <div className="flex items-center gap-3 w-full max-w-xl">
          <span className="text-[10px] font-mono text-zinc-500 min-w-[32px] text-right">
            {formatTime(progress)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={progress}
            onChange={handleProgressChange}
            className="player-slider"
          />
          <span className="text-[10px] font-mono text-zinc-500 min-w-[32px]">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume and Utilities Section */}
      <div className="flex items-center justify-end gap-3 w-1/4">
        <button
          onClick={toggleMute}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          {volume === 0 ? (
            <VolumeX className="h-4.5 w-4.5" />
          ) : (
            <Volume2 className="h-4.5 w-4.5" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={handleVolumeChange}
          className="w-20 player-slider"
        />
        {/* Subtle metadata stats */}
        {currentTrack && (
          <div className="text-[9px] text-zinc-500 font-mono hidden md:block bg-zinc-900 border border-zinc-800 px-2 py-1 rounded ml-4 select-text">
            {currentTrack.bpm} BPM | E {Math.round(currentTrack.energy * 100)}%
          </div>
        )}
      </div>

    </div>
  );
};
