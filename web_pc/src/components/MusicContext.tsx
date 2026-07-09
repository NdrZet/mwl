import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';// Интерфейс Track, универсальный для обеих сред
export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  duration: number;
  path: string; // В Electron - абсолютный путь к файлу, в браузере - Object URL
  cover: string | null; // Обложка в формате base64
  lastPlayedAt?: number;
  isLiked?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: string[];
  createdAt: Date;
}

export interface RadioStation {
  id: string;
  name: string;
  url: string;
  image?: string | null;
}

const API_BASE = typeof window !== 'undefined' && window.electronAPI ? 'http://31.76.51.33:3001' : '';

// Типы для "моста" preload.js
declare global {
  interface Window {
    electronAPI?: {
      loadTracks: () => Promise<Track[]>;
      saveTracks: (tracks: Track[]) => void;
      getMetadata: (filePath: string) => Promise<{ title: string, artist: string, album: string, duration: number, cover: string | null }>;
      getCoverPath?: (filePath: string) => Promise<string | null>;
      getLyrics?: (filePath: string) => Promise<string | null>;
      translateLyrics?: (text: string, lang: string) => Promise<string | null>;
      getArtistInfo?: (name: string) => Promise<{ banner: string | null; thumb: string | null; biographyEN: string | null; biographyRU: string | null; genre: string | null } | null>;
      podcastsGetAll?: () => Promise<any[]>;
      podcastsAddByUrl?: (feedUrl: string) => Promise<{ ok: boolean; error?: string }>;
      podcastsRefreshAll?: () => Promise<{ ok: boolean; error?: string }>;
      podcastsRemove?: (podcastId: string) => Promise<{ ok: boolean; error?: string }>;
      selectFolders?: () => Promise<string[]>;
      scanFolder?: (folderPath: string) => Promise<string[]>;
      // radio
      radioGetAll?: () => Promise<RadioStation[]>;
      radioSaveAll?: (stations: RadioStation[]) => Promise<{ ok: boolean; error?: string }>;
      // stats & settings
      settingsGet?: () => Promise<any>;
      settingsSet?: (settings: any) => Promise<boolean>;
      statsGet?: () => Promise<any>;
      statsAddPlay?: (track: Track) => Promise<boolean>;
      statsTrackTime?: (seconds: number) => Promise<boolean>;
    }
  }
}

// Контекст
export interface MusicContextType {
  tracks: Track[];
  addTrack: (file: File) => Promise<void>;
  removeTrack: (id: string) => void;
  clearLibrary: () => void;
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
  // radio
  radioStations: RadioStation[];
  addRadioStation: (station: Omit<RadioStation, 'id'>) => void;
  removeRadioStation: (id: string) => void;
  playRadioStation: (stationId: string) => void;
  toggleLike: (trackId: string) => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
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
  const [volume, setVolumeState] = useState(0.5);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [radioStations, setRadioStations] = useState<RadioStation[]>([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const isRadioRef = useRef<boolean>(false);

  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const tracksRef = useRef<Track[]>([]);
  const lastCoverAttemptRef = useRef<Record<string, number>>({});

  // Генерируем действительно уникальные идентификаторы для треков,
  // чтобы при пакетной загрузке не возникало одинаковых id
  const generateTrackId = (): string => {
    try {
      if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
        return (crypto as any).randomUUID() as string;
      }
    } catch {}
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  // УМНАЯ ЗАГРУЗКА ИЗ FIRESTORE
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const loadData = async () => {
      try {
        // Load Global Tracks from Local SQLite
        const resTracks = await fetch(`${API_BASE}/api/tracks`);
        const allTracks: Track[] = await resTracks.json();

        // Load User Likes
        const resLikes = await fetch(`${API_BASE}/api/users/${uid}/likes`);
        const userLikesArray = await resLikes.json();
        const userLikes = new Set(userLikesArray);

        const loadedTracks = allTracks.map(t => ({
          ...t, 
          isLiked: userLikes.has(t.id),
          cover: t.cover && t.cover.startsWith('/') ? `${API_BASE}${t.cover}` : t.cover
        }));
        setTracks(loadedTracks);

        // Load Playlists
        const resPlaylists = await fetch(`${API_BASE}/api/users/${uid}/playlists`);
        const pData = await resPlaylists.json();
        const loadedPlaylists: Playlist[] = pData.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt || Date.now())
        }));
        setPlaylists(loadedPlaylists);

        // Load Radio and Local Tracks
        const isElectron = !!window.electronAPI;
        if (isElectron) {
          // Merge local tracks
          const localTracks = await window.electronAPI!.loadTracks?.() || [];
          if (localTracks.length > 0) {
            // Deduplicate: avoid adding local tracks that are already in Firestore by path or id
            const existingPaths = new Set(loadedTracks.map(t => t.path));
            const newLocalTracks = localTracks.filter((t: Track) => !existingPaths.has(t.path));
            loadedTracks.push(...newLocalTracks);
            // Re-sort tracks or just set them
            setTracks([...loadedTracks]);
          }

          const stations = await window.electronAPI!.radioGetAll?.();
          if (stations && Array.isArray(stations)) setRadioStations(stations);
        }
      } catch (error) {
        console.error('Failed to load library from Firestore:', error);
      }
    };
    loadData();
  }, []);

  // Держим актуальную ссылку на список треков для фоновых задач
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  // Фоновые задачи сканирования обложек (setInterval) были удалены для снижения потребления ОЗУ и CPU.

  // Фоновая задача для трекинга времени (статистика)
  useEffect(() => {
    const isElectron = !!window.electronAPI;
    if (!isElectron) return;

    const interval = setInterval(() => {
      if (!audioRef.current.paused) {
        window.electronAPI!.statsTrackTime?.(10).catch(() => {});
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Одноразовое обновление кеша обложек до более высокого разрешения
  useEffect(() => {
    const isElectron = !!window.electronAPI;
    if (!isElectron) return;
    if (tracks.length === 0) return;
    const cacheSize = localStorage.getItem('cover_cache_size');
    if (cacheSize === '1024') return;

    (async () => {
      try {
        const updates: Record<string, string> = {};
        await Promise.all(tracks.map(async (t) => {
          if (!t.path) return;
          try {
            const p = await window.electronAPI!.getCoverPath(t.path);
            if (p && p !== t.cover) updates[t.id] = p;
          } catch {}
        }));
        if (Object.keys(updates).length > 0) {
          setTracks(prev => prev.map(t => updates[t.id] ? { ...t, cover: updates[t.id] } : t));
        }
        localStorage.setItem('cover_cache_size', '1024');
      } catch {}
    })();
  }, [tracks.length]);

  // Автосохранение треков в Firestore отключено в useEffect!
  // Мы будем сохранять треки только при добавлении или изменении, чтобы не перезаписывать всю базу

  useEffect(() => {
    // Сохраняем плейлисты локально на всякий случай или просто игнорируем
    localStorage.setItem('musicApp_playlists', JSON.stringify(playlists));
  }, [playlists]);

  // Ref на актуальную функцию next — placeholder, обновляется sync-эффектом после каждого рендера.
  // Инициализируем no-op чтобы избежать TDZ: `next` объявлен ниже по телу компонента.
  const nextRef = useRef<() => void>(() => {});
  useEffect(() => { nextRef.current = next; });

  // Регистрируем слушатели аудио один раз — через ref всегда вызывается актуальный next
  useEffect(() => {
    const audio = audioRef.current;
    const handleTimeUpdate    = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded          = () => nextRef.current();

    audio.addEventListener('timeupdate',     handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended',          handleEnded);

    return () => {
      audio.removeEventListener('timeupdate',     handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended',          handleEnded);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      const newTrack: Track = {
        id: generateTrackId(),
        name: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        duration: metadata.duration,
        cover: metadata.cover,
        path: filePath,
      };
      setTracks(prev => [...prev, newTrack]);
    }
  };

  const removeTrack = async (id: string) => {
    const trackToRemove = tracks.find(t => t.id === id);
    if (trackToRemove && !window.electronAPI) {
      URL.revokeObjectURL(trackToRemove.path);
    }
    
    // Delete from Local SQLite via API (Optional, if we want to add DELETE /api/tracks/:id later)
    // For now we just remove locally since admin scan handles population

    setTracks(prev => prev.filter(t => t.id !== id));
    setPlaylists(prev => prev.map(p => ({ ...p, tracks: p.tracks.filter(trackId => trackId !== id) })));
    if (currentTrack?.id === id) {
      pause();
      setCurrentTrack(null);
    }
  };

  const toggleLike = async (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    const newIsLiked = !track.isLiked;

    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await fetch(`${API_BASE}/api/users/${uid}/likes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackId, action: newIsLiked ? 'add' : 'remove' })
        });
      } catch (e) {
        console.error('Failed to update like status', e);
      }
    }

    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, isLiked: newIsLiked } : t));
    setCurrentTrack(prev => (prev?.id === trackId ? { ...prev, isLiked: newIsLiked } : prev));
  };


  const clearLibrary = async () => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        // Clear local library, no API delete for now
      } catch (e) {
        console.error('Failed to clear library', e);
      }
    }

    setTracks([]);
    setPlaylists([]);
    pause();
    setCurrentTrack(null);
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
    isRadioRef.current = false;
    setCurrentTrack(trackToPlay);
    
    // Stats tracking
    if (isElectron) {
      window.electronAPI?.statsAddPlay?.(trackToPlay).catch(() => {});
    }

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
      const p = trackToPlay.path || '';
      if (p.startsWith('blob:') || p.startsWith('data:') || p.startsWith('http')) {
        audio.src = p;
      } else {
        // Запрашиваем трек через наш потоковый сервер Node.js
        audio.src = `${API_BASE}/stream?path=${encodeURIComponent(p)}`;
      }
    }
    audio.currentTime = 0;

    try {
      await audio.play();
      setIsPlaying(true);
      // помечаем альбом как недавно проигранный
      setTracks(prev => prev.map(t => t.id === trackToPlay.id ? { ...t, lastPlayedAt: Date.now() } : t));
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

  const savePlaylistToDb = async (playlist: Playlist) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await fetch(`${API_BASE}/api/users/${uid}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playlist)
      });
    } catch (e) {
      console.error('Failed to save playlist', e);
    }
  };

  const createPlaylist = (name: string) => {
    const playlist: Playlist = { id: Date.now().toString(), name, tracks: [], createdAt: new Date() };
    setPlaylists(prev => [...prev, playlist]);
    savePlaylistToDb(playlist);
  };

  const deletePlaylist = async (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await fetch(`${API_BASE}/api/users/${uid}/playlists/${id}`, { method: 'DELETE' });
      } catch (e) {}
    }
  };

  const addToPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => {
      const next = prev.map(p => p.id === playlistId && !p.tracks.includes(trackId) ? { ...p, tracks: [...p.tracks, trackId] } : p);
      const updated = next.find(p => p.id === playlistId);
      if (updated) savePlaylistToDb(updated);
      return next;
    });
  };

  const removeFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => {
      const next = prev.map(p => p.id === playlistId ? { ...p, tracks: p.tracks.filter(id => id !== trackId) } : p);
      const updated = next.find(p => p.id === playlistId);
      if (updated) savePlaylistToDb(updated);
      return next;
    });
  };

  const contextValue: MusicContextType = {
    tracks, addTrack, removeTrack, clearLibrary, playlists, createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist,
    currentTrack, isPlaying, currentTime, duration, volume, play, pause, togglePlay, next, previous, seek, setVolume,
    queue, setQueue, currentQueueIndex,
    radioStations,
    toggleLike,
    globalSearchQuery,
    setGlobalSearchQuery,
    addRadioStation: (station) => {
      const withId: RadioStation = { id: generateTrackId(), name: station.name, url: station.url, image: station.image || null };
      setRadioStations(prev => {
        const next = [...prev, withId];
        window.electronAPI?.radioSaveAll?.(next);
        return next;
      });
    },
    removeRadioStation: (id) => {
      setRadioStations(prev => {
        const next = prev.filter(s => s.id !== id);
        window.electronAPI?.radioSaveAll?.(next);
        return next;
      });
    },
    playRadioStation: (stationId) => {
      const st = radioStations.find(s => s.id === stationId);
      if (!st) return;
      const audio = audioRef.current;
      isRadioRef.current = true;
      setCurrentTrack({
        id: stationId,
        name: st.name,
        artist: 'Web Radio',
        album: 'Stream',
        duration: 0,
        path: st.url,
        cover: st.image || null,
      });
      audio.src = st.url;
      audio.currentTime = 0;
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  return <MusicContext.Provider value={contextValue}>{children}</MusicContext.Provider>;
};