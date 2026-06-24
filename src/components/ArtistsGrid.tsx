import React, { useMemo } from 'react';
import { useMusicContext, type Track } from './MusicContext';
import { Card, CardContent } from './ui/card';
import { Users, Play } from 'lucide-react';

export interface ArtistInfo {
  name: string;
  cover: string | null;
  tracks: Track[];
}

interface ArtistsGridProps {
  mode?: 'recent' | 'all';
  limit?: number;
  onArtistClick?: (artist: ArtistInfo) => void;
}

function splitArtists(artistString: string): string[] {
  if (!artistString) return ['Unknown Artist'];
  // Разделяем по популярным разделителям: запятая, амперсанд, feat, ft, featuring, /, ;
  const regex = /,(?!\s*Inc\b)|&|\bfeat\.?\b|\bft\.?\b|\bfeaturing\b|\/|;/gi;
  const artists = artistString.split(regex).map(s => s.trim()).filter(Boolean);
  return artists.length > 0 ? artists : ['Unknown Artist'];
}

export const ArtistsGrid: React.FC<ArtistsGridProps> = ({ mode = 'recent', limit = 4, onArtistClick }) => {
  const { tracks, play, setQueue } = useMusicContext();

  const artists = useMemo<ArtistInfo[]>(() => {
    const map = new Map<string, ArtistInfo>();
    
    for (const t of tracks) {
      const artistNames = splitArtists(t.artist || 'Unknown Artist');
      
      for (const rawName of artistNames) {
        const key = rawName.toLowerCase();
        const current = map.get(key) || { name: rawName, cover: t.cover || null, tracks: [] };
        
        // Избегаем дублирования трека, если один исполнитель указан дважды
        if (!current.tracks.find(tr => tr.id === t.id)) {
          current.tracks.push(t);
        }
        
        if (!current.cover && t.cover) current.cover = t.cover;
        map.set(key, current);
      }
    }
    
    let list = Array.from(map.values());
    if (mode === 'recent') {
      list = list
        .sort((a, b) => {
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

  if (artists.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {artists.map((artist) => (
          <Card 
            key={artist.name} 
            className="bg-transparent hover:bg-card/40 transition-colors duration-300 cursor-pointer border-0 shadow-none group" 
            onClick={() => onArtistClick?.(artist)}
          >
            <CardContent className="p-4">
              <div className="aspect-square rounded-full overflow-hidden relative bg-muted mb-4 shadow-lg">
                {artist.cover ? (
                  <img src={artist.cover} alt={artist.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Users className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                
                {/* Play Button Overlay */}
                <div className="absolute bottom-2 right-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10">
                  <button 
                    className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-xl hover:scale-105 active:scale-95 transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (artist.tracks.length > 0) {
                        setQueue(artist.tracks);
                        play(artist.tracks[0]);
                      }
                    }}
                  >
                    <Play className="h-6 w-6 ml-1" fill="currentColor" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <p className="font-bold truncate text-foreground">{artist.name}</p>
                <p className="text-muted-foreground text-sm truncate font-medium">Исполнитель</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
