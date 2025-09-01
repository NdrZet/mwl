import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Music, Heart, Repeat, Shuffle } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { useMusicContext } from './MusicContext';

const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const MusicPlayer: React.FC = () => {
  const {
    currentTrack, isPlaying, currentTime, duration, volume,
    togglePlay, next, previous, seek, setVolume
  } = useMusicContext();

  const handleProgressChange = (value: number[]) => seek(value[0]);
  const handleVolumeChange = (value: number[]) => setVolume(value[0]);

  const handleVolumeWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newVolume = Math.max(0, Math.min(1, (volume || 1) + delta));
    setVolume(newVolume);
  };

  // --- ВОТ ЭТА ПРОВЕРКА РЕШАЕТ ВСЕ ---
  // Если трек не выбран, показываем заглушку и выходим.
  if (!currentTrack) {
    return (
        <div className="h-24 bg-sidebar border-t border-sidebar-border px-4 py-3">
          <div className="flex items-center justify-center h-full text-sidebar-accent-foreground">
            <Music className="mr-2 h-5 w-5" />
            Select a track to start playing
          </div>
        </div>
    );
  }
  // ------------------------------------

  // Если мы дошли до сюда, значит currentTrack ТОЧНО существует, и ошибок не будет.
  return (
      <div className="h-24 bg-sidebar border-t border-sidebar-border px-4 py-3">
        <div className="grid grid-cols-3 items-center h-full">
          {/* Left: Track Info */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-14 h-14 rounded flex items-center justify-center flex-shrink-0 overflow-hidden bg-muted">
              {currentTrack.cover ? (
                  <img src={currentTrack.cover} alt={currentTrack.name} className="w-full h-full object-cover" />
              ) : (
                  <Music className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sidebar-foreground font-medium">{currentTrack.name}</p>
              <p className="text-sidebar-accent-foreground truncate text-sm">{currentTrack.artist}</p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-sidebar-accent-foreground hover:text-primary">
              <Heart className="h-4 w-4" />
            </Button>
          </div>

          {/* Center: Player Controls */}
          <div className="flex flex-col items-center space-y-2 w-full max-w-4xl mx-auto px-4">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-sidebar-accent-foreground hover:text-sidebar-foreground" onClick={previous}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-sidebar-accent-foreground hover:text-sidebar-foreground" onClick={next}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-3 w-full max-w-4xl">
              <span className="text-xs text-sidebar-accent-foreground w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[isNaN(currentTime) ? 0 : currentTime]}
                onValueChange={handleProgressChange}
                max={isNaN(duration) || !duration ? 0 : duration}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-sidebar-accent-foreground w-10">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Right: Volume Control */}
          <div className="flex items-center justify-end space-x-2">
            <Volume2 className="h-4 w-4 text-sidebar-accent-foreground" />
            <div onWheel={handleVolumeWheel}>
              <Slider
                value={[typeof volume === 'number' ? volume : 1]}
                onValueChange={handleVolumeChange}
                max={1}
                step={0.01}
                className="w-24"
              />
            </div>
          </div>
        </div>
      </div>
  );
};