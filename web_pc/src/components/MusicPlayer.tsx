import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, Volume1, VolumeX, Music, ChevronDown, Maximize2, Globe, Loader2, Heart
} from 'lucide-react';
import { useMusicContext } from './MusicContext';
import { parseLRC, type LyricLine } from '../utils/lrcParser';

const formatTime = (s: number): string => {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

// ── Animated EQ bars ─────────────────────────────────────────
const EqBars: React.FC<{ active: boolean }> = ({ active }) => (
  <div className="flex items-end gap-[2px] h-3.5" aria-hidden="true">
    {([1, 2, 3] as const).map(i => (
      <span
        key={i}
        className="w-[3px] rounded-full bg-primary block"
        style={{
          height: active ? '100%' : '35%',
          animation: active
            ? `player-eq-${i} ${0.45 + i * 0.14}s ease-in-out infinite alternate`
            : 'none',
          transition: 'height 0.18s ease',
        }}
      />
    ))}
  </div>
);

// ── Draggable progress / volume bar ──────────────────────────
const ProgressBar: React.FC<{
  value: number;          // 0..1
  onChange: (v: number) => void;
  className?: string;
}> = ({ value, onChange, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  // Храним onChange в ref, чтобы не переподписывать слушателей при каждом рендере
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  const [hov, setHov] = useState(false);
  const [drag, setDrag] = useState(false);

  const getVal = (clientX: number) => {
    if (!ref.current) return 0;
    const { left, width } = ref.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - left) / width));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setDrag(true);
    onChangeRef.current(getVal(e.clientX));
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: MouseEvent) => onChangeRef.current(getVal(e.clientX));
    const up = () => setDrag(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [drag]); // onChange вынесен в ref — переподписка не нужна

  const active = hov || drag;

  return (
    <div
      ref={ref}
      className={`relative flex items-center cursor-pointer select-none ${className}`}
      style={{ height: 14 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onMouseDown={onMouseDown}
    >
      {/* Track */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.13)',
          height: active ? 8 : 5,
          transition: 'height 0.15s ease',
        }}
      >
        <div
          className="h-full bg-primary rounded-full"
          style={{
            width: `${value * 100}%`,
            transition: drag ? 'none' : 'width 0.08s linear',
          }}
        />
      </div>
      {/* Thumb */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md pointer-events-none"
        style={{
          left: `calc(${value * 100}% - 6px)`,
          opacity: active ? 1 : 0,
          transition: 'opacity 0.12s ease',
        }}
      />
    </div>
  );
};

// ── Window size hook ─────────────────────────────────────────
const useWindowSize = () => {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
};

// ── Main component ───────────────────────────────────────────
export const MusicPlayer: React.FC = () => {
  const {
    currentTrack, isPlaying, currentTime, duration, volume,
    togglePlay, next, previous, seek, setVolume, toggleLike
  } = useMusicContext();

  const { w, h } = useWindowSize();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsVisible, setFsVisible]       = useState(false);
  const [infoVisible, setInfoVisible]   = useState(true);
  const prevTrackIdRef = useRef<string | null>(null);

  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [translatedLyrics, setTranslatedLyrics] = useState<string[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  
  const [isManualScrolling, setIsManualScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isFsIdle, setIsFsIdle] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    setIsFsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsFsIdle(true);
    }, 3000);
  }, []);

  useEffect(() => {
    if (fsVisible) {
      resetIdleTimer();
    } else {
      setIsFsIdle(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }
  }, [fsVisible, resetIdleTimer]);

  const handleUserScroll = () => {
    setIsManualScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsManualScrolling(false);
    }, 2000);
  };

  useEffect(() => {
    let isCancelled = false;
    
    if (!currentTrack) {
      setLyrics([]);
      setTranslatedLyrics([]);
      setShowTranslation(false);
      return;
    }

    // Очищаем старые данные сразу при смене трека
    setLyrics([]);
    setTranslatedLyrics([]);
    setShowTranslation(false);

    // Fetch lyrics asynchronously
    const API_BASE = typeof window !== 'undefined' && (window as any).electronAPI ? 'http://31.76.51.33:3001' : '';
    
    const fetchLyrics = async () => {
      if ((window as any).electronAPI?.getLyrics) {
        return (window as any).electronAPI.getLyrics(currentTrack.path);
      } else {
        const res = await fetch(`${API_BASE}/api/lyrics?path=${encodeURIComponent(currentTrack.path)}`);
        return res.ok ? res.json() : null;
      }
    };

    fetchLyrics().then((text) => {
      if (isCancelled) return;
      if (text && typeof text === 'string') {
        setLyrics(parseLRC(text));
      } else {
        setLyrics([]); 
      }
      setIsManualScrolling(false); // Reset manual scrolling on new track
    }).catch(() => { 
      if (isCancelled) return;
      setLyrics([]); 
    });

    return () => {
      isCancelled = true;
    };
  }, [currentTrack]);

  const toggleTranslation = async () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }
    if (translatedLyrics.length > 0) {
      setShowTranslation(true);
      return;
    }
    if (lyrics.length === 0) return;
    
    setIsTranslating(true);
    try {
      const textToTranslate = lyrics.map(l => l.text).join('\n');
      let translated = null;

      if (window.electronAPI?.translateLyrics) {
        translated = await window.electronAPI.translateLyrics(textToTranslate, 'ru');
      } else {
        const API_BASE = typeof window !== 'undefined' && (window as any).electronAPI ? 'http://31.76.51.33:3001' : '';
        const res = await fetch(`${API_BASE}/api/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToTranslate, targetLang: 'ru' })
        });
        if (res.ok) {
          translated = await res.json();
        }
      }

      if (translated && typeof translated === 'string') {
        setTranslatedLyrics(translated.split('\n'));
        setShowTranslation(true);
      }
    } catch (e) {
      console.error('Translation failed', e);
    } finally {
      setIsTranslating(false);
    }
  };

  // Auto-scroll lyrics
  useEffect(() => {
    if (lyrics.length === 0 || !fsVisible || !lyricsContainerRef.current || isManualScrolling) return;
    
    let activeIdx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== -1) {
      const container = lyricsContainerRef.current;
      const activeElement = container.querySelector(`[data-index="${activeIdx}"]`) as HTMLElement;
      if (activeElement) {
        const offset = activeElement.offsetTop - container.clientHeight / 2 + activeElement.clientHeight / 2;
        container.scrollTo({ top: offset, behavior: 'smooth' });
      }
    }
  }, [currentTime, lyrics, fsVisible, isManualScrolling]);



  // ── Responsive breakpoints ───────────────────────────────
  const hideVolume      = w < 700;          // скрыть громкость
  const hideTimestamps  = w < 540;          // скрыть метки времени
  const compactCover    = w < 480;          // уменьшить обложку
  const centerMaxW      = w < 500 ? 'clamp(160px, 45vw, 240px)' : 'clamp(260px, 35vw, 420px)';
  const barGrid         = hideVolume ? '1fr auto' : '1fr auto 1fr';

  // Fullscreen — адаптация по высоте окна
  const fsGap           = h < 580 ? 'gap-3' : h < 720 ? 'gap-4' : 'gap-7';
  const fsPy            = h < 580 ? 'py-3'  : h < 720 ? 'py-5'  : 'py-10';
  const showFsVolume    = h >= 500;

  // Bug fix: явный boolean, чтобы тип не был null|boolean до early return
  const isLive    = !!(currentTrack && (currentTrack.album === 'Stream' || currentTrack.duration === 0));
  // Bug fix: зажимаем в [0,1] — currentTime может кратко превысить duration
  const progress  = duration > 0 && isFinite(currentTime)
    ? Math.min(1, Math.max(0, currentTime / duration))
    : 0;
  const VolumeIcon = volume <= 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // ── Track-change animation ───────────────────────────────
  useEffect(() => {
    if (!currentTrack?.id) return;
    if (currentTrack.id === prevTrackIdRef.current) return;
    prevTrackIdRef.current = currentTrack.id;
    setInfoVisible(false);
    const t = setTimeout(() => setInfoVisible(true), 100);
    return () => clearTimeout(t);
  }, [currentTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeFullscreen = useCallback(() => {
    setFsVisible(false);
    setTimeout(() => setIsFullscreen(false), 260);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    // Bug fix: переменная h переименована в handleKey — конфликт с h из useWindowSize()
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeFullscreen(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen, closeFullscreen]);

  const openFullscreen = () => {
    setIsFullscreen(true);
    requestAnimationFrame(() => setTimeout(() => setFsVisible(true), 16));
  };

  const handleVolumeWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    // Bug fix: убран (volume || 1) — при volume=0 он давал 1, прокрутка вверх = max
    setVolume(Math.max(0, Math.min(1, volume + (e.deltaY > 0 ? -0.05 : 0.05))));
  };

  // ── Empty state ──────────────────────────────────────────
  if (!currentTrack) {
    return (
      <div className="player-bar player-bar--empty">
        <Music className="h-4 w-4 mr-2 text-sidebar-accent-foreground/40" />
        <span className="text-sm text-sidebar-accent-foreground/40">Выберите трек для воспроизведения</span>
      </div>
    );
  }

  return (
    <>
      {/* ═══════════════ Compact bar ═══════════════ */}
      <div className="player-bar">

        {/* Ambient glow from cover art */}
        {currentTrack.cover && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <img
              src={currentTrack.cover}
              alt=""
              className="w-full h-full object-cover scale-150 blur-3xl"
              style={{ opacity: 0.09 }}
            />
          </div>
        )}

        <div
          className="relative z-10 h-full grid items-center px-4 gap-2"
          style={{ gridTemplateColumns: barGrid }}
        >

          {/* ── Left: cover + info ─────────────────── */}
          <div className="flex items-center gap-3 min-w-0">

            {/* Album art */}
            <div
              className={`relative ${compactCover ? 'w-9 h-9' : 'w-12 h-12'} rounded-lg overflow-hidden flex-shrink-0 cursor-pointer group shadow-md`}
              style={{ transition: 'width 0.2s ease, height 0.2s ease' }}
              onClick={openFullscreen}
              title="Открыть полноэкранный плеер"
            >
              {currentTrack.cover
                ? <img
                    src={currentTrack.cover}
                    alt={currentTrack.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                : <div className="w-full h-full bg-sidebar-accent flex items-center justify-center">
                    <Music className="h-5 w-5 text-sidebar-accent-foreground" />
                  </div>
              }
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="h-3 w-3 text-white" />
              </div>
            </div>

            {/* Track name + artist */}
            <div
              className="min-w-0 flex-1"
              style={{
                opacity:    infoVisible ? 1 : 0,
                transform:  infoVisible ? 'translateY(0)' : 'translateY(5px)',
                transition: 'opacity 0.12s ease, transform 0.12s ease',
              }}
            >
              <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                {currentTrack.name}
              </p>
              <p className="text-xs text-sidebar-accent-foreground truncate mt-0.5">
                {currentTrack.artist}
              </p>
            </div>

            {/* Like button */}
            {!isLive && (
              <button
                className={`flex-shrink-0 transition-colors ${currentTrack.isLiked ? 'text-[var(--vl-theme-accent)]' : 'text-sidebar-accent-foreground hover:text-white'}`}
                onClick={() => toggleLike(currentTrack.id)}
                aria-label="Like"
              >
                <Heart className="h-4 w-4" fill={currentTrack.isLiked ? 'currentColor' : 'none'} />
              </button>
            )}

            {/* EQ indicator */}
            {isPlaying && !isLive && (
              <div className="flex-shrink-0">
                <EqBars active />
              </div>
            )}
          </div>

          {/* ── Center: controls + progress ────────── */}
          <div
            className="flex flex-col items-center gap-1.5"
            style={{ width: centerMaxW }}
          >
            <div className="flex items-center gap-3">
              <button className="player-btn" onClick={previous} aria-label="Назад">
                <SkipBack className="h-[18px] w-[18px]" />
              </button>
              <button
                className="player-play-btn"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Пауза' : 'Играть'}
              >
                {isPlaying
                  ? <Pause className="h-[18px] w-[18px]" />
                  : <Play  className="h-[18px] w-[18px] translate-x-px" />
                }
              </button>
              <button className="player-btn" onClick={next} aria-label="Вперёд">
                <SkipForward className="h-[18px] w-[18px]" />
              </button>
            </div>

            {isLive
              ? <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </div>
              : <div className="flex items-center gap-2 w-full">
                  {!hideTimestamps && (
                    <span className="text-[10px] tabular-nums text-sidebar-accent-foreground w-8 text-right">
                      {formatTime(currentTime)}
                    </span>
                  )}
                  <ProgressBar
                    value={progress}
                    onChange={v => seek(v * duration)}
                    className="flex-1"
                  />
                  {!hideTimestamps && (
                    <span className="text-[10px] tabular-nums text-sidebar-accent-foreground w-8">
                      {formatTime(duration)}
                    </span>
                  )}
                </div>
            }
          </div>

          {/* ── Right: volume ──────────────────────── */}
          {!hideVolume && <div
            className="flex items-center justify-end gap-2"
            onWheel={handleVolumeWheel}
          >
            <button
              className="player-btn"
              onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
              aria-label="Mute"
            >
              <VolumeIcon className="h-4 w-4" />
            </button>
            <ProgressBar
              value={typeof volume === 'number' ? volume : 1}
              onChange={setVolume}
              className="w-24"
            />
          </div>}
        </div>
      </div>

      {/* ═══════════════ Fullscreen overlay ═══════════════ */}
      {isFullscreen && (
        <div 
          className={`player-fs ${fsVisible ? 'player-fs--in' : ''} ${isFsIdle ? 'cursor-none' : ''}`}
          onMouseMove={resetIdleTimer}
          onClick={resetIdleTimer}
          onKeyDown={resetIdleTimer}
        >

          {/* Blurred background */}
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            {currentTrack.cover
              ? <img
                  src={currentTrack.cover}
                  alt=""
                  className="w-full h-full object-cover scale-150"
                  style={{ filter: 'blur(60px) brightness(0.45) saturate(1.4)' }}
                />
              : <div className="w-full h-full" style={{ background: '#0d0d0d' }} />
            }
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.18)' }} />
          </div>

          {/* Close button */}
          <button
            className="player-fs-close"
            onClick={closeFullscreen}
            aria-label="Закрыть"
            style={{
              opacity: isFsIdle ? 0 : 1,
              pointerEvents: isFsIdle ? 'none' : 'auto',
              transition: 'opacity 0.4s ease'
            }}
          >
            <ChevronDown className="h-5 w-5" />
          </button>

          {/* Main content column */}
          <div className={`relative z-10 w-full h-full flex ${lyrics.length > 0 ? 'flex-col lg:flex-row gap-10 lg:gap-24' : 'flex-col'} items-center justify-center px-8 ${fsPy}`}>

            {/* ── Left Side: Player Controls ── */}
            <div className={`flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${lyrics.length > 0 ? 'flex-1 w-full max-w-2xl' : ''}`}>
              {/* ── Album Cover ──────────────────────── */}
              <div 
                className="relative rounded-2xl overflow-hidden shadow-2xl mb-6 flex-shrink-0"
                style={{
                  width: isFsIdle ? 'min(500px, 65vh)' : (lyrics.length > 0 ? 'min(320px, 40vh)' : 'min(400px, 55vh)'),
                  height: isFsIdle ? 'min(500px, 65vh)' : (lyrics.length > 0 ? 'min(320px, 40vh)' : 'min(400px, 55vh)'),
                  boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 40px rgba(50,184,198,0.15)',
                  opacity: fsVisible ? 1 : 0,
                  transform: fsVisible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.96)',
                  transition: 'opacity 0.4s ease, transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
              >
                {currentTrack.cover
                  ? <img
                      src={currentTrack.cover}
                      alt={currentTrack.name}
                      className="w-full h-full object-cover"
                    />
                  : <div
                      className="w-full h-full flex items-center justify-center bg-neutral-900"
                    >
                      <Music className="text-neutral-700 w-1/3 h-1/3" />
                    </div>
                }
              </div>

              {/* ── UI Elements Container (collapses when AFK) ── */}
              <div 
                className="w-full flex flex-col items-center overflow-hidden transition-all duration-700 ease-in-out"
                style={{
                  maxHeight: isFsIdle ? '0px' : '400px',
                  opacity: (fsVisible && !isFsIdle) ? 1 : 0,
                  pointerEvents: isFsIdle ? 'none' : 'auto'
                }}
              >
                {/* ── Track info ────────────────────────── */}
                <div
                  className="text-center"
                  style={{
                    transform:  (fsVisible && !isFsIdle) ? 'translateY(0)' : 'translateY(8px)',
                    transition: 'transform 0.4s ease',
                  }}
                >
                  <p className="text-2xl font-bold text-white leading-tight">
                    {currentTrack.name}
                  </p>
                  <p className="text-base mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {currentTrack.artist}
                  </p>
                  {currentTrack.album && currentTrack.album !== 'Stream' && (
                    <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {currentTrack.album}
                    </p>
                  )}
                </div>

                {/* ── Progress ──────────────────────────── */}
                {isLive
                  ? <div className="flex items-center gap-2 font-semibold text-red-400 mt-6">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      LIVE
                    </div>
                  : <div className="w-full max-w-[85%] sm:max-w-md mt-6 mx-auto">
                      <ProgressBar
                        value={progress}
                        onChange={v => seek(v * duration)}
                        className="w-full"
                      />
                      <div className="flex justify-between mt-2">
                        <span className="text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {formatTime(currentTime)}
                        </span>
                        <span className="text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {formatTime(duration)}
                        </span>
                      </div>
                    </div>
                }

                {/* ── Playback controls ─────────────────── */}
                <div
                  className="relative flex items-center justify-center w-full max-w-[85%] sm:max-w-md mt-6 mx-auto"
                  style={{
                    transform:  (fsVisible && !isFsIdle) ? 'translateY(0)' : 'translateY(8px)',
                    transition: 'transform 0.4s ease',
                  }}
                >
                  <div className="flex items-center gap-5">
                    <button className="player-fs-btn" onClick={previous} aria-label="Назад">
                      <SkipBack className="h-6 w-6" />
                    </button>
                    <button
                      className="player-fs-play"
                      onClick={togglePlay}
                      aria-label={isPlaying ? 'Пауза' : 'Играть'}
                    >
                      {isPlaying
                        ? <Pause className="h-7 w-7" />
                        : <Play  className="h-7 w-7 translate-x-0.5" />
                      }
                    </button>
                    <button className="player-fs-btn" onClick={next} aria-label="Вперёд">
                      <SkipForward className="h-6 w-6" />
                    </button>
                  </div>
                  
                  {lyrics.length > 0 && (
                    <div className="absolute right-0">
                      <button 
                        className="player-fs-btn" 
                        onClick={toggleTranslation} 
                        disabled={isTranslating}
                        style={{ opacity: showTranslation || isTranslating ? 1 : 0.4 }}
                        aria-label="Перевод текста"
                      >
                        {isTranslating ? <Loader2 className="h-6 w-6 animate-spin" /> : <Globe className="h-6 w-6" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Volume ────────────────────────────── */}
                {showFsVolume && <div
                  className="flex items-center gap-3 mt-8"
                  onWheel={handleVolumeWheel}
                >
                  <button
                    className="player-fs-vol-btn"
                    onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
                    aria-label="Mute"
                  >
                    <VolumeIcon className="h-4 w-4" />
                  </button>
                  <ProgressBar
                    value={typeof volume === 'number' ? volume : 1}
                    onChange={setVolume}
                    className="w-32"
                  />
                </div>}
              </div>
            </div>

            {/* ── Right Side: Lyrics ── */}
            {lyrics.length > 0 && (
              <div 
                className="flex-1 relative hidden lg:block w-full max-w-2xl"
                style={{
                  opacity: fsVisible ? 1 : 0,
                  transform: fsVisible ? 'translateX(0)' : 'translateX(16px)',
                  transition: 'opacity 0.4s ease 0.2s, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1) 0.2s',
                }}
              >
                <div 
                  className="w-full h-full max-h-[60vh] overflow-y-auto scrollbar-hide mask-linear-fade px-12 -mx-12"
                  ref={lyricsContainerRef}
                  onWheel={handleUserScroll}
                  onTouchMove={handleUserScroll}
                  style={{
                    // Fade edges
                    maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
                    // Hardware acceleration to fix WebKit mask rendering glitches
                    transform: 'translateZ(0)',
                    willChange: 'transform, scroll-position'
                  }}
                >
                  <div className="py-[30vh]">
                    {lyrics.map((line, idx) => {
                      // Check if current line is active
                      const isActive = currentTime >= line.time && (idx === lyrics.length - 1 || currentTime < lyrics[idx + 1].time);
                      const translatedLine = translatedLyrics[idx];
                      return (
                        <div 
                          key={idx}
                          data-index={idx}
                          className={`mb-8 cursor-pointer py-4 -mt-4 transition-all duration-500 ease-out origin-left
                            ${isActive ? 'scale-[1.05]' : ''}
                          `}
                          onClick={() => { if (line.time >= 0) seek(line.time); }}
                        >
                          <p 
                            className={`text-2xl md:text-3xl lg:text-4xl font-bold transition-all duration-500 ease-out
                              ${isActive ? 'text-white [text-shadow:0_0_25px_rgba(255,255,255,0.6)]' : 'text-white/30 hover:text-white/50'}
                            `}
                          >
                            {line.text}
                          </p>
                          {translatedLine && showTranslation && (
                            <p 
                              className={`mt-1 text-lg md:text-xl font-medium transition-all duration-500 ease-out
                                ${isActive ? 'text-white/90' : 'text-white/20 hover:text-white/40'}
                              `}
                            >
                              {translatedLine}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
