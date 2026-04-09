import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, Volume1, VolumeX, Music, ChevronDown, Maximize2,
} from 'lucide-react';
import { useMusicContext } from './MusicContext';

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
  const [hov, setHov] = useState(false);
  const [drag, setDrag] = useState(false);

  const getVal = (clientX: number) => {
    if (!ref.current) return 0;
    const { left, width } = ref.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - left) / width));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setDrag(true);
    onChange(getVal(e.clientX));
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: MouseEvent) => onChange(getVal(e.clientX));
    const up = () => setDrag(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [drag, onChange]); // eslint-disable-line react-hooks/exhaustive-deps

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
          height: active ? 5 : 3,
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
    togglePlay, next, previous, seek, setVolume,
  } = useMusicContext();

  const { w, h } = useWindowSize();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsVisible, setFsVisible]       = useState(false);
  const [infoVisible, setInfoVisible]   = useState(true);
  const prevTrackIdRef = useRef<string | null>(null);

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

  const isLive    = currentTrack && (currentTrack.album === 'Stream' || currentTrack.duration === 0);
  const progress  = duration > 0 && isFinite(currentTime) ? currentTime / duration : 0;
  const VolumeIcon = !volume ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

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
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeFullscreen(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isFullscreen, closeFullscreen]);

  const openFullscreen = () => {
    setIsFullscreen(true);
    requestAnimationFrame(() => setTimeout(() => setFsVisible(true), 16));
  };

  const handleVolumeWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setVolume(Math.max(0, Math.min(1, (volume || 1) + (e.deltaY > 0 ? -0.05 : 0.05))));
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
        <div className={`player-fs ${fsVisible ? 'player-fs--in' : ''}`}>

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
          >
            <ChevronDown className="h-5 w-5" />
          </button>

          {/* Main content column */}
          <div className={`relative z-10 h-full flex flex-col items-center justify-center ${fsGap} px-8 ${fsPy}`}>

            {/* ── Vinyl record ──────────────────────── */}
            <div className="player-vinyl-outer">
              <div className={`player-vinyl__disc ${isPlaying ? 'player-vinyl__disc--spin' : ''}`}>
                <div className="player-vinyl__label">
                  {currentTrack.cover
                    ? <img
                        src={currentTrack.cover}
                        alt={currentTrack.name}
                        className="w-full h-full object-cover"
                      />
                    : <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: '#1e1e1e' }}
                      >
                        <Music className="text-neutral-600" style={{ width: '32%', height: '32%' }} />
                      </div>
                  }
                </div>
                <div className="player-vinyl__hole" />
              </div>
            </div>

            {/* ── Track info ────────────────────────── */}
            <div
              className="text-center"
              style={{
                opacity:    fsVisible ? 1 : 0,
                transform:  fsVisible ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 0.22s ease 0.04s, transform 0.22s ease 0.04s',
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
              ? <div className="flex items-center gap-2 font-semibold text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </div>
              : <div
                  className="w-full max-w-sm"
                  style={{ opacity: fsVisible ? 1 : 0, transition: 'opacity 0.22s ease 0.07s' }}
                >
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
              className="flex items-center gap-5"
              style={{
                opacity:    fsVisible ? 1 : 0,
                transform:  fsVisible ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 0.22s ease 0.1s, transform 0.22s ease 0.1s',
              }}
            >
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

            {/* ── Volume ────────────────────────────── */}
            {showFsVolume && <div
              className="flex items-center gap-3"
              style={{ opacity: fsVisible ? 1 : 0, transition: 'opacity 0.22s ease 0.13s' }}
              onWheel={handleVolumeWheel}
            >
              <button
                className="transition-colors duration-150"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
                aria-label="Mute"
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
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
      )}
    </>
  );
};
