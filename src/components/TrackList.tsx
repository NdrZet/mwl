import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, MoreHorizontal, Trash2, Plus, Music, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
// Убираем Radix-меню и делаем собственное всплывающее меню
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { useMusicContext, type Track } from './MusicContext';
import { ScrollArea } from './ui/scroll-area';

const formatDuration = (seconds: number): string => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface TrackListProps {
  tracks?: Track[];
  showSearch?: boolean;
  onPlayAll?: () => void;
}

export const TrackList: React.FC<TrackListProps> = ({
                                                      tracks: propTracks,
                                                      showSearch = true,
                                                      onPlayAll
                                                    }) => {
  const {
    tracks: allTracks,
    currentTrack,
    isPlaying,
    play,
    pause,
    removeTrack,
    playlists,
    addToPlaylist,
    setQueue
  } = useMusicContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [trackToDelete, setTrackToDelete] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<{ id: string; x: number; y: number } | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuFor(null); };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest?.('[data-tracklist-menu]')) return;
      setMenuFor(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('click', onClick); };
  }, []);

  useEffect(() => {
    const root = document.getElementById('root');
    const dark = root?.querySelector('.dark') as HTMLElement | null;
    setPortalEl(dark || root || document.body);
  }, []);

  const computeMenuPosition = (rect: DOMRect) => {
    const GAP = 8;
    const MENU_W = 224; // w-56
    const MENU_H = 260; // приблизительная высота
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = rect.left + rect.width + GAP;
    let y = rect.top + rect.height + GAP;
    if (x + MENU_W > vw - 8) x = Math.max(8, rect.left - GAP - MENU_W);
    if (y + MENU_H > vh - 8) y = Math.max(8, vh - 8 - MENU_H);
    return { x, y };
  };

  const tracks = propTracks || allTracks;

  const filteredTracks = tracks.filter(track =>
      track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (track.album && track.album.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePlayTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pause();
      } else {
        play(track);
      }
    } else {
      const trackIndex = filteredTracks.findIndex(t => t.id === track.id);
      const newQueue = [
        ...filteredTracks.slice(trackIndex),
        ...filteredTracks.slice(0, trackIndex)
      ];
      setQueue(newQueue);
      play(track);
    }
  };

  const handlePlayAll = () => {
    if (filteredTracks.length > 0) {
      setQueue(filteredTracks);
      play(filteredTracks[0]);
      onPlayAll?.();
    }
  };

  const handleDeleteTrack = () => {
    if (trackToDelete) {
      removeTrack(trackToDelete);
      setTrackToDelete(null);
    }
  };

  if (tracks.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <Music className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mb-2">No music tracks found</h3>
          <p className="text-muted-foreground mb-6">Add some music files to get started!</p>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        {showSearch && (
            <div className="flex items-center justify-between">
              <Input
                  placeholder="Search tracks, artists, albums..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm bg-muted border-0"
              />
              {filteredTracks.length > 0 && (
                  <Button
                      onClick={handlePlayAll}
                      className="bg-primary hover:bg-primary/90"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Play All
                  </Button>
              )}
            </div>
        )}

        {filteredTracks.length > 0 && (
            <ScrollArea className="h-[calc(100vh-420px)]">
              <div className="space-y-1 pr-4">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-muted-foreground border-b border-border text-sm">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-6">Title</div>
                  <div className="col-span-3">Album</div>
                  <div className="col-span-1 flex justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="col-span-1"></div>
                </div>

                {/* Track List */}
                {filteredTracks.map((track, index) => (
                    <div
                        key={track.id}
                        className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-md hover:bg-muted/50 group transition-colors ${
                            currentTrack?.id === track.id ? 'bg-muted' : ''
                        }`}
                        onDoubleClick={() => handlePlayTrack(track)}
                    >
                      {/* Play Button / Track Number */}
                      <div className="col-span-1 flex items-center justify-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePlayTrack(track)}
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        >
                          {currentTrack?.id === track.id && isPlaying ? (
                              <Pause className="h-4 w-4 text-primary" />
                          ) : (
                              <Play className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                        <span className="group-hover:hidden group-focus:hidden text-muted-foreground">
                    {index + 1}
                  </span>
                      </div>

                      {/* Track Info */}
                      <div className="col-span-6 flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-muted relative">
                          <Music className="h-5 w-5 text-muted-foreground absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                          <img
                            src={track.cover || ''}
                            alt={track.name}
                            loading="lazy"
                            className="w-full h-full object-cover absolute inset-0"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            style={{ display: track.cover ? 'block' as const : 'none' as const }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className={`truncate ${currentTrack?.id === track.id ? 'text-primary' : ''}`}>
                            {track.name}
                          </p>
                          <p className="text-muted-foreground truncate text-sm">
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      {/* Album */}
                      <div className="col-span-3 flex items-center">
                        <p className="text-muted-foreground truncate text-sm">
                          {track.album}
                        </p>
                      </div>

                      {/* Duration */}
                      <div className="col-span-1 flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">
                    {formatDuration(track.duration)}
                  </span>
                      </div>

                      {/* More Options */}
                      <div className="col-span-1 flex items-center justify-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          aria-label="More actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const pos = computeMenuPosition(rect);
                            setMenuFor({ id: track.id, x: pos.x, y: pos.y });
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                ))}
              </div>
            </ScrollArea>
        )}

        {filteredTracks.length === 0 && searchQuery && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <h3 className="mb-2">No results found</h3>
              <p className="text-muted-foreground">
                No tracks found matching "{searchQuery}"
              </p>
            </div>
        )}
      <AlertDialog open={!!trackToDelete} onOpenChange={(open) => { if (!open) setTrackToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Track</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this track? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTrackToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrack}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {menuFor && portalEl && createPortal(
        <div data-tracklist-menu className="fixed z-[10000]" style={{ left: Math.round(menuFor.x), top: Math.round(menuFor.y) }} onClick={(e) => e.stopPropagation()}>
          <div className="bg-popover text-popover-foreground w-56 rounded-md p-1 shadow-lg">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Add to Playlist</div>
            <div className="py-1 max-h-64 overflow-y-auto">
              {playlists.length === 0 ? (
                <div className="px-2 py-1 text-sm text-muted-foreground">No playlists available</div>
              ) : (
                playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    className="w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => { addToPlaylist(playlist.id, menuFor.id); setMenuFor(null); }}
                  >
                    <Plus className="inline-block mr-2 h-4 w-4 align-text-bottom" />
                    {playlist.name}
                  </button>
                ))
              )}
            </div>
            <div className="my-1 h-px bg-border" />
            <button
              className="w-full text-left px-2 py-1.5 rounded-sm text-sm text-destructive hover:bg-destructive/10"
              onClick={() => { setTrackToDelete(menuFor.id); setMenuFor(null); }}
            >
              <Trash2 className="inline-block mr-2 h-4 w-4 align-text-bottom" />
              Delete
            </button>
          </div>
        </div>,
        portalEl
      )}
      </div>
  );
};