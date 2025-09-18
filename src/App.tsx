import { useState } from 'react';
import { Toaster } from './components/ui/sonner';
import { MusicProvider } from './components/MusicContext';
import { MusicPlayer } from './components/MusicPlayer';
import { FileUpload } from './components/FileUpload';
import { TrackList } from './components/TrackList';
import { PlaylistManager } from './components/PlaylistManager';
import {
    Music,
    Library,
    ListMusic,
    Upload,
    Home,
    Search,
    Heart,
    Plus
} from 'lucide-react';
import { Button } from './components/ui/button';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { AlbumsGrid } from './components/AlbumsGrid';
import { Podcasts } from './components/Podcasts';

type View = 'home' | 'search' | 'library' | 'playlists' | 'upload' | 'liked' | 'albums' | 'podcasts';

// Мы вынесли всю основную часть в отдельный компонент для чистоты верстки
const MainLayout = () => {
    const [currentView, setCurrentView] = useState<View>('home');

    const sidebarItems = [
        { id: 'home' as View, label: 'Home', icon: Home },
        { id: 'search' as View, label: 'Search', icon: Search },
        { id: 'library' as View, label: 'Your Library', icon: Library },
    ];

    const renderMainContent = () => {
        switch (currentView) {
            case 'home':
                return (
                    <div className="space-y-8">
                        <div>
                            <h1 className="text-3xl font-bold mb-6">Good evening</h1>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <Button
                                    variant="ghost"
                                    className="h-20 justify-start bg-gradient-to-br from-purple-700 to-purple-900 hover:from-purple-600 hover:to-purple-800 text-white"
                                    onClick={() => setCurrentView('liked')}
                                >
                                    <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-400 to-white mr-4 flex items-center justify-center">
                                        <Heart className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <span>Liked Songs</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="h-20 justify-start bg-card hover:bg-accent"
                                    onClick={() => setCurrentView('playlists')}
                                >
                                    <div className="w-12 h-12 rounded bg-muted mr-4 flex items-center justify-center">
                                        <ListMusic className="h-6 w-6" />
                                    </div>
                                    <span>Your Playlists</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="h-20 justify-start bg-card hover:bg-accent"
                                    onClick={() => setCurrentView('library')}
                                >
                                    <div className="w-12 h-12 rounded bg-muted mr-4 flex items-center justify-center">
                                        <Music className="h-6 w-6" />
                                    </div>
                                    <span>Your Music</span>
                                </Button>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold">Albums</h2>
                                <Button size="sm" variant="ghost" onClick={() => setCurrentView('albums')}>All</Button>
                            </div>
                            <AlbumsGrid mode="recent" limit={4} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-4">Recently Played</h2>
                            <TrackList showSearch={false} />
                        </div>
                    </div>
                );
            case 'search':
                return (
                    <div className="space-y-6">
                        <h1 className="text-3xl font-bold">Search</h1>
                        <TrackList />
                    </div>
                );
            case 'library':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-3xl font-bold">Your Library</h1>
                            <Button
                                size="sm"
                                onClick={() => setCurrentView('upload')}
                                className="bg-primary hover:bg-primary/90"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Music
                            </Button>
                        </div>
                        <TrackList />
                    </div>
                );
            case 'playlists':
                return <PlaylistManager />;
            case 'albums':
                return (
                    <div className="space-y-6">
                        <h1 className="text-3xl font-bold">Albums</h1>
                        <AlbumsGrid mode="all" />
                    </div>
                );
            case 'podcasts':
                return (
                    <div className="space-y-6">
                        <h1 className="text-3xl font-bold">Podcasts</h1>
                        <Podcasts />
                    </div>
                );
            case 'upload':
                return (
                    <div className="space-y-6">
                        <h1 className="text-3xl font-bold">Add Music</h1>
                        <FileUpload />
                    </div>
                );
            case 'liked':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center space-x-6 pb-6">
                            <div className="w-60 h-60 rounded bg-gradient-to-br from-purple-400 to-purple-700 flex items-center justify-center">
                                <Heart className="h-24 w-24 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Playlist</p>
                                <h1 className="text-5xl font-bold mb-4">Liked Songs</h1>
                                <p className="text-muted-foreground">Your favorite tracks</p>
                            </div>
                        </div>
                        <TrackList showSearch={false} />
                    </div>
                );
            default:
                return <TrackList />;
        }
    };

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-sidebar flex-shrink-0 flex flex-col border-r border-sidebar-border">
                <div className="p-6">
                    <div className="flex items-center space-x-2">
                        <span className="text-3xl font-extrabold text-primary leading-none select-none"> </span>
                        <span className="text-xl font-bold text-sidebar-foreground">Z Music</span>
                    </div>
                </div>
                <div className="px-3 mb-0">
                    <nav className="space-y-1">
                        {sidebarItems.map((item) => (
                            <Button
                                key={item.id}
                                variant="ghost"
                                className={`w-full justify-start h-10 text-sidebar-accent-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent ${
                                    currentView === item.id ? 'text-sidebar-foreground bg-sidebar-accent' : ''
                                }`}
                                onClick={() => setCurrentView(item.id)}
                            >
                                <item.icon className="mr-3 h-5 w-5" />
                                {item.label}
                            </Button>
                        ))}
                    </nav>
                </div>
                <div className="flex-1 px-3 pt-0 pb-6">
                    <div className="space-y-1">
                        <Button
                            variant="ghost"
                            className={`w-full justify-start h-10 text-sidebar-accent-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent ${
                                currentView === 'playlists' ? 'text-sidebar-foreground bg-sidebar-accent' : ''
                            }`}
                            onClick={() => setCurrentView('playlists')}
                        >
                            <ListMusic className="mr-3 h-5 w-5" />
                            Playlists
                        </Button>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start h-10 text-sidebar-accent-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent ${
                                currentView === 'liked' ? 'text-sidebar-foreground bg-sidebar-accent' : ''
                            }`}
                            onClick={() => setCurrentView('liked')}
                        >
                            <Heart className="mr-3 h-5 w-5" />
                            Liked Songs
                        </Button>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start h-10 text-sidebar-accent-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent ${
                                currentView === 'albums' ? 'text-sidebar-foreground bg-sidebar-accent' : ''
                            }`}
                            onClick={() => setCurrentView('albums')}
                        >
                            <Library className="mr-3 h-5 w-5" />
                            Albums
                        </Button>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start h-10 text-sidebar-accent-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent ${
                                currentView === 'podcasts' ? 'text-sidebar-foreground bg-sidebar-accent' : ''
                            }`}
                            onClick={() => setCurrentView('podcasts')}
                        >
                            <Library className="mr-3 h-5 w-5" />
                            Podcasts
                        </Button>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start h-10 text-sidebar-accent-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent ${
                                currentView === 'upload' ? 'text-sidebar-foreground bg-sidebar-accent' : ''
                            }`}
                            onClick={() => setCurrentView('upload')}
                        >
                            <Upload className="mr-3 h-5 w-5" />
                            Upload Music
                        </Button>
                    </div>
                </div>
            </div>

            {/* --- ГЛАВНОЕ ИЗМЕНЕНИЕ --- */}
            {/* Main Content */}
            {/* Мы убрали лишний div и вернули ScrollArea сюда */}
            <ScrollArea className="flex-1">
                <main className="p-8">
                    {renderMainContent()}
                </main>
            </ScrollArea>
        </div>
    );
};

export default function App() {
    return (
        <MusicProvider>
            <div className="h-screen flex flex-col bg-background text-foreground dark">
                {/* Этот div занимает все доступное место, КРОМЕ нижнего плеера */}
                <div className="flex-1 flex overflow-hidden">
                    <MainLayout />
                </div>

                {/* А этот div всегда будет зафиксирован внизу и никогда не скроется */}
                <div className="flex-shrink-0">
                    <MusicPlayer />
                </div>

                <Toaster />
            </div>
        </MusicProvider>
    );
}