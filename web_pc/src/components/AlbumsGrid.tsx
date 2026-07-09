import React, { useMemo } from 'react';
import { useMusicContext, type Track } from './MusicContext';
import { Card, CardContent } from './ui/card';
import { Music, Play } from 'lucide-react';

export interface AlbumInfo {
  name: string;
  artist: string;
  cover: string | null;
  tracks: Track[];
}

interface AlbumsGridProps {
  mode?: 'recent' | 'all';
  limit?: number;
  title?: string;
  artistFilter?: string;
  searchQuery?: string;
  onAlbumClick?: (album: AlbumInfo) => void;
}

export const AlbumsGrid: React.FC<AlbumsGridProps> = ({ mode = 'recent', limit = 4, title, artistFilter, searchQuery, onAlbumClick }) => {
  const { tracks, play, setQueue } = useMusicContext();

  const albums = useMemo<AlbumInfo[]>(() => {
    // Ключ нормализован по нижнему регистру — «Pop» и «pop» попадают в одну группу
    const map = new Map<string, AlbumInfo>();
    for (const t of tracks) {
      if (artistFilter && t.artist !== artistFilter) {
        // Проверяем, может исполнитель содержится в строке (т.к. мы разделили фиты)
        if (!t.artist?.toLowerCase().includes(artistFilter.toLowerCase())) {
          continue;
        }
      }
      const rawName = (t.album || 'Unknown Album').trim();
      
      if (searchQuery && !rawName.toLowerCase().includes(searchQuery.toLowerCase())) {
        continue;
      }

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
  }, [tracks, mode, limit, artistFilter, searchQuery]);

  if (albums.length === 0) return null;

  return (
    <div className="space-y-4">
      {title && <h2 className="text-xl font-bold text-white">{title}</h2>}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {albums.map((album) => {
          const isSingle = album.tracks.length <= 3;
          const subtitle = artistFilter ? (isSingle ? 'Сингл' : 'Альбом') : album.artist;

          return (
            <Card 
              key={`${album.name}::${album.artist}`} 
              className="bg-transparent hover:bg-card/40 transition-colors duration-300 cursor-pointer border-0 shadow-none group" 
              onClick={() => onAlbumClick?.(album)}
            >
              <CardContent className="p-4">
                <div className="aspect-square rounded-md overflow-hidden relative bg-muted shadow-lg mb-4">
                  {album.cover ? (
                    <img src={album.cover} alt={album.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Music className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Play Button Overlay */}
                  <div className="absolute bottom-2 right-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10">
                    <button 
                      className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-xl hover:scale-105 active:scale-95 transition-transform"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQueue(album.tracks);
                        play(album.tracks[0]);
                      }}
                    >
                      <Play className="h-6 w-6 ml-1" fill="currentColor" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-bold truncate text-foreground">{album.name}</p>
                  <p className="text-muted-foreground text-sm truncate font-medium">{subtitle}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};



