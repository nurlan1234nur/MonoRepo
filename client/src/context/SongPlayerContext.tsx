import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { WeeklySong } from '../types';

interface SongPlayerContextValue {
  currentSong: WeeklySong | null;
  queue: WeeklySong[];
  setQueue: (songs: WeeklySong[]) => void;
  playSong: (song: WeeklySong, songs?: WeeklySong[]) => void;
  stopSong: () => void;
  removeSong: (songId: string) => void;
  playNext: () => void;
  playPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}

const SongPlayerContext = createContext<SongPlayerContextValue | null>(null);

function uniqueSongs(songs: WeeklySong[]): WeeklySong[] {
  const seen = new Set<string>();
  return songs.filter((song) => {
    if (seen.has(song._id)) return false;
    seen.add(song._id);
    return true;
  });
}

export function SongPlayerProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<WeeklySong | null>(null);
  const [queue, setQueueState] = useState<WeeklySong[]>([]);

  const currentIndex = currentSong ? queue.findIndex((song) => song._id === currentSong._id) : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < queue.length - 1;

  const setQueue = useCallback((songs: WeeklySong[]) => {
    setQueueState(uniqueSongs(songs));
  }, []);

  const playSong = useCallback((song: WeeklySong, songs?: WeeklySong[]) => {
    setQueueState((existing) => uniqueSongs(songs?.length ? songs : [song, ...existing]));
    setCurrentSong(song);
  }, []);

  const stopSong = useCallback(() => {
    setCurrentSong(null);
  }, []);

  const removeSong = useCallback((songId: string) => {
    setQueueState((existing) => existing.filter((song) => song._id !== songId));
    setCurrentSong((existing) => (existing?._id === songId ? null : existing));
  }, []);

  const playPrevious = useCallback(() => {
    setCurrentSong((song) => {
      if (!song) return song;
      const index = queue.findIndex((item) => item._id === song._id);
      return index > 0 ? queue[index - 1] : song;
    });
  }, [queue]);

  const playNext = useCallback(() => {
    setCurrentSong((song) => {
      if (!song) return song;
      const index = queue.findIndex((item) => item._id === song._id);
      return index >= 0 && index < queue.length - 1 ? queue[index + 1] : song;
    });
  }, [queue]);

  const value = useMemo(
    () => ({
      currentSong,
      queue,
      setQueue,
      playSong,
      stopSong,
      removeSong,
      playNext,
      playPrevious,
      hasNext,
      hasPrevious,
    }),
    [currentSong, hasNext, hasPrevious, playNext, playPrevious, playSong, queue, removeSong, setQueue, stopSong],
  );

  return <SongPlayerContext.Provider value={value}>{children}</SongPlayerContext.Provider>;
}

export function useSongPlayer(): SongPlayerContextValue {
  const value = useContext(SongPlayerContext);
  if (!value) throw new Error('useSongPlayer must be used inside SongPlayerProvider');
  return value;
}
