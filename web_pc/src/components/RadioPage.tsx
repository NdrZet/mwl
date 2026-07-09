import React, { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Play, Trash2, Radio } from 'lucide-react';
import { useMusicContext } from './MusicContext';

export const RadioPage: React.FC = () => {
  const { radioStations, addRadioStation, removeRadioStation, playRadioStation } = useMusicContext();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const canAdd = useMemo(() => {
    if (!name.trim() || !url.trim()) return false;
    try { new URL(url); } catch { return false; }
    return /^https?:\/\//i.test(url.trim());
  }, [name, url]);

  const onAdd = () => {
    if (!canAdd) return;
    addRadioStation({ name: name.trim(), url: url.trim(), image: undefined });
    setName('');
    setUrl('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Station</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
            <Input placeholder="Stream URL (http/https)" value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1" />
            <Button onClick={onAdd} disabled={!canAdd} className="bg-primary hover:bg-primary/90">Add</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {radioStations.length === 0 && (
          <div className="col-span-full text-muted-foreground">No stations yet. Add a stream URL above.</div>
        )}
        {radioStations.map((s) => (
          <Card key={s.id} className="overflow-hidden group">
            <CardContent className="p-0">
              <div className="flex items-center p-4">
                <div className="w-14 h-14 rounded bg-muted flex items-center justify-center mr-4 overflow-hidden">
                  {s.image ? (
                    <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
                  ) : (
                    <Radio className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.name}</div>
                  <div className="truncate text-sm text-muted-foreground">{s.url}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="h-8" onClick={() => playRadioStation(s.id)}>
                    <Play className="h-4 w-4 mr-1" /> Play
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeRadioStation(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};



