import React, { useRef } from "react";
import { Upload, Music, FolderOpen } from "lucide-react";
import { Button } from "./ui/button";
import { useMusicContext } from "./MusicContext";
import { toast } from "sonner";

export const FileUpload: React.FC = () => {
  const { addTrack } = useMusicContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAudioFile = (file: File) => {
    if (file.type && file.type.startsWith("audio/")) return true;
    const name = file.name || "";
    const ext = name.split(".").pop()?.toLowerCase();
    return !!ext && ["mp3","wav","ogg","m4a","flac","aac"].includes(ext);
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;

    const audioFiles = Array.from(files).filter((file) => isAudioFile(file));

    if (audioFiles.length === 0) {
      toast.error("Please select valid audio files");
      return;
    }

    for (const file of audioFiles) {
      try {
        await addTrack(file);
        toast.success(`Added "${file.name}" to library`);
      } catch (error) {
        toast.error(`Failed to add "${file.name}"`);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleButtonClick = async () => {
    // В Electron предпочитаем системный диалог, чтобы получить абсолютные пути (персист сохранения)
    if (window.electronAPI?.selectFiles) {
      try {
        const paths = await window.electronAPI.selectFiles();
        if (!paths || paths.length === 0) {
          // если отменили — fallback на обычный input
          fileInputRef.current?.click();
          return;
        }
        for (const filePath of paths) {
          // создаём File-подобный объект только с path, чтобы addTrack взял абсолютный путь
          await addTrack({ path: filePath } as unknown as File);
        }
      } catch {
        fileInputRef.current?.click();
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
  };

  const handleDrop = async (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();

    const files = Array.from(event.dataTransfer.files).filter(
      (file) => isAudioFile(file),
    );

    if (files.length === 0) {
      toast.error("Please drop valid audio files");
      return;
    }

    for (const file of files) {
      try {
        await addTrack(file);
        toast.success(`Added "${file.name}" to library`);
      } catch (error) {
        toast.error(`Failed to add "${file.name}"`);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-12 text-center hover:border-primary/50 hover:bg-muted/20 transition-all cursor-pointer group"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-6">
          <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center group-hover:bg-primary/10 group-hover:scale-105 transition-all">
            <Upload className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>

          <div className="space-y-2">
            <h3>Drag and drop your music files here</h3>
            <p className="text-muted-foreground">
              or click to browse your files
            </p>
            <p className="text-muted-foreground text-sm">
              Supports MP3, WAV, OGG, and other audio formats
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <Button className="bg-primary hover:bg-primary/90" onClick={handleButtonClick}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Choose Files
            </Button>
            <span className="text-muted-foreground">or</span>
            <span className="text-muted-foreground">
              drag them here
            </span>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-8 p-6 bg-muted/30 rounded-xl">
        <div className="flex items-start space-x-3">
          <Music className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h4 className="text-sm font-medium mb-2">
              Tips for better organization:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • Make sure your audio files have proper
                metadata (artist, album, etc.)
              </li>
              <li>
                • Supported formats: MP3, WAV, OGG, M4A, FLAC
              </li>
              <li>
                • Files are stored locally in your browser
              </li>
              <li>
                • You can create playlists after uploading your
                music
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};