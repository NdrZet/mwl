import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

// Интерфейс Track, универсальный для обеих сред
export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  duration: number;
  path: string; // В Electron - абсолютный путь к файлу, в браузере - Object URL
  cover: string | null; // Обложка в формате base64
}

export interface Playlist {
  id: string;
  name: string;
  tracks: string[];
  createdAt: Date;
}

// Типы для "моста" preload.js
declare global {
  interface Window {
    electronAPI?: {
      loadTracks: () => Promise<Track[]>;
      saveTracks: (tracks: Track[]) => void;
      getMetadata: (filePath: string) => Promise<{ title: string, artist: string, album: string, duration: number, cover: string | null }>;
      getCoverPath: (filePath: string) => Promise<string | null>;
    }
  }
}

// Контекст
export interface MusicContextType {
  tracks: Track[];
  addTrack: (file: File) => Promise<void>;
  removeTrack: (id: string) => void;
  playlists: Playlist[];
  createPlaylist: (name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, trackId: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  play: (track?: Track) => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  queue: Track[];
  setQueue: (tracks: Track[]) => void;
  currentQueueIndex: number;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const useMusicContext = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusicContext must be used within a MusicProvider');
  return context;
};


export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const tracksRef = useRef<Track[]>([]);
  const lastCoverAttemptRef = useRef<Record<string, number>>({});

  // Генерируем действительно уникальные идентификаторы для треков,
  // чтобы при пакетной загрузке не возникало одинаковых id
  const generateTrackId = (): string => {
    try {
      // @ts-ignore
      if (typeof crypto !== 'undefined' && crypto?.randomUUID) {
        // @ts-ignore
        return crypto.randomUUID();
      }
    } catch {}
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  // УМНАЯ ЗАГРУЗКА/СОХРАНЕНИЕ
  useEffect(() => {
    const isElectron = !!window.electronAPI;

    if (isElectron) {
      const loadInitialTracks = async () => {
        const loadedTracks = await window.electronAPI!.loadTracks();
        // Нормализуем id, чтобы избежать дубликатов
        const seen = new Set<string>();
        const normalized = loadedTracks.map((t) => {
          let id = t.id;
          if (!id || seen.has(id)) id = generateTrackId();
          seen.add(id);
          return { ...t, id } as Track;
        });

        // Миграция обложек: если cover пустой или это старый file://, переизвлекаем cover из метаданных
        const withCovers = await Promise.all(
          normalized.map(async (t) => {
            if (!t.cover && t.path) {
              try {
                const p = await window.electronAPI!.getCoverPath(t.path);
                if (p) return { ...t, cover: p } as Track;
              } catch {}
            }
            return t;
          })
        );

        setTracks(withCovers);
      };
      loadInitialTracks();
    } else {
      const savedTracks = localStorage.getItem('musicApp_tracks');
      if (savedTracks) {
        try { setTracks(JSON.parse(savedTracks)); }
        catch (error) { console.error('Error loading tracks from localStorage:', error); }
      }
    }

    const savedPlaylists = localStorage.getItem('musicApp_playlists');
    if (savedPlaylists) {
      try {
        setPlaylists(JSON.parse(savedPlaylists).map((p: any) => ({ ...p, createdAt: new Date(p.createdAt) })));
      } catch (error) { console.error('Error loading playlists from localStorage:', error); }
    }
  }, []);

  // Держим актуальную ссылку на список треков для фоновых задач
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  // Фоновая задача раз в 5 секунд: добираем обложки для треков без cover или со старым file:// cover
  useEffect(() => {
    const isElectron = !!window.electronAPI;
    if (!isElectron) return;

    const isRealFsPath = (p: string | undefined): boolean => {
      if (!p) return false;
      const l = p.toLowerCase();
      return !l.startsWith('blob:') && !l.startsWith('data:') && !l.startsWith('http');
    };

    const interval = setInterval(async () => {
      const snapshot = tracksRef.current;
      if (!snapshot || snapshot.length === 0) return;

      const now = Date.now();
      const candidates: Track[] = [];
      for (const t of snapshot) {
        const needs = !t.cover; // не трогаем уже установленный cover (file:// или data:)
        const allowed = isRealFsPath(t.path);
        const last = lastCoverAttemptRef.current[t.id] ?? 0;
        if (needs && allowed && (now - last > 60000)) {
          candidates.push(t);
          if (candidates.length >= 2) break; // ограничиваем нагрузку
        }
      }

      if (candidates.length === 0) return;

      const updates: Record<string, string> = {};
      await Promise.all(candidates.map(async (t) => {
        try {
          lastCoverAttemptRef.current[t.id] = now;
          const p = await window.electronAPI!.getCoverPath(t.path);
          if (p) updates[t.id] = p;
        } catch {}
      }));

      if (Object.keys(updates).length > 0) {
        setTracks(prev => prev.map(t => updates[t.id] ? { ...t, cover: updates[t.id] } : t));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const isElectron = !!window.electronAPI;
    if (tracks.length > 0 || localStorage.getItem('musicApp_tracks_saved_once')) {
      if (isElectron) {
        // В Electron сохраняем только треки с реальными путями (исключаем blob/data/http)
        const tracksToSave = tracks.filter(t => {
          const p = (t.path || '').toLowerCase();
          return p && !p.startsWith('blob:') && !p.startsWith('data:') && !p.startsWith('http');
        });
        window.electronAPI!.saveTracks(tracksToSave);
      } else {
        localStorage.setItem('musicApp_tracks', JSON.stringify(tracks));
      }
      localStorage.setItem('musicApp_tracks_saved_once', 'true');
    }
  }, [tracks]);

  useEffect(() => {
    localStorage.setItem('musicApp_playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    const audio = audioRef.current;
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => next();

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [queue, currentQueueIndex]);

  // убрали расширенное логирование

  // УМНАЯ ФУНКЦИЯ ДОБАВЛЕНИЯ ТРЕКА
  const addTrack = async (file: File) => {
    const isElectron = !!window.electronAPI;

    if (!isElectron) {
      const url = URL.createObjectURL(file);
      const tempAudio = new Audio(url);
      tempAudio.onloadedmetadata = () => {
        const track: Track = {
          id: generateTrackId(),
          name: file.name.replace(/\.[^/.]+$/, ""),
          artist: 'Unknown Artist',
          album: 'Unknown Album',
          duration: tempAudio.duration,
          path: url, // В браузере path будет временным Object URL
          cover: null,
        };
        setTracks(prev => [...prev, track]);
      };
    } else {
      // В Electron предпочтительно использовать абсолютный путь из File.path.
      // Но если File пришёл из <input type="file">, path может отсутствовать.
      // В таком случае делаем безопасный фоллбэк как в браузере (blob URL), чтобы трек всё равно добавился.
      const filePath = (file as any).path as string | undefined;
      const isBadPath = typeof filePath === 'string' && /^(blob:|data:)/i.test(filePath);

      if (!filePath || isBadPath) {
        // Фоллбэк: добавляем через Object URL, заполнив базовые поля
        const url = URL.createObjectURL(file);
        const tempAudio = new Audio(url);
        tempAudio.onloadedmetadata = () => {
          const track: Track = {
            id: generateTrackId(),
            name: file.name.replace(/\.[^/.]+$/, ""),
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            duration: tempAudio.duration,
            path: url,
            cover: null,
          };
          setTracks(prev => [...prev, track]);
        };
        return;
      }

      if (tracks.some(t => t.path === filePath)) return;

      const metadata = await window.electronAPI!.getMetadata(filePath);
      // Путь к миниатюре-кешу (file://) — создадим при необходимости
      const coverPath = await window.electronAPI!.getCoverPath(filePath);
      const newTrack: Track = {
        id: generateTrackId(),
        name: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        duration: metadata.duration,
        cover: coverPath || metadata.cover,
        path: filePath,
      };
      setTracks(prev => [...prev, newTrack]);
    }
  };

  const removeTrack = (id: string) => {
    const trackToRemove = tracks.find(t => t.id === id);
    if (trackToRemove && !window.electronAPI) {
      URL.revokeObjectURL(trackToRemove.path);
    }
    setTracks(prev => prev.filter(t => t.id !== id));
    setPlaylists(prev => prev.map(p => ({ ...p, tracks: p.tracks.filter(trackId => trackId !== id) })));
    if (currentTrack?.id === id) {
      pause();
      setCurrentTrack(null);
    }
  };

  // --- ИСПРАВЛЕННАЯ УНИВЕРСАЛЬНАЯ ФУНКЦИЯ PLAY ---
  const play = async (track?: Track) => {
    const isElectron = !!window.electronAPI;
    const audio = audioRef.current;
    const trackToPlay = track || currentTrack;
    if (!trackToPlay) return;

    if (trackToPlay.id === currentTrack?.id && !audio.paused) {
      return; // Уже играет этот трек
    }

    // Если это тот же трек, но на паузе, просто запускаем
    if (trackToPlay.id === currentTrack?.id && audio.paused) {
      try { await audio.play(); setIsPlaying(true); }
      catch (e) { console.error("Play interrupted", e); }
      return;
    }

    // Это новый трек, устанавливаем src и играем
    setCurrentTrack(trackToPlay);
    // Формируем корректный src для локальных файлов под Windows и фоллбэки для blob/data
    // корректная формула: для blob/data/http используем как есть; для файловых путей строим file:///
    if (isElectron) {
      const p = trackToPlay.path || '';
      const lower = p.toLowerCase();
      if (lower.startsWith('blob:') || lower.startsWith('data:') || lower.startsWith('http')) {
        audio.src = p;
      } else if (lower.startsWith('file://')) {
        audio.src = p;
      } else {
        const normalized = p.replace(/\\/g, '/');
        audio.src = `file:///${normalized}`;
      }
    } else {
      audio.src = trackToPlay.path;
    }
    audio.currentTime = 0;

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (e) {
      console.error("Play failed", e);
      setIsPlaying(false);
    }
  };

  const pause = () => {
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const togglePlay = () => { if (isPlaying) pause(); else if (currentTrack) play(); };

  const next = () => {
    if (queue.length === 0) return;
    const nextIndex = (currentQueueIndex + 1) % queue.length;
    setCurrentQueueIndex(nextIndex);
    play(queue[nextIndex]);
  };

  const previous = () => {
    if (queue.length === 0) return;
    const prevIndex = (currentQueueIndex - 1 + queue.length) % queue.length;
    setCurrentQueueIndex(prevIndex);
    play(queue[prevIndex]);
  };

  const seek = (time: number) => { audioRef.current.currentTime = time; };
  const setVolume = (newVolume: number) => { audioRef.current.volume = newVolume; setVolumeState(newVolume); };

  const createPlaylist = (name: string) => {
    const playlist: Playlist = { id: Date.now().toString(), name, tracks: [], createdAt: new Date() };
    setPlaylists(prev => [...prev, playlist]);
  };

  const deletePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
  };

  const addToPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(p => p.id === playlistId && !p.tracks.includes(trackId) ? { ...p, tracks: [...p.tracks, trackId] } : p));
  };

  const removeFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, tracks: p.tracks.filter(id => id !== trackId) } : p));
  };

  const contextValue: MusicContextType = {
    tracks, addTrack, removeTrack, playlists, createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist,
    currentTrack, isPlaying, currentTime, duration, volume, play, pause, togglePlay, next, previous, seek, setVolume,
    queue, setQueue, currentQueueIndex
  };

  return <MusicContext.Provider value={contextValue}>{children}</MusicContext.Provider>;
};