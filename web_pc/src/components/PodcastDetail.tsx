import React from 'react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useMusicContext } from './MusicContext';

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

export const PodcastDetail: React.FC<{ podcastId: string | null; onBack: () => void }> = ({ podcastId, onBack }) => {
  const [podcast, setPodcast] = React.useState<any | null>(null);
  const { play } = useMusicContext();

  const load = React.useCallback(async () => {
    if (!podcastId) return;
    const list = await (window as any).electronAPI?.podcastsGetAll?.();
    const p = Array.isArray(list) ? list.find((x: any) => x.id === podcastId) : null;
    setPodcast(p || null);
  }, [podcastId]);

  React.useEffect(() => { load(); }, [load]);

  const playEpisode = (ep: Episode) => {
    const src = ep.filePath || ep.audioUrl;
    const fakeTrack = { id: `pod-${ep.id}`, name: ep.title || 'Episode', artist: '', album: 'Podcast', duration: typeof ep.duration === 'number' ? ep.duration : 0, path: src, cover: podcast?.imagePath || null } as any;
    play(fakeTrack);
  };

  if (!podcastId) return (
    <div>
      <Button variant="ghost" onClick={onBack}>Back</Button>
      <div className="text-sm text-muted-foreground mt-4">Podcast not found</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-16 h-16 rounded overflow-hidden bg-muted">
            {podcast?.imagePath ? (
              <img src={podcast.imagePath} alt={podcast?.title} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{podcast?.title || 'Podcast'}</h1>
            <div className="text-sm text-muted-foreground">{podcast?.author || ''}</div>
          </div>
        </div>
        <Button variant="ghost" onClick={onBack}>Back</Button>
      </div>

      <ScrollArea className="h-[calc(100vh-260px)]">
        <div className="space-y-2">
          {podcast?.episodes?.map((ep: Episode) => (
            <Card key={ep.id}>
              <CardHeader>
                <CardTitle className="text-base">{ep.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">{ep.pubDate ? new Date(ep.pubDate).toLocaleString() : ''}</div>
                  <Button size="sm" onClick={() => playEpisode(ep)}>Play</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
