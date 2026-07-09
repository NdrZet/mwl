import React, { useState, useEffect, useRef } from 'react';
import { Search, Music, Mic2, Disc } from 'lucide-react';
import { useMusicContext, type Track } from './MusicContext';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

interface GlobalSearchProps {
  navigate: (view: any) => void;
  setOpenedAlbum: (album: any) => void;
  setOpenedArtist: (artist: any) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ navigate, setOpenedAlbum, setOpenedArtist }) => {
  const { tracks, globalSearchQuery, setGlobalSearchQuery } = useMusicContext();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const query = globalSearchQuery.trim().toLowerCase();

  const results = React.useMemo(() => {
    if (!query) return { tracks: [], albums: [], artists: [] };

    const matchedTracks = tracks.filter(t => 
      t.name.toLowerCase().includes(query) || 
      t.artist.toLowerCase().includes(query) || 
      (t.album && t.album.toLowerCase().includes(query))
    );

    // Get unique albums
    const albumMap = new Map();
    matchedTracks.forEach(t => {
      const rawName = (t.album || 'Unknown Album').trim();
      const key = rawName.toLowerCase();
      if (!albumMap.has(key)) {
        albumMap.set(key, { name: rawName, artist: t.artist || 'Unknown Artist', cover: t.cover || null, tracks: [t] });
      } else {
        albumMap.get(key).tracks.push(t);
      }
    });
    
    // Get unique artists
    const artistMap = new Map();
    matchedTracks.forEach(t => {
      if (!t.artist) return;
      const key = t.artist.toLowerCase();
      if (!artistMap.has(key)) {
        artistMap.set(key, { name: t.artist, cover: t.cover || null, tracks: [t] });
      } else {
        artistMap.get(key).tracks.push(t);
      }
    });

    return {
      tracks: matchedTracks.slice(0, 5),
      albums: Array.from(albumMap.values()).slice(0, 3),
      artists: Array.from(artistMap.values()).slice(0, 3)
    };
  }, [tracks, query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsOpen(false);
      navigate('search');
    }
  };

  const hasResults = results.tracks.length > 0 || results.albums.length > 0 || results.artists.length > 0;

  return (
    <div ref={containerRef} className="relative w-64 max-w-sm" style={{ WebkitAppRegion: 'no-drag' as any }}>
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search tracks, artists..."
          value={globalSearchQuery}
          onChange={(e) => {
            setGlobalSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full bg-white/5 border-transparent text-sm pl-9 pr-4 py-1.5 rounded-full focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all placeholder:text-white/30"
        />
      </div>

      {isOpen && query && (
        <div className="absolute top-full mt-2 w-80 right-0 sm:right-auto bg-[#1A1F1F] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[70vh]">
          <ScrollArea className="flex-1">
            <div className="p-2">
              {!hasResults && (
                <div className="p-4 text-center text-sm text-white/50">
                  No results found for "{query}"
                </div>
              )}

              {results.artists.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Artists</div>
                  {results.artists.map((artist: any) => (
                    <button
                      key={artist.name}
                      className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors text-left"
                      onClick={() => {
                        setOpenedArtist(artist);
                        setIsOpen(false);
                        navigate('artistDetail');
                      }}
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {artist.cover ? <img src={artist.cover} alt="" className="w-full h-full object-cover" /> : <Mic2 className="w-5 h-5 text-white/50" />}
                      </div>
                      <div className="flex-1 truncate">
                        <div className="text-sm font-medium text-white truncate">{artist.name}</div>
                        <div className="text-xs text-white/50">Artist</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.albums.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Albums</div>
                  {results.albums.map((album: any) => (
                    <button
                      key={album.name}
                      className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors text-left"
                      onClick={() => {
                        setOpenedAlbum(album);
                        setIsOpen(false);
                        navigate('albumDetail');
                      }}
                    >
                      <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {album.cover ? <img src={album.cover} alt="" className="w-full h-full object-cover" /> : <Disc className="w-5 h-5 text-white/50" />}
                      </div>
                      <div className="flex-1 truncate">
                        <div className="text-sm font-medium text-white truncate">{album.name}</div>
                        <div className="text-xs text-white/50 truncate">{album.artist}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.tracks.length > 0 && (
                <div>
                  <div className="px-2 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Tracks</div>
                  {results.tracks.map((track) => (
                    <button
                      key={track.id}
                      className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors text-left"
                      onClick={() => {
                        setIsOpen(false);
                        navigate('search');
                      }}
                    >
                      <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {track.cover ? <img src={track.cover} alt="" className="w-full h-full object-cover" /> : <Music className="w-5 h-5 text-white/50" />}
                      </div>
                      <div className="flex-1 truncate">
                        <div className="text-sm font-medium text-white truncate">{track.name}</div>
                        <div className="text-xs text-white/50 truncate">{track.artist}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
          
          {hasResults && (
            <div className="p-2 border-t border-white/10 bg-black/20">
              <button 
                className="w-full py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                onClick={() => {
                  setIsOpen(false);
                  navigate('search');
                }}
              >
                Show all results
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
