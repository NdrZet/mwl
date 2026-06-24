import React, { useEffect, useState, useRef } from "react";
import { FolderPlus, FolderOpen, Music, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { useMusicContext } from "./MusicContext";
import { toast } from "sonner";

interface MusicFolder {
  path: string;
  count: number;
}

export const FileUpload: React.FC = () => {
  const { addTracks, addTrack, removeTracksByFolder, clearLibrary } = useMusicContext();
  const [folders, setFolders] = useState<MusicFolder[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  
  // Fallback for browser testing
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.electronAPI?.settingsGet) {
      window.electronAPI.settingsGet().then(settings => {
        if (settings && Array.isArray(settings.musicFolders)) {
          setFolders(settings.musicFolders);
        }
      });
    }
  }, []);

  const saveFoldersToSettings = async (newFolders: MusicFolder[]) => {
    if (window.electronAPI?.settingsGet && window.electronAPI?.settingsSet) {
      const settings = await window.electronAPI.settingsGet();
      await window.electronAPI.settingsSet({ ...settings, musicFolders: newFolders });
    }
  };

  const handleAddFolder = async () => {
    if (window.electronAPI?.selectFolders && window.electronAPI?.scanFolder) {
      try {
        const paths = await window.electronAPI.selectFolders();
        if (!paths || paths.length === 0) return;
        
        setIsScanning(true);
        let newFolders = [...folders];
        let totalFilesAdded = 0;
        
        for (const folderPath of paths) {
          if (newFolders.some(f => f.path === folderPath)) {
            toast.error(`Folder already added: ${folderPath}`);
            continue;
          }
          
          toast.loading(`Scanning ${folderPath}...`, { id: 'scan-toast' });
          const audioFiles = await window.electronAPI.scanFolder(folderPath);
          
          if (audioFiles.length > 0) {
            newFolders.push({ path: folderPath, count: audioFiles.length });
            await addTracks(audioFiles);
            totalFilesAdded += audioFiles.length;
          } else {
            toast.error(`No audio files found in ${folderPath}`, { id: 'scan-toast' });
          }
        }
        
        if (totalFilesAdded > 0) {
          setFolders(newFolders);
          await saveFoldersToSettings(newFolders);
          toast.success(`Successfully added ${totalFilesAdded} tracks`, { id: 'scan-toast' });
        } else {
          toast.dismiss('scan-toast');
        }
      } catch (e) {
        console.error('Failed to add folder', e);
        toast.error("An error occurred while adding the folder", { id: 'scan-toast' });
      } finally {
        setIsScanning(false);
      }
    } else {
      // Browser fallback
      fileInputRef.current?.click();
    }
  };

  const handleRemoveFolder = async (folderPath: string) => {
    const newFolders = folders.filter(f => f.path !== folderPath);
    setFolders(newFolders);
    await saveFoldersToSettings(newFolders);
    removeTracksByFolder(folderPath);
    toast.success("Folder removed from library");
  };

  // Browser fallback for selecting individual files
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const audioFiles = Array.from(files).filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return !!ext && ["mp3","wav","ogg","m4a","flac","aac"].includes(ext);
    });

    for (const file of audioFiles) {
      await addTrack(file);
    }
    toast.success(`Added ${audioFiles.length} files`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClearLibrary = async () => {
    if (confirm("Are you sure you want to completely clear the library? This will remove all old tracks and folders.")) {
      setFolders([]);
      await saveFoldersToSettings([]);
      clearLibrary();
      toast.success("Library has been cleared");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Music Library</h2>
          <p className="text-muted-foreground">Manage folders scanned for audio tracks</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleClearLibrary} disabled={isScanning} variant="destructive" className="shadow-lg transition-all active:scale-95">
            <Trash2 className="mr-2 h-5 w-5" />
            Clear Library
          </Button>
          <Button onClick={handleAddFolder} disabled={isScanning} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95">
            <FolderPlus className="mr-2 h-5 w-5" />
            Add Folder
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {folders.length === 0 ? (
        <div className="border-2 border-dashed border-white/10 rounded-2xl p-16 text-center bg-white/5 flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <FolderOpen className="h-12 w-12 text-primary/80" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-white/90">No Folders Added</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Add a folder from your computer. The app will automatically scan it and add any audio files to your library.
          </p>
          <Button onClick={handleAddFolder} disabled={isScanning} variant="outline" className="border-white/10 hover:bg-white/10">
            <FolderPlus className="mr-2 h-4 w-4" />
            Add First Folder
          </Button>
        </div>
      ) : (
        <div className="folders-grid">
          {folders.map((folder, i) => (
            <div key={i} className="folder-card">
              <div className="folder-card-body">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  <div className="folder-card-name" title={folder.path}>
                    {folder.path.split(/[/\\]/).filter(Boolean).pop() || folder.path}
                  </div>
                </div>
                <div className="folder-card-path mt-1" title={folder.path}>
                  {folder.path}
                </div>
              </div>
              <div className="folder-card-footer">
                <span className="folder-card-count flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 opacity-70" />
                  {folder.count} tracks
                </span>
                <button 
                  className="folder-card-remove flex items-center gap-1"
                  onClick={() => handleRemoveFolder(folder.path)}
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};