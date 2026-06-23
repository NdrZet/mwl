import React, { useMemo } from 'react';
import { useMusicContext, type Track } from './MusicContext';
import { Card, CardContent } from './ui/card';
import { Music } from 'lucide-react';

export interface AlbumInfo {
  name: string;
  artist: string;
  cover: string | null;
  tracks: Track[];
}

interface AlbumsGridProps {
  mode?: 'recent' | 'all';
  limit?: number;
  onAlbumClick?: (album: AlbumInfo) => void;
}

export const AlbumsGrid: React.FC<AlbumsGridProps> = ({ mode = 'recent', limit = 4, onAlbumClick }) => {
  const { tracks } = useMusicContext();

  const albums = useMemo<AlbumInfo[]>(() => {
    // Ключ нормализован по нижнему регистру — «Pop» и «pop» попадают в одну группу
    const map = new Map<string, AlbumInfo>();
    for (const t of tracks) {
      const rawName = (t.album || 'Unknown Album').trim();
      const key     = rawName.toLowerCase();
      const current = map.get(key) || { name: rawName, artist: t.artist || 'Unknown Artist', cover: t.cover || null, tracks: [] };
      current.tracks.push(t);
      if (!current.cover && t.cover) current.cover = t.cover;
      if (current.artist === 'Unknown Artist' && t.artist) current.artist = t.artist;
      map.set(key, current);
    }
    let list = Array.from(map.values());
    if (mode === 'recent') {
      list = list
        .sort((a, b) => {
          // lastPlayedAt уже типизирован в Track как number | undefined
          const aTs = Math.max(...a.tracks.map(tt => tt.lastPlayedAt ?? 0));
          const bTs = Math.max(...b.tracks.map(tt => tt.lastPlayedAt ?? 0));
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
          <Card key={`${album.name}::${album.artist}`} className="bg-card/50 hover:bg-card transition-colors cursor-pointer border-0" onClick={() => onAlbumClick?.(album)}>
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
    </div>
  );
};



