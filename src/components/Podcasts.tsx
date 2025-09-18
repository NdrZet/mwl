import React from 'react';
import { useMusicContext } from './MusicContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

type Episode = {
  id: string;
  title: string;
  audioUrl: string;
  pubDate: string | null;
  duration: string | number | null;
  descriptionHtml: string;
  imagePath: string | null;
  playedSeconds: number;
  isPlayed: boolean;
  filePath: string | null;
};

type Podcast = {
  id: string;
  title: string;
  author: string;
  description: string;
  imagePath: string | null;
  feedUrl: string;
  lastUpdated: number;
  episodes: Episode[];
};

export const Podcasts: React.FC<{ openPodcast?: (id: string) => void }> = ({ openPodcast }) => {
  const [feedUrl, setFeedUrl] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [podcasts, setPodcasts] = React.useState<Podcast[]>([]);
  const { play } = useMusicContext();

  const loadAll = React.useCallback(async () => {
    try {
      const list = await (window as any).electronAPI?.podcastsGetAll?.();
      if (Array.isArray(list)) setPodcasts(list as Podcast[]);
    } catch {}
  }, []);

  React.useEffect(() => { loadAll(); }, [loadAll]);

  const addByUrl = async () => {
    if (!feedUrl.trim()) return;
    setLoading(true);
    try {
      const res = await (window as any).electronAPI?.podcastsAddByUrl?.(feedUrl.trim());
      if (res?.ok) {
        setFeedUrl('');
        await loadAll();
      } else {
        console.error(res?.error || 'Failed to add podcast');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      await (window as any).electronAPI?.podcastsRefreshAll?.();
      await loadAll();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Paste RSS feed URL"
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
          className="text-black bg-white"
        />
        <Button onClick={addByUrl} disabled={loading}>Add podcast</Button>
        <Button variant="ghost" onClick={refreshAll} disabled={loading}>Refresh</Button>
      </div>

      <ScrollArea className="h-[calc(100vh-260px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {podcasts.map(p => (
            <Card key={p.id}>
              <CardHeader>
                <button className="flex items-center space-x-3 text-left w-full" onClick={() => openPodcast?.(p.id)}>
                  <div className="w-14 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                    {p.imagePath ? (
                      <img src={p.imagePath} alt={p.title} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{p.title}</CardTitle>
                    <div className="text-xs text-muted-foreground truncate">{p.author}</div>
                  </div>
                </button>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground line-clamp-3">
                  {p.description}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};


