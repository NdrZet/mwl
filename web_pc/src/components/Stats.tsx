import React, { useEffect, useState } from 'react';
import { Clock, PlaySquare, Mic2 } from 'lucide-react';

export const Stats: React.FC = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (window.electronAPI?.statsGet) {
      window.electronAPI.statsGet().then(setStats);
    }
  }, []);

  if (!stats) return <div className="p-10 text-center text-white/50">Loading statistics...</div>;

  const safeTotalSeconds = Number.isFinite(stats.totalTimeSeconds) ? stats.totalTimeSeconds : 0;
  const totalMinutes = Math.floor(safeTotalSeconds / 60);

  // Top tracks
  const tracksArr = Object.values(stats.tracksPlayed || {}) as any[];
  const topTracks = tracksArr
    .filter(item => item && item.track)
    .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
    .slice(0, 5);

  // Top artists
  const artistsArr = Object.entries(stats.artistsPlayed || {}).map(([name, count]) => ({ name, count: Number.isFinite(count) ? (count as number) : 0 }));
  const topArtists = artistsArr.sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="vl-view-title text-4xl mb-2">Listening Stats</h1>
        <p className="vl-view-subtitle">Your musical journey overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <Clock className="w-8 h-8 text-primary mb-3" />
          <div className="text-3xl font-bold text-white mb-1">{totalMinutes}m</div>
          <div className="text-sm text-white/50">Total Listening Time</div>
        </div>
        
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <PlaySquare className="w-8 h-8 text-primary mb-3" />
          <div className="text-3xl font-bold text-white mb-1">{tracksArr.length}</div>
          <div className="text-sm text-white/50">Unique Tracks Played</div>
        </div>
        
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <Mic2 className="w-8 h-8 text-primary mb-3" />
          <div className="text-3xl font-bold text-white mb-1">{artistsArr.length}</div>
          <div className="text-sm text-white/50">Artists Discovered</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-6">Top Tracks</h2>
          <div className="space-y-4">
            {topTracks.length > 0 ? topTracks.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-6 text-center text-white/30 font-bold">{idx + 1}</div>
                <div className="w-12 h-12 bg-white/10 rounded overflow-hidden flex-shrink-0">
                  {item.track?.cover ? <img src={item.track.cover} alt="" className="w-full h-full object-cover" /> : null}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-white font-medium truncate">{item.track?.name || 'Unknown Track'}</div>
                  <div className="text-sm text-white/50 truncate">{item.track?.artist || 'Unknown Artist'}</div>
                </div>
                <div className="text-sm font-bold text-primary">{item.playCount} plays</div>
              </div>
            )) : <div className="text-white/50 text-sm">No tracks played yet</div>}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-6">Top Artists</h2>
          <div className="space-y-4">
            {topArtists.length > 0 ? topArtists.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-6 text-center text-white/30 font-bold">{idx + 1}</div>
                <div className="flex-1 text-white font-medium truncate">{item.name}</div>
                <div className="text-sm font-bold text-primary">{item.count} plays</div>
              </div>
            )) : <div className="text-white/50 text-sm">No artists played yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
