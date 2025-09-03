import React, { useMemo, useState } from 'react';
import { useMusicContext, type Track } from './MusicContext';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Music } from 'lucide-react';
import { TrackList } from './TrackList';

interface AlbumInfo {
  name: string;
  artist: string;
  cover: string | null;
  tracks: Track[];
}

interface AlbumsGridProps {
  mode?: 'recent' | 'all';
  limit?: number;
}

export const AlbumsGrid: React.FC<AlbumsGridProps> = ({ mode = 'recent', limit = 4 }) => {
  const { tracks } = useMusicContext();
  const [openedAlbum, setOpenedAlbum] = useState<AlbumInfo | null>(null);

  const albums = useMemo<AlbumInfo[]>(() => {
    const map = new Map<string, AlbumInfo>();
    for (const t of tracks) {
      const key = (t.album || 'Unknown Album').trim();
      const current = map.get(key) || { name: key, artist: t.artist || 'Unknown Artist', cover: t.cover || null, tracks: [] };
      current.tracks.push(t);
      if (!current.cover && t.cover) current.cover = t.cover;
      if (current.artist === 'Unknown Artist' && t.artist) current.artist = t.artist;
      map.set(key, current);
    }
    let list = Array.from(map.values());
    if (mode === 'recent') {
      list = list
        .sort((a, b) => {
          const aTs = Math.max(...a.tracks.map(tt => (tt as any).lastPlayedAt || 0));
          const bTs = Math.max(...b.tracks.map(tt => (tt as any).lastPlayedAt || 0));
          return bTs - aTs;
        })
        .slice(0, limit);
    } else {
      list = list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [tracks, mode, limit]);

  if (albums.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {albums.map((album) => (
          <Card key={album.name} className="bg-card/50 hover:bg-card transition-colors cursor-pointer border-0" onClick={() => setOpenedAlbum(album)}>
            <CardContent className="p-4">
              <div className="aspect-square rounded-lg overflow-hidden relative bg-muted">
                {album.cover ? (
                  <img src={album.cover} alt={album.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Music className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-1">
                <p className="font-medium truncate">{album.name}</p>
                <p className="text-muted-foreground text-sm truncate">{album.artist}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!openedAlbum} onOpenChange={(open) => !open && setOpenedAlbum(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          {openedAlbum && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center overflow-hidden">
                    {openedAlbum.cover ? (
                      <img src={openedAlbum.cover} alt={openedAlbum.name} className="w-full h-full object-cover" />
                    ) : (
                      <Music className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h2>{openedAlbum.name}</h2>
                    <p className="text-muted-foreground text-sm">{openedAlbum.artist} • {openedAlbum.tracks.length} tracks</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto max-h-[60vh]">
                <TrackList tracks={openedAlbum.tracks} showSearch={false} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};


