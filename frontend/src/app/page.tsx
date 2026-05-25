"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAudio, Track, Playlist } from "../context/AudioContext";
import { Sidebar } from "../components/Sidebar";
import { Player } from "../components/Player";
import { TrackCard } from "../components/TrackCard";
import { AuthModal } from "../components/AuthModal";
import { 
  Play, 
  Search as SearchIcon, 
  Flame, 
  Music, 
  Sparkles, 
  FolderHeart,
  TrendingUp,
  User,
  Heart,
  Calendar,
  X,
  Plus
} from "lucide-react";
import tracksCatalog from "../data/tracks_catalog.json";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { 
    isGymMode, 
    recommendations, 
    trendingAlbums, 
    discoveredArtists, 
    likedTracks, 
    playlists,
    removeTrackFromPlaylist,
    playTrack,
    loadingRecs,
    refreshData
  } = useAudio();

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);

  // Trigger search on query change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = (tracksCatalog as Track[]).filter(
      (t) =>
        t.track_name.toLowerCase().includes(q) ||
        t.artist_name.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q) ||
        t.album_name.toLowerCase().includes(q)
    );
    setSearchResults(matches.slice(0, 40)); // limit to 40 results
  }, [searchQuery]);

  // Loading state
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#06050a] gap-4">
        <div className="flex items-end gap-1.5">
          <div className="w-1.5 h-6 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:0.1s]"></div>
          <div className="w-1.5 h-10 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:0.2s]"></div>
          <div className="w-1.5 h-8 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:0.3s]"></div>
        </div>
        <span className="text-sm font-semibold tracking-widest text-zinc-400 animate-pulse uppercase">
          Initializing Soundscape...
        </span>
      </div>
    );
  }

  // Auth screen fallback
  if (!user) {
    return <AuthModal />;
  }

  // Get active playlist details
  const activePlaylist = playlists.find(p => p.playlist_id === selectedPlaylistId);
  const activePlaylistTracks = activePlaylist
    ? (tracksCatalog as Track[]).filter(t => activePlaylist.track_ids.includes(t.track_id))
    : [];

  // Get liked tracks objects
  const likedTrackObjects = (tracksCatalog as Track[]).filter(t => likedTracks.includes(t.track_id));

  // Quick action: play list of tracks
  const handlePlayCollection = (tracks: Track[]) => {
    if (tracks.length === 0) return;
    playTrack(tracks[0], tracks);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--background)] text-white transition-colors duration-500">
      
      {/* Upper Main Pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          setSelectedPlaylistId={setSelectedPlaylistId} 
        />

        {/* Dynamic Center Scroll View */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-zinc-950/20 to-zinc-950/80 px-8 py-8 relative">
          
          {/* Accent Ambient Glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-[var(--accent)] opacity-5 blur-[120px] pointer-events-none transition-theme"></div>

          {/* 1. Dashboard Tab View */}
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-8">
              
              {/* Modern Header Hero Banner */}
              <div className="relative rounded-2xl glass-panel border border-[var(--border)] p-8 overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/10 to-transparent pointer-events-none"></div>
                <div className="flex flex-col gap-2 relative z-10 max-w-xl">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--accent)] tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>Personalized Engine Active</span>
                  </div>
                  <h1 className="text-3xl font-black tracking-tight leading-none text-white">
                    Hey {user.username}, welcome back!
                  </h1>
                  <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                    {isGymMode 
                      ? "Gym Mode is firing! We've adaptively filtered high BPM, high energy tracks to keep your heartbeat elevated." 
                      : "Unleash customized streaming powered by live KNN taste vectors. Hover over any track to instantly audition climax points."
                    }
                  </p>
                </div>
                <button
                  onClick={() => refreshData()}
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider border border-zinc-800 transition-colors shadow-md relative z-10 flex-shrink-0"
                >
                  Sync Preferences
                </button>
              </div>

              {/* Recommendations Row */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {isGymMode ? (
                      <Flame className="h-5 w-5 text-orange-500 animate-pulse" />
                    ) : (
                      <Sparkles className="h-5 w-5 text-violet-500" />
                    )}
                    <h2 className="text-xl font-extrabold tracking-tight">
                      {isGymMode ? "High-Velocity Workouts" : "Custom Taste Recommendations"}
                    </h2>
                  </div>
                  {loadingRecs && (
                    <span className="text-xs text-[var(--accent)] animate-pulse font-medium">Re-ranking vectors...</span>
                  )}
                </div>

                {recommendations.length === 0 ? (
                  <div className="h-48 rounded-xl border border-dashed border-zinc-800 flex items-center justify-center text-zinc-500 text-sm">
                    No recommendations found. Try playing a track first!
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-6">
                    {recommendations.map((track) => (
                      <TrackCard key={track.track_id} track={track} displayQueue={recommendations} />
                    ))}
                  </div>
                )}
              </div>

              {/* Grid splitting Trending Albums & Artists */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Trending Albums */}
                <div className="rounded-xl glass-panel border border-[var(--border)] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-400">Trending Albums</h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    {trendingAlbums.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">No trending albums found.</p>
                    ) : (
                      trendingAlbums.map((album, idx) => (
                        <div 
                          key={idx}
                          onClick={() => {
                            setSearchQuery(album);
                            setActiveTab("search");
                          }}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-900/50 cursor-pointer transition-colors"
                        >
                          <span className="text-sm font-semibold text-zinc-300">{album}</span>
                          <span className="text-[10px] uppercase font-mono text-[var(--accent)]">Browse Tracklist</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Discovered Artists */}
                <div className="rounded-xl glass-panel border border-[var(--border)] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-4 w-4 text-[var(--accent)]" />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-400">Discovered Artists</h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    {discoveredArtists.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">No discovered artists found.</p>
                    ) : (
                      discoveredArtists.map((artist, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setSearchQuery(artist);
                            setActiveTab("search");
                          }}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-900/50 cursor-pointer transition-colors"
                        >
                          <span className="text-sm font-semibold text-zinc-300">{artist}</span>
                          <span className="text-[10px] uppercase font-mono text-zinc-500">Artist Page</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 2. Explore Library Tab View */}
          {activeTab === "search" && (
            <div className="flex flex-col gap-8">
              {/* Search Bar Block */}
              <div className="relative w-full max-w-2xl">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search tracks, artists, genres, or albums..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900/80 border border-[var(--border)] rounded-2xl pl-12 pr-4 py-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all shadow-lg"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Display catalog list or search results */}
              <div>
                <h2 className="text-xl font-extrabold tracking-tight mb-6">
                  {searchQuery ? `Search Results for "${searchQuery}"` : "All Library Tracks"}
                </h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-6">
                  {(searchQuery ? searchResults : (tracksCatalog as Track[]).slice(0, 30)).map((track) => (
                    <TrackCard 
                      key={track.track_id} 
                      track={track} 
                      displayQueue={searchQuery ? searchResults : (tracksCatalog as Track[]).slice(0, 30)} 
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. Favorites Tab View */}
          {activeTab === "favorites" && (
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-red-950/20 text-red-500 border border-red-900/50">
                    <Heart className="h-8 w-8 fill-current" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-white">Liked Songs</h1>
                    <p className="text-xs text-zinc-500 mt-1 uppercase font-bold tracking-wider">
                      {likedTracks.length} tracks favorited
                    </p>
                  </div>
                </div>
                {likedTrackObjects.length > 0 && (
                  <button
                    onClick={() => handlePlayCollection(likedTrackObjects)}
                    className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-xl text-sm font-bold uppercase tracking-wider shadow-lg flex items-center gap-2"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Play Collection</span>
                  </button>
                )}
              </div>

              {likedTrackObjects.length === 0 ? (
                <div className="h-64 rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center justify-center gap-3 text-zinc-500 text-sm">
                  <Heart className="h-10 w-10 text-zinc-600" />
                  <p>Songs you favorite will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-6">
                  {likedTrackObjects.map((track) => (
                    <TrackCard key={track.track_id} track={track} displayQueue={likedTrackObjects} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Playlist Detail View */}
          {activeTab === "playlist-detail" && activePlaylist && (
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-zinc-900 text-[var(--accent)] border border-zinc-800">
                    <Music className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-white">
                      {activePlaylist.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500">
                      <span className="uppercase font-bold tracking-wider text-[var(--accent)]">
                        Playlist
                      </span>
                      <span>•</span>
                      <span>{activePlaylist.track_ids.length} tracks</span>
                    </div>
                  </div>
                </div>
                
                {activePlaylistTracks.length > 0 && (
                  <button
                    onClick={() => handlePlayCollection(activePlaylistTracks)}
                    className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-xl text-sm font-bold uppercase tracking-wider shadow-lg flex items-center gap-2"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Play Playlist</span>
                  </button>
                )}
              </div>

              {activePlaylistTracks.length === 0 ? (
                <div className="h-64 rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center justify-center gap-3 text-zinc-500 text-sm">
                  <Music className="h-10 w-10 text-zinc-600" />
                  <p>This playlist has no tracks yet.</p>
                  <button 
                    onClick={() => setActiveTab("search")}
                    className="mt-2 text-xs font-bold text-[var(--accent)] uppercase tracking-wider hover:underline"
                  >
                    Browse Library to Add Songs
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 rounded-xl glass-panel border border-[var(--border)] overflow-hidden">
                  <div className="grid grid-cols-12 px-6 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-[var(--border)] bg-zinc-950/40">
                    <span className="col-span-1 text-center">#</span>
                    <span className="col-span-5">Title</span>
                    <span className="col-span-3">Album</span>
                    <span className="col-span-2">Stats</span>
                    <span className="col-span-1 text-right">Action</span>
                  </div>
                  {activePlaylistTracks.map((track, idx) => (
                    <div
                      key={track.track_id}
                      onClick={() => playTrack(track, activePlaylistTracks)}
                      className="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-zinc-900/30 border-b border-zinc-900/50 cursor-pointer transition-colors group text-sm"
                    >
                      <span className="col-span-1 text-center text-zinc-500 group-hover:text-white font-mono">
                        {idx + 1}
                      </span>
                      <div className="col-span-5 flex items-center gap-3 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={track.album_art_url}
                          alt={track.track_name}
                          className="h-10 w-10 rounded object-cover flex-shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-white truncate">{track.track_name}</span>
                          <span className="text-xs text-zinc-500 truncate mt-0.5">{track.artist_name}</span>
                        </div>
                      </div>
                      <span className="col-span-3 text-zinc-400 truncate pr-4">{track.album_name}</span>
                      <span className="col-span-2 text-zinc-500 text-xs font-mono">
                        {track.bpm} BPM | {Math.round(track.energy * 100)}% E
                      </span>
                      <div className="col-span-1 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTrackFromPlaylist(activePlaylist.playlist_id, track.track_id);
                          }}
                          className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded-md"
                          title="Remove from playlist"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Global Audio Controller Bar */}
      <Player />

    </div>
  );
}
