"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import tracksCatalog from "../data/tracks_catalog.json";

export interface Track {
  track_id: string;
  track_name: string;
  artist_name: string;
  album_name: string;
  genre: string;
  bpm: number;
  energy: number;
  danceability: number;
  valence: number;
  s3_stream_url: string;
  s3_preview_url: string;
  album_art_url: string;
  novelty_boosted?: boolean;
}

export interface Playlist {
  playlist_id: string;
  name: string;
  user_id: string;
  track_ids: string[];
  created_at: string;
  updated_at: string;
}

interface AudioContextType {
  // Playback state
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  currentIndex: number;
  volume: number;
  progress: number;
  duration: number;
  isLooping: boolean;
  isShuffled: boolean;
  
  // Controls
  playTrack: (track: Track, customQueue?: Track[]) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;

  // Gym/Focus context
  isGymMode: boolean;
  gymTimeLeft: number; // in seconds
  toggleGymMode: () => Promise<void>;

  // Data lists & API interactions
  recommendations: Track[];
  trendingAlbums: string[];
  discoveredArtists: string[];
  likedTracks: string[]; // List of track IDs
  playlists: Playlist[];
  loadingRecs: boolean;
  
  refreshData: () => Promise<void>;
  toggleFavorite: (trackId: string) => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist | null>;
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const API_BASE_URL = "https://41voy9kid5.execute-api.us-east-1.amazonaws.com/dev";

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, idToken, isGuest } = useAuth();
  
  // References
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playTrackIdRef = useRef<string | null>(null);
  
  // Playback state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [originalQueue, setOriginalQueue] = useState<Track[]>([]); // For shuffle reference
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isShuffled, setIsShuffled] = useState<boolean>(false);

  // Gym mode state
  const [isGymMode, setIsGymMode] = useState<boolean>(false);
  const [gymTimeLeft, setGymTimeLeft] = useState<number>(3600); // 1 hour default

  // Dashboard recommendations & user lists
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [trendingAlbums, setTrendingAlbums] = useState<string[]>([]);
  const [discoveredArtists, setDiscoveredArtists] = useState<string[]>([]);
  const [likedTracks, setLikedTracks] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);

  // Initialize Audio Object on mount
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setProgress(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const onEnded = () => {
      if (isLooping) {
        audio.currentTime = 0;
        audio.play().catch(err => console.log("Audio replay error:", err));
      } else {
        // Skip to next track
        handleNextTrack();
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    // Load state from localStorage if available
    const savedLikes = localStorage.getItem("local_liked_tracks");
    if (savedLikes) setLikedTracks(JSON.parse(savedLikes));
    
    const savedPlaylists = localStorage.getItem("local_playlists");
    if (savedPlaylists) setPlaylists(JSON.parse(savedPlaylists));

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
    };
  }, [isLooping, queue, currentIndex]);

  // Handle Gym timer count down
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isGymMode && gymTimeLeft > 0) {
      interval = setInterval(() => {
        setGymTimeLeft(prev => {
          if (prev <= 1) {
            // Gym Mode expired
            setIsGymMode(false);
            document.body.classList.remove("gym-mode");
            return 3600;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!isGymMode) {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGymMode, gymTimeLeft]);

  // Sync volume state to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Load recommendations/playlists whenever credentials change or Gym Mode changes
  useEffect(() => {
    if (user) {
      loadRecommendations();
      fetchUserData();
    } else {
      // Clear data for guests initially
      loadGuestMockData();
    }
  }, [user, idToken, isGymMode]);

  // Track play logs after 15 seconds
  useEffect(() => {
    if (isPlaying && currentTrack) {
      // If we switched to a new track, cancel old timer
      if (playTrackIdRef.current !== currentTrack.track_id) {
        if (trackPlayTimerRef.current) clearTimeout(trackPlayTimerRef.current);
        
        playTrackIdRef.current = currentTrack.track_id;
        
        trackPlayTimerRef.current = setTimeout(() => {
          logTrackPlay(currentTrack.track_id);
        }, 15000); // 15 seconds
      }
    } else {
      if (trackPlayTimerRef.current) {
        clearTimeout(trackPlayTimerRef.current);
        trackPlayTimerRef.current = null;
      }
    }
    
    return () => {
      if (trackPlayTimerRef.current) clearTimeout(trackPlayTimerRef.current);
    };
  }, [isPlaying, currentTrack]);

  // Helpers for API requests
  const getRequestHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (idToken) {
      headers["Authorization"] = idToken; // Pass raw Cognito token
    }
    return headers;
  };

  const fetchUserData = async () => {
    if (isGuest || !idToken) return;

    try {
      // Fetch playlists from API
      const res = await fetch(`${API_BASE_URL}/playlists`, {
        headers: getRequestHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data);
        localStorage.setItem("local_playlists", JSON.stringify(data));
      }
      
      // Fetch user profile to get liked tracks
      // (For our architecture, we can scan tracks table, but favorites endpoint gives us list)
      // Since lambda_crud doesn't have a direct GET /user, we can fetch from localStorage 
      // or sync upon favoriting. Let's seed initial liked songs if empty.
    } catch (e) {
      console.error("Error loading user data from API:", e);
    }
  };

  const loadGuestMockData = () => {
    // Generate simple recommendations from local catalog
    const allTracks = tracksCatalog as Track[];
    let recs: Track[] = [];
    
    if (isGymMode) {
      recs = allTracks.filter(t => t.energy >= 0.8 && t.bpm >= 120);
    } else {
      // Randomly sample some tracks
      recs = [...allTracks].sort(() => 0.5 - Math.random()).slice(0, 15);
    }
    
    setRecommendations(recs.slice(0, 15));
    setTrendingAlbums(Array.from(new Set(recs.map(t => t.album_name))).slice(0, 5));
    setDiscoveredArtists(Array.from(new Set(recs.map(t => t.artist_name))).slice(0, 5));
  };

  const loadRecommendations = async () => {
    setLoadingRecs(true);
    
    if (isGuest || !idToken) {
      loadGuestMockData();
      setLoadingRecs(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/recommendations`, {
        method: "GET",
        headers: getRequestHeaders(),
      });
      
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
        setTrendingAlbums(data.trending_albums || []);
        setDiscoveredArtists(data.discovered_artists || []);
      } else {
        console.error("Failed to load live recommendations, falling back...");
        loadGuestMockData();
      }
    } catch (e) {
      console.error("Error fetching recommendations, loading fallback local catalog:", e);
      loadGuestMockData();
    } finally {
      setLoadingRecs(false);
    }
  };

  const logTrackPlay = async (trackId: string) => {
    if (isGuest || !idToken) {
      console.log(`[Guest] Simulating track play log: ${trackId}`);
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/tracks/play`, {
        method: "POST",
        headers: getRequestHeaders(),
        body: JSON.stringify({ track_id: trackId }),
      });
      console.log(`Live play history logged for track: ${trackId}`);
    } catch (e) {
      console.error("Failed to post play log to backend:", e);
    }
  };

  // Playback Control Implementation
  const playTrack = (track: Track, customQueue?: Track[]) => {
    if (!audioRef.current) return;

    // Set new track source
    audioRef.current.src = track.s3_stream_url;
    audioRef.current.load();
    
    // Set queue
    if (customQueue && customQueue.length > 0) {
      setQueue(customQueue);
      setOriginalQueue(customQueue);
      const index = customQueue.findIndex(t => t.track_id === track.track_id);
      setCurrentIndex(index >= 0 ? index : 0);
    } else {
      // If no custom queue provided, check if track is in existing queue
      const index = queue.findIndex(t => t.track_id === track.track_id);
      if (index >= 0) {
        setCurrentIndex(index);
      } else {
        // Add to queue and play
        const newQueue = [...queue, track];
        setQueue(newQueue);
        setOriginalQueue(newQueue);
        setCurrentIndex(newQueue.length - 1);
      }
    }

    setCurrentTrack(track);
    setIsPlaying(true);
    
    // Play audio
    audioRef.current.play().catch(err => {
      console.warn("Audio playback failed, user interaction may be required:", err);
      setIsPlaying(false);
    });
  };

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resumeTrack = () => {
    if (audioRef.current && currentTrack) {
      audioRef.current.play().catch(err => console.log("Resume audio failed:", err));
      setIsPlaying(true);
    } else if (queue.length > 0) {
      playTrack(queue[0]);
    }
  };

  const handleNextTrack = () => {
    if (queue.length === 0) return;
    
    let nextIdx = currentIndex + 1;
    if (nextIdx >= queue.length) {
      nextIdx = 0; // Wrap around
    }
    
    setCurrentIndex(nextIdx);
    const nextTrackObj = queue[nextIdx];
    setCurrentTrack(nextTrackObj);
    
    if (audioRef.current) {
      audioRef.current.src = nextTrackObj.s3_stream_url;
      audioRef.current.play().catch(err => console.log("Next track play failed:", err));
      setIsPlaying(true);
    }
  };

  const handlePrevTrack = () => {
    if (queue.length === 0) return;
    
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) {
      prevIdx = queue.length - 1; // Wrap around to end
    }
    
    setCurrentIndex(prevIdx);
    const prevTrackObj = queue[prevIdx];
    setCurrentTrack(prevTrackObj);
    
    if (audioRef.current) {
      audioRef.current.src = prevTrackObj.s3_stream_url;
      audioRef.current.play().catch(err => console.log("Prev track play failed:", err));
      setIsPlaying(true);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const setVolume = (vol: number) => {
    const cleanVol = Math.max(0, Math.min(1, vol));
    setVolumeState(cleanVol);
  };

  const toggleLoop = () => {
    setIsLooping(prev => !prev);
  };

  const toggleShuffle = () => {
    if (isShuffled) {
      // Revert to original queue order
      setQueue(originalQueue);
      if (currentTrack) {
        const idx = originalQueue.findIndex(t => t.track_id === currentTrack.track_id);
        setCurrentIndex(idx);
      }
    } else {
      // Shuffle the queue
      const shuffled = [...queue].sort(() => Math.random() - 0.5);
      // Ensure currently playing track stays in queue, maybe swap to first index or keep its index
      if (currentTrack) {
        const remaining = shuffled.filter(t => t.track_id !== currentTrack.track_id);
        const finalShuffled = [currentTrack, ...remaining];
        setQueue(finalShuffled);
        setCurrentIndex(0);
      } else {
        setQueue(shuffled);
      }
    }
    setIsShuffled(prev => !prev);
  };

  const addToQueue = (track: Track) => {
    setQueue(prev => [...prev, track]);
    setOriginalQueue(prev => [...prev, track]);
  };

  const removeFromQueue = (trackId: string) => {
    setQueue(prev => prev.filter(t => t.track_id !== trackId));
    setOriginalQueue(prev => prev.filter(t => t.track_id !== trackId));
  };

  const clearQueue = () => {
    setQueue([]);
    setOriginalQueue([]);
    setCurrentIndex(-1);
    setCurrentTrack(null);
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
  };

  // Gym focus Mode
  const toggleGymMode = async () => {
    const targetMode = !isGymMode;
    setIsGymMode(targetMode);
    
    if (targetMode) {
      document.body.classList.add("gym-mode");
      setGymTimeLeft(3600); // Reset timer to 1 hour
      
      // API call to start session
      if (!isGuest && idToken) {
        try {
          await fetch(`${API_BASE_URL}/session/start`, {
            method: "POST",
            headers: getRequestHeaders(),
            body: JSON.stringify({ is_focus_mode: true, focus_context: "gym" })
          });
        } catch (e) {
          console.error("Failed to post session start to backend:", e);
        }
      }
    } else {
      document.body.classList.remove("gym-mode");
      // End session if backend has it. Since our session endpoint is short TTL, it naturally clears
    }
  };

  // Favorites/Liked songs CRUD
  const toggleFavorite = async (trackId: string) => {
    // Optimistic UI updates
    const isLiked = likedTracks.includes(trackId);
    let updatedLikes = [...likedTracks];
    
    if (isLiked) {
      updatedLikes = updatedLikes.filter(id => id !== trackId);
    } else {
      updatedLikes.push(trackId);
    }
    
    setLikedTracks(updatedLikes);
    localStorage.setItem("local_liked_tracks", JSON.stringify(updatedLikes));

    if (isGuest || !idToken) {
      console.log(`[Guest] Favorited track locally: ${trackId}`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/tracks/favorite`, {
        method: "POST",
        headers: getRequestHeaders(),
        body: JSON.stringify({ track_id: trackId }),
      });
      
      if (!res.ok) {
        // Rollback optimistic update on error
        setLikedTracks(likedTracks);
        localStorage.setItem("local_liked_tracks", JSON.stringify(likedTracks));
      } else {
        const data = await res.json();
        // Use verified server value
        setLikedTracks(data.liked_tracks || updatedLikes);
        localStorage.setItem("local_liked_tracks", JSON.stringify(data.liked_tracks || updatedLikes));
      }
    } catch (e) {
      console.error("Failed to post favorite toggle to server, saved locally:", e);
    }
  };

  // Playlist CRUD
  const createPlaylist = async (name: string): Promise<Playlist | null> => {
    const tempId = `playlist-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000).toString();
    const newPlaylist: Playlist = {
      playlist_id: tempId,
      name,
      user_id: user?.userId || "local-user",
      track_ids: [],
      created_at: now,
      updated_at: now
    };

    // Optimistic insert
    const updatedPlaylists = [...playlists, newPlaylist];
    setPlaylists(updatedPlaylists);
    localStorage.setItem("local_playlists", JSON.stringify(updatedPlaylists));

    if (isGuest || !idToken) {
      return newPlaylist;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/playlists`, {
        method: "POST",
        headers: getRequestHeaders(),
        body: JSON.stringify({ name, track_ids: [] }),
      });
      
      if (res.ok) {
        const serverPlaylist = await res.json();
        // Swap out the temp playlist with server playlist
        setPlaylists(prev => prev.map(p => p.playlist_id === tempId ? serverPlaylist : p));
        
        const finalPlaylists = playlists.map(p => p.playlist_id === tempId ? serverPlaylist : p);
        localStorage.setItem("local_playlists", JSON.stringify(finalPlaylists));
        return serverPlaylist;
      }
    } catch (e) {
      console.error("Failed to create playlist on server, saved locally:", e);
    }
    return newPlaylist;
  };

  const addTrackToPlaylist = async (playlistId: string, trackId: string) => {
    // Find playlist
    const targetPlaylist = playlists.find(p => p.playlist_id === playlistId);
    if (!targetPlaylist) return;

    if (targetPlaylist.track_ids.includes(trackId)) return; // already added

    const updatedTrackIds = [...targetPlaylist.track_ids, trackId];
    
    // Optimistically update UI
    const updatedPlaylists = playlists.map(p => {
      if (p.playlist_id === playlistId) {
        return { ...p, track_ids: updatedTrackIds, updated_at: Math.floor(Date.now() / 1000).toString() };
      }
      return p;
    });
    
    setPlaylists(updatedPlaylists);
    localStorage.setItem("local_playlists", JSON.stringify(updatedPlaylists));

    if (isGuest || playlistId.startsWith("playlist-")) {
      return; // Local only
    }

    try {
      const res = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
        method: "PUT",
        headers: getRequestHeaders(),
        body: JSON.stringify({ 
          name: targetPlaylist.name, 
          track_ids: updatedTrackIds 
        })
      });
      if (!res.ok) {
        // Rollback
        setPlaylists(playlists);
        localStorage.setItem("local_playlists", JSON.stringify(playlists));
      }
    } catch (e) {
      console.error("Failed to add track on server:", e);
      // Rollback
      setPlaylists(playlists);
    }
  };

  const removeTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    const targetPlaylist = playlists.find(p => p.playlist_id === playlistId);
    if (!targetPlaylist) return;

    const updatedTrackIds = targetPlaylist.track_ids.filter(id => id !== trackId);
    
    // Optimistically update UI
    const updatedPlaylists = playlists.map(p => {
      if (p.playlist_id === playlistId) {
        return { ...p, track_ids: updatedTrackIds, updated_at: Math.floor(Date.now() / 1000).toString() };
      }
      return p;
    });
    
    setPlaylists(updatedPlaylists);
    localStorage.setItem("local_playlists", JSON.stringify(updatedPlaylists));

    if (isGuest || playlistId.startsWith("playlist-")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
        method: "PUT",
        headers: getRequestHeaders(),
        body: JSON.stringify({ 
          name: targetPlaylist.name, 
          track_ids: updatedTrackIds 
        })
      });
      if (!res.ok) {
        setPlaylists(playlists);
        localStorage.setItem("local_playlists", JSON.stringify(playlists));
      }
    } catch (e) {
      console.error("Failed to remove track on server:", e);
      setPlaylists(playlists);
    }
  };

  const deletePlaylist = async (playlistId: string) => {
    const updatedPlaylists = playlists.filter(p => p.playlist_id !== playlistId);
    setPlaylists(updatedPlaylists);
    localStorage.setItem("local_playlists", JSON.stringify(updatedPlaylists));

    if (isGuest || playlistId.startsWith("playlist-")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
        method: "DELETE",
        headers: getRequestHeaders()
      });
      if (!res.ok) {
        setPlaylists(playlists);
        localStorage.setItem("local_playlists", JSON.stringify(playlists));
      }
    } catch (e) {
      console.error("Failed to delete playlist on server:", e);
      setPlaylists(playlists);
    }
  };

  const refreshData = async () => {
    await loadRecommendations();
    await fetchUserData();
  };

  return (
    <AudioContext.Provider value={{
      currentTrack,
      isPlaying,
      queue,
      currentIndex,
      volume,
      progress,
      duration,
      isLooping,
      isShuffled,
      
      playTrack,
      pauseTrack,
      resumeTrack,
      nextTrack: handleNextTrack,
      prevTrack: handlePrevTrack,
      seek,
      setVolume,
      toggleLoop,
      toggleShuffle,
      addToQueue,
      removeFromQueue,
      clearQueue,
      
      isGymMode,
      gymTimeLeft,
      toggleGymMode,
      
      recommendations,
      trendingAlbums,
      discoveredArtists,
      likedTracks,
      playlists,
      loadingRecs,
      refreshData,
      toggleFavorite,
      createPlaylist,
      addTrackToPlaylist,
      removeTrackFromPlaylist,
      deletePlaylist
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
};
