import { useState, useRef } from 'react';
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
import { Titlebar } from './components/Titlebar';
import { PodcastDetail } from './components/PodcastDetail';

type View = 'home' | 'search' | 'library' | 'playlists' | 'upload' | 'liked' | 'albums' | 'podcasts' | 'podcastDetail';

// Мы вынесли всю основную часть в отдельный компонент для чистоты верстки
const MainLayout = () => {
    const [currentView, setCurrentView] = useState<View>('home');
    const [openedPodcastId, setOpenedPodcastId] = useState<string | null>(null);
    const [prevView, setPrevView] = useState<View | null>(null);
    const [transitioning, setTransitioning] = useState(false);
    const [direction, setDirection] = useState<'left' | 'right'>('right');
    const transitionTimeoutRef = useRef<number | null>(null);

    const sidebarItems = [
        { id: 'home' as View, label: 'Home', icon: Home },
        { id: 'search' as View, label: 'Search', icon: Search },
        { id: 'library' as View, label: 'Your Library', icon: Library },
    ];

    const viewsOrder: View[] = ['home', 'search', 'library', 'playlists', 'albums', 'podcasts', 'upload', 'liked', 'podcastDetail'];

    const navigate = (next: View) => {
        if (next === currentView) return;
        const currIdx = Math.max(0, viewsOrder.indexOf(currentView));
        const nextIdx = Math.max(0, viewsOrder.indexOf(next));
        setDirection(nextIdx > currIdx ? 'right' : 'left');
        setPrevView(currentView);
        setCurrentView(next);
        setTransitioning(true);
        if (transitionTimeoutRef.current) {
            window.clearTimeout(transitionTimeoutRef.current);
            transitionTimeoutRef.current = null;
        }
        transitionTimeoutRef.current = window.setTimeout(() => {
            setTransitioning(false);
            transitionTimeoutRef.current = null;
        }, 420);
    };

    const handleCardNavigate = (view: View, e: React.MouseEvent<HTMLButtonElement>) => {
        try {
            const el = e.currentTarget;
            el.classList.add('card-tap-out');
            window.setTimeout(() => {
                el.classList.remove('card-tap-out');
                navigate(view);
            }, 120);
        } catch {
            navigate(view);
        }
    };

    const handleEnterAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
        if (e.target !== e.currentTarget) return; // игнорируем дочерние анимации
        setTransitioning(false);
        if (transitionTimeoutRef.current) {
            window.clearTimeout(transitionTimeoutRef.current);
            transitionTimeoutRef.current = null;
        }
    };

    const renderView = (view: View) => {
        switch (view) {
            case 'home':
                return (
                    <div className="space-y-8">
                        <div>
                            <h1 className="text-3xl font-bold mb-6">Good evening</h1>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <Button
                                    variant="ghost"
                                    className="h-20 justify-start bg-gradient-to-br from-purple-700 to-purple-900 hover:from-purple-600 hover:to-purple-800 text-white transform-gpu transition-transform duration-150 hover:scale-[1.01] active:scale-[0.98]"
                                    onClick={(e) => handleCardNavigate('liked', e)}
                                >
                                    <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-400 to-white mr-4 flex items-center justify-center">
                                        <Heart className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <span>Liked Songs</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="h-20 justify-start bg-card hover:bg-accent transform-gpu transition-transform duration-150 hover:scale-[1.01] active:scale-[0.98]"
                                    onClick={(e) => handleCardNavigate('playlists', e)}
                                >
                                    <div className="w-12 h-12 rounded bg-muted mr-4 flex items-center justify-center">
                                        <ListMusic className="h-6 w-6" />
                                    </div>
                                    <span>Your Playlists</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="h-20 justify-start bg-card hover:bg-accent transform-gpu transition-transform duration-150 hover:scale-[1.01] active:scale-[0.98]"
                                    onClick={(e) => handleCardNavigate('library', e)}
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
                                <Button size="sm" variant="ghost" onClick={() => navigate('albums')}>All</Button>
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
                            <h1 className="text-3xl font-bold text-crisp">Your Library</h1>
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
                        <h1 className="text-3xl font-bold text-crisp">Albums</h1>
                        <AlbumsGrid mode="all" />
                    </div>
                );
            case 'podcasts':
                return (
                    <div className="space-y-6">
                        <h1 className="text-3xl font-bold text-crisp">Podcasts</h1>
                        <Podcasts openPodcast={(id) => { setOpenedPodcastId(id); navigate('podcastDetail'); }} />
                    </div>
                );
            case 'podcastDetail':
                return (
                    <div className="space-y-6">
                        <PodcastDetail podcastId={openedPodcastId} onBack={() => navigate('podcasts')} />
                    </div>
                );
            case 'upload':
                return (
                    <div className="space-y-6">
                        <h1 className="text-3xl font-bold text-crisp">Add Music</h1>
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
                                <h1 className="text-5xl font-bold mb-4 text-crisp">Liked Songs</h1>
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
                                className={`w-full justify-start h-10 text-sidebar-accent-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-transform ${
                                    currentView === item.id ? 'text-sidebar-foreground bg-sidebar-accent' : ''
                                }`}
                                onClick={() => navigate(item.id)}
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
                            className={`w-full justify-start h-10 text-sidebar-accent-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-transform ${
                                currentView === 'playlists' ? 'text-sidebar-foreground bg-sidebar-accent' : ''
                            }`}
                            onClick={() => navigate('playlists')}
                        >
                            <ListMusic className="mr-3 h-5 w-5" />
                            Playlists
                        </Button>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start h-10 text-sidebar-accent-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-transform ${
                                currentView === 'liked' ? 'text-sidebar-foreground bg-sidebar-accent' : ''
                            }`}
                            onClick={() => navigate('liked')}
                        >
                            <Heart className="mr-3 h-5 w-5" />
                            Liked Songs
                        </Button>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start h-10 text-sidebar-accent-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-transform ${
                                currentView === 'albums' ? 'text-sidebar-foreground bg-sidebar-accent' : ''
                            }`}
                            onClick={() => navigate('albums')}
                        >
                            <Library className="mr-3 h-5 w-5" />
                            Albums
                        </Button>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start h-10 text-sidebar-accent-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-transform ${
                                currentView === 'podcasts' ? 'text-sidebar-foreground bg-sidebar-accent' : ''
                            }`}
                            onClick={() => navigate('podcasts')}
                        >
                            <Library className="mr-3 h-5 w-5" />
                            Podcasts
                        </Button>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start h-10 text-sidebar-accent-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-transform ${
                                currentView === 'upload' ? 'text-sidebar-foreground bg-sidebar-accent' : ''
                            }`}
                            onClick={() => navigate('upload')}
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
                <div className="relative p-8 overflow-hidden contain-paint">
                    {/* Предыдущий экран (анимация выхода) */}
                    {/* Уходящий слой не анимируем – сразу убираем для производительности */}
                    {/* Текущий экран (анимация входа) */}
                    <div className={`relative will-change-transform ${transitioning ? 'elevate-in-up' : ''}`} onAnimationEnd={handleEnterAnimationEnd}>
                        {renderView(currentView)}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
};

export default function App() {
    return (
        <MusicProvider>
            <div className="h-screen flex flex-col bg-background text-foreground dark app-fade-in">
                <Titlebar />
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