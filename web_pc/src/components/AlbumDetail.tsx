import React from 'react';
import { Play, Music, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { TrackList } from './TrackList';
import { useMusicContext } from './MusicContext';
import { type AlbumInfo } from './AlbumsGrid';

interface AlbumDetailProps {
  album: AlbumInfo | null;
  onBack: () => void;
  onArtistClick?: (artistName: string) => void;
}

export const AlbumDetail: React.FC<AlbumDetailProps> = ({ album, onBack, onArtistClick }) => {
  const { play, setQueue } = useMusicContext();

  if (!album) {
    return (
      <div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="text-sm text-muted-foreground mt-4">Album not found</div>
      </div>
    );
  }

  const totalDurationSeconds = album.tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
  const hours = Math.floor(totalDurationSeconds / 3600);
  const minutes = Math.floor((totalDurationSeconds % 3600) / 60);
  const seconds = Math.floor(totalDurationSeconds % 60);

  let durationText = '';
  if (hours > 0) {
    durationText = `${hours} hr ${minutes} min`;
  } else {
    durationText = `${minutes} min ${seconds} sec`;
  }

  const albumType = album.tracks.length === 1 ? 'Single' : 'Album';
  
  // Try to find year if available (some parsers put it in track.year)
  const anyTrackWithYear = album.tracks.find((t: any) => t.year);
  const yearText = anyTrackWithYear ? ` • ${(anyTrackWithYear as any).year}` : '';

  const handlePlayAlbum = () => {
    if (album.tracks.length > 0) {
      setQueue(album.tracks);
      play(album.tracks[0]);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* ── Back Button ── */}
      <div className="mb-4">
        <Button 
          variant="ghost" 
          size="sm"
          className="text-muted-foreground hover:text-white -ml-3 relative z-20"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>
      </div>

      {/* ── Header Area ── */}
      <div className="flex flex-col md:flex-row items-end gap-6 pb-6 relative z-10">
        
        {/* Cover Wrapper (for local glow) */}
        <div className="relative flex-shrink-0">
          {/* Ambient glow from cover art */}
          {album.cover && (
            <div className="absolute inset-0 pointer-events-none -z-10" aria-hidden="true" style={{ top: '-15%', left: '-15%', width: '130%', height: '130%' }}>
              <img
                src={album.cover}
                alt=""
                className="w-full h-full object-cover blur-[60px] opacity-30"
              />
            </div>
          )}

          {/* Cover */}
          <div className="w-56 h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-md overflow-hidden bg-muted/30 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative">
            {album.cover ? (
              <img src={album.cover} alt={album.name} className="w-full h-full object-cover relative z-10" />
            ) : (
              <div className="w-full h-full flex items-center justify-center relative z-10">
                <Music className="h-16 w-16 text-muted-foreground/50" />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col justify-end">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {albumType}
          </p>
          <h1 
            className="text-4xl md:text-5xl lg:text-7xl font-bold mb-4 tracking-tighter"
            style={{ 
              lineHeight: 1.1,
              background: 'linear-gradient(135deg, #A8EFEF 0%, #7DDDE8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {album.name}
          </h1>
          <div className="flex items-center text-sm font-medium text-muted-foreground/90 gap-1.5 flex-wrap mb-4">
            <button 
                className="text-foreground font-bold hover:underline"
                onClick={() => onArtistClick?.(album.artist)}
            >
                {album.artist}
            </button>
            {yearText && <span>{yearText}</span>}
            <span>•</span>
            <span>{album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{durationText}</span>
          </div>
          
          {/* ── Actions Row ──────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 mt-2">
            <button 
              onClick={handlePlayAlbum}
              className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:scale-105 active:scale-95 transition-transform shadow-[0_8px_24px_rgba(33,128,141,0.4)]"
            >
              <Play className="h-8 w-8 ml-1.5" fill="currentColor" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Track List ───────────────────────────────────────────────────────── */}
      <div className="pt-2">
        <TrackList tracks={album.tracks} showSearch={false} disableScroll={true} />
      </div>
    </div>
  );
};
