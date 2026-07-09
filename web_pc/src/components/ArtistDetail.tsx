import React, { useEffect, useState } from 'react';
import { Play, Users, ArrowLeft, Globe, Loader2, Music } from 'lucide-react';
import { Button } from './ui/button';
import { TrackList } from './TrackList';
import { AlbumsGrid } from './AlbumsGrid';
import { useMusicContext } from './MusicContext';
import { type ArtistInfo } from './ArtistsGrid';

interface ArtistDetailProps {
  artist: ArtistInfo | null;
  onBack: () => void;
  onAlbumClick?: (album: any) => void;
}

interface ArtistApiData {
  banner: string | null;
  thumb: string | null;
  biographyEN: string | null;
  biographyRU: string | null;
  genre: string | null;
}

export const ArtistDetail: React.FC<ArtistDetailProps> = ({ artist, onBack, onAlbumClick }) => {
  const { play, setQueue } = useMusicContext();
  const [apiData, setApiData] = useState<ArtistApiData | null>(null);
  const [loadingApi, setLoadingApi] = useState(false);
  const [translatedBio, setTranslatedBio] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);

  useEffect(() => {
    if (!artist) return;
    setLoadingApi(true);
    setApiData(null);
    setTranslatedBio(null);

    const API_BASE = typeof window !== 'undefined' && window.electronAPI ? 'http://31.76.51.33:3001' : '';

    fetch(`${API_BASE}/api/artist?name=${encodeURIComponent(artist.name)}`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          setApiData(data);
          if (data.biographyRU) setTranslatedBio(data.biographyRU);
        }
        setLoadingApi(false);
      })
      .catch(() => setLoadingApi(false));
  }, [artist?.name]);

  const handleTranslate = async () => {
    if (!apiData?.biographyEN || !window.electronAPI?.translateLyrics) return;
    if (translatedBio) {
      setTranslatedBio(null);
      return;
    }
    setIsTranslating(true);
    try {
      const res = await window.electronAPI.translateLyrics(apiData.biographyEN, 'ru');
      if (res) setTranslatedBio(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  };

  if (!artist) {
    return (
      <div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="text-sm text-muted-foreground mt-4">Artist not found</div>
      </div>
    );
  }

  const handlePlayArtist = () => {
    if (artist.tracks.length > 0) {
      setQueue(artist.tracks);
      play(artist.tracks[0]);
    }
  };

  const bannerUrl = apiData?.banner || null;
  const thumbUrl = apiData?.thumb || artist.cover;

  return (
    <div className="relative -m-6 md:-m-10 mb-6"> 
      
      {/* ── Hero Banner ── */}
      <div className="h-[40vh] md:h-[50vh] relative flex items-end p-6 md:p-10">
         {/* Background Image */}
         {bannerUrl ? (
            <div className="absolute inset-0 z-0">
               <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            </div>
         ) : (
            <div className="absolute inset-0 z-0">
              {thumbUrl && <img src={thumbUrl} alt="" className="w-full h-full object-cover blur-[100px] opacity-40" />}
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            </div>
         )}
         
         {/* Content */}
         <div className="relative z-10 flex flex-col md:flex-row gap-6 items-end w-full">
            {!bannerUrl && (
                <div className="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden bg-muted shadow-2xl flex-shrink-0">
                   {thumbUrl ? (
                      <img src={thumbUrl} alt={artist.name} className="w-full h-full object-cover" />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="h-16 w-16 text-muted-foreground/50" />
                      </div>
                   )}
                </div>
            )}
            
            <div className="flex-1 w-full">
               <div className="flex items-center gap-2 mb-3">
                 <Button variant="ghost" size="sm" className="text-white/70 hover:text-white -ml-3 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Назад
                 </Button>
               </div>
               
               <p className="text-sm font-bold uppercase tracking-widest text-white/90 mb-1 drop-shadow-md">
                  Исполнитель {apiData?.genre && `• ${apiData.genre}`}
               </p>
               <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-white drop-shadow-xl mb-4 line-clamp-2">
                 {artist.name}
               </h1>
               <div className="text-white/80 font-medium drop-shadow-md">
                 {artist.tracks.length} треков
               </div>
            </div>
         </div>
      </div>
      
      {/* ── Content ── */}
      <div className="p-6 md:p-10 space-y-10">
         {/* Play Button Row */}
         <div className="flex items-center gap-6">
            <button 
              onClick={handlePlayArtist}
              className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-primary/40"
            >
              <Play className="h-8 w-8 ml-1.5" fill="currentColor" />
            </button>
            {loadingApi && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
         </div>

         {/* Biography was moved to bottom */}
         
         <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
           {/* Popular Tracks */}
           <div>
             <h2 className="text-2xl font-bold mb-4">Популярное</h2>
             {/* We sort artist.tracks by lastPlayedAt descending to simulate 'popular', or just take first 5 */}
             <div className="-mx-2">
               <TrackList 
                 tracks={[...artist.tracks].sort((a,b) => (b.lastPlayedAt||0) - (a.lastPlayedAt||0)).slice(0, 5)} 
                 showSearch={false} 
                 disableScroll={true} 
               />
             </div>
           </div>
         </div>

         {/* Albums/Releases */}
         <div>
           <h2 className="text-2xl font-bold mb-6">Альбомы и Синглы</h2>
           <AlbumsGrid mode="all" limit={100} artistFilter={artist.name} onAlbumClick={onAlbumClick} />
         </div>

         {/* Biography */}
         {(apiData?.biographyEN || apiData?.biographyRU) && (
            <div className="max-w-4xl bg-white/5 rounded-2xl p-6 relative mt-10">
              <h2 className="text-xl font-bold mb-3">Об исполнителе</h2>
              <div className={`relative ${!bioExpanded ? 'max-h-32 overflow-hidden' : ''}`}>
                <p className="text-white/70 leading-relaxed text-sm whitespace-pre-wrap">
                   {translatedBio || apiData.biographyEN}
                </p>
                {!bioExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#18181a] to-transparent pointer-events-none" />
                )}
              </div>
              <div className="flex items-center gap-4 mt-4">
                <Button variant="ghost" size="sm" className="text-white/50 hover:text-white -ml-3" onClick={() => setBioExpanded(!bioExpanded)}>
                  {bioExpanded ? 'Свернуть' : 'Читать далее'}
                </Button>
                
                {(!apiData.biographyRU || translatedBio !== apiData.biographyRU) && apiData.biographyEN && (
                   <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={handleTranslate} disabled={isTranslating}>
                     {isTranslating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
                     {translatedBio ? 'Показать оригинал' : 'Перевести'}
                   </Button>
                )}
              </div>
            </div>
         )}

      </div>
    </div>
  );
};
