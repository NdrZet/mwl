import React, { useState } from 'react';
import { Plus, Music, Trash2, Play, ListMusic } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { TrackList } from './TrackList';
import { useMusicContext } from './MusicContext';

export const PlaylistManager: React.FC = () => {
  const {
    playlists,
    tracks,
    createPlaylist,
    deletePlaylist,
    setQueue,
    play
  } = useMusicContext();

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreateDialogOpen(false);
    }
  };

  const handlePlayPlaylist = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist && playlist.tracks.length > 0) {
      const playlistTracks = playlist.tracks
        .map(trackId => tracks.find(t => t.id === trackId))
        .filter(track => track !== undefined);
      
      if (playlistTracks.length > 0) {
        setQueue(playlistTracks);
        play(playlistTracks[0]);
      }
    }
  };

  const getPlaylistTrackCount = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    return playlist ? playlist.tracks.length : 0;
  };

  const getPlaylistTracks = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return [];
    
    return playlist.tracks
      .map(trackId => tracks.find(t => t.id === trackId))
      .filter(track => track !== undefined);
  };

  const selectedPlaylistData = selectedPlaylist ? playlists.find(p => p.id === selectedPlaylist) : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-crisp">Your Playlists</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Playlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreatePlaylist();
                  }
                }}
                className="bg-muted border-0"
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim()}
                  className="bg-primary hover:bg-primary/90"
                >
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <ListMusic className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mb-2">Create your first playlist</h3>
          <p className="text-muted-foreground mb-6">
            It's easy, we'll help you
          </p>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            Create playlist
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {playlists.map((playlist) => (
            <Card 
              key={playlist.id} 
              className="bg-card/50 hover:bg-card transition-colors cursor-pointer group border-0"
              onClick={() => setSelectedPlaylist(playlist.id)}
            >
              <CardContent className="p-4">
                <div className="relative mb-4">
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                    <Music className="h-12 w-12 text-muted-foreground" />
                    {getPlaylistTrackCount(playlist.id) > 0 && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayPlaylist(playlist.id);
                        }}
                        className="absolute bottom-2 right-2 h-12 w-12 p-0 rounded-full bg-primary hover:bg-primary/90 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-lg"
                      >
                        <Play className="h-5 w-5 ml-0.5" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-medium truncate">{playlist.name}</h4>
                  <p className="text-muted-foreground text-sm">
                    {getPlaylistTrackCount(playlist.id)} songs
                  </p>
                </div>

                <div className="flex items-center justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Playlist</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{playlist.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deletePlaylist(playlist.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Playlist Detail Modal */}
      <Dialog open={!!selectedPlaylist} onOpenChange={() => setSelectedPlaylist(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                <Music className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2>{selectedPlaylistData?.name}</h2>
                <p className="text-muted-foreground text-sm">
                  {getPlaylistTrackCount(selectedPlaylist!)} songs
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {selectedPlaylist && (
              <TrackList
                tracks={getPlaylistTracks(selectedPlaylist)}
                showSearch={false}
                onPlayAll={() => setSelectedPlaylist(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};