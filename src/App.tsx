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
    Plus,
    Radio as RadioIcon,
    Clock,
    Mic2,
    type LucideIcon,
} from 'lucide-react';
import { ScrollArea } from './components/ui/scroll-area';
import { AlbumsGrid } from './components/AlbumsGrid';
import { Podcasts } from './components/Podcasts';
import { PodcastDetail } from './components/PodcastDetail';
import { RadioPage } from './components/RadioPage';

type View = 'home' | 'search' | 'library' | 'playlists' | 'upload' | 'liked' | 'albums' | 'podcasts' | 'podcastDetail' | 'radio';

// ── Sidebar navigation definition ─────────────────────────────────────────
type NavItem = { id: View; label: string; icon: LucideIcon };

const NAV_PRIMARY: NavItem[] = [
    { id: 'home',    label: 'Home',         icon: Home     },
    { id: 'search',  label: 'Search',       icon: Search   },
    { id: 'library', label: 'Your Library', icon: Library  },
];

const NAV_COLLECTION: NavItem[] = [
    { id: 'liked',     label: 'Liked Songs', icon: Heart    },
    { id: 'playlists', label: 'Playlists',   icon: ListMusic},
    { id: 'albums',    label: 'Albums',      icon: Music    },
];

const NAV_DISCOVER: NavItem[] = [
    { id: 'radio',    label: 'Radio',    icon: RadioIcon },
    { id: 'podcasts', label: 'Podcasts', icon: Mic2      },
];

// ── Sidebar item component ─────────────────────────────────────────────────
const SidebarItem = ({
    item,
    active,
    onClick,
}: {
    item: NavItem;
    active: boolean;
    onClick: () => void;
}) => {
    const Icon = item.icon;
    return (
        <button
            className={`vl-sidebar-item${active ? ' is-active' : ''}`}
            onClick={onClick}
        >
            <Icon />
            <span>{item.label}</span>
        </button>
    );
};

// ── Main layout ─────────────────────────────────────────────────────────────
const MainLayout = ({ onUpload: _onUpload }: { onUpload: () => void }) => {
    const [currentView, setCurrentView]       = useState<View>('home');
    const [openedPodcastId, setOpenedPodcastId] = useState<string | null>(null);
    const [transitioning, setTransitioning]   = useState(false);
    const transitionTimeoutRef = useRef<number | null>(null);

    // ── Navigate ───────────────────────────────────────────────────────────
    const navigate = (next: View) => {
        if (next === currentView) return;
        setCurrentView(next);
        setTransitioning(true);
        if (transitionTimeoutRef.current) {
            window.clearTimeout(transitionTimeoutRef.current);
        }
        transitionTimeoutRef.current = window.setTimeout(() => {
            setTransitioning(false);
            transitionTimeoutRef.current = null;
        }, 420);
    };

    const handleEnterAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
        if (e.target !== e.currentTarget) return;
        setTransitioning(false);
        if (transitionTimeoutRef.current) {
            window.clearTimeout(transitionTimeoutRef.current);
            transitionTimeoutRef.current = null;
        }
    };

    // ── Render view ────────────────────────────────────────────────────────
    const renderView = (view: View) => {
        switch (view) {
            case 'home':
                return (
                    <div className="space-y-8">
                        {/* Quick access */}
                        <div>
                            <p className="vl-section-title">Quick access</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <button
                                    className="vl-quick-card card-tap-out-trigger"
                                    onClick={() => navigate('liked')}
                                >
                                    <div className="vl-quick-card-icon" style={{ background: 'linear-gradient(135deg, #32B8C6, #1A6873)' }}>
                                        <Heart className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="vl-quick-card-label">Liked Songs</span>
                                </button>
                                <button
                                    className="vl-quick-card"
                                    onClick={() => navigate('playlists')}
                                >
                                    <div className="vl-quick-card-icon" style={{ background: 'rgba(255,255,255,0.07)' }}>
                                        <ListMusic className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.6)' }} />
                                    </div>
                                    <span className="vl-quick-card-label">Playlists</span>
                                </button>
                                <button
                                    className="vl-quick-card"
                                    onClick={() => navigate('library')}
                                >
                                    <div className="vl-quick-card-icon" style={{ background: 'rgba(255,255,255,0.07)' }}>
                                        <Music className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.6)' }} />
                                    </div>
                                    <span className="vl-quick-card-label">Your Music</span>
                                </button>
                            </div>
                        </div>

                        {/* Albums */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <p className="vl-section-title">Albums</p>
                                <button
                                    className="vl-header-btn vl-header-btn--secondary text-xs px-3 py-1.5"
                                    onClick={() => navigate('albums')}
                                    style={{ fontSize: '12px', padding: '5px 12px' }}
                                >
                                    See all
                                </button>
                            </div>
                            <AlbumsGrid mode="recent" limit={4} />
                        </div>

                        {/* Recently played */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Clock className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
                                <p className="vl-section-title" style={{ marginBottom: 0 }}>Recently Played</p>
                            </div>
                            <TrackList showSearch={false} />
                        </div>
                    </div>
                );

            case 'search':
                return (
                    <div className="space-y-5">
                        <div>
                            <h1 className="vl-view-title">Search</h1>
                            <p className="vl-view-subtitle">Find your music</p>
                        </div>
                        <TrackList />
                    </div>
                );

            case 'library':
                return (
                    <div className="space-y-5">
                        <div>
                            <h1 className="vl-view-title">Your Library</h1>
                            <p className="vl-view-subtitle">All your music in one place</p>
                        </div>
                        <TrackList />
                    </div>
                );

            case 'playlists':
                return (
                    <div className="space-y-5">
                        <div>
                            <h1 className="vl-view-title">Playlists</h1>
                            <p className="vl-view-subtitle">Your curated collections</p>
                        </div>
                        <PlaylistManager />
                    </div>
                );

            case 'albums':
                return (
                    <div className="space-y-5">
                        <div>
                            <h1 className="vl-view-title">Albums</h1>
                            <p className="vl-view-subtitle">Browse your collection</p>
                        </div>
                        <AlbumsGrid mode="all" />
                    </div>
                );

            case 'radio':
                return (
                    <div className="space-y-5">
                        <div>
                            <h1 className="vl-view-title">Radio</h1>
                            <p className="vl-view-subtitle">Live stations from around the world</p>
                        </div>
                        <RadioPage />
                    </div>
                );

            case 'podcasts':
                return (
                    <div className="space-y-5">
                        <div>
                            <h1 className="vl-view-title">Podcasts</h1>
                            <p className="vl-view-subtitle">Discover and follow shows</p>
                        </div>
                        <Podcasts openPodcast={(id) => { setOpenedPodcastId(id); navigate('podcastDetail'); }} />
                    </div>
                );

            case 'podcastDetail':
                return (
                    <div className="space-y-5">
                        <PodcastDetail podcastId={openedPodcastId} onBack={() => navigate('podcasts')} />
                    </div>
                );

            case 'upload':
                return (
                    <div className="space-y-5">
                        <div>
                            <h1 className="vl-view-title">Add Music</h1>
                            <p className="vl-view-subtitle">Import files to your library</p>
                        </div>
                        <FileUpload />
                    </div>
                );

            case 'liked':
                return (
                    <div className="space-y-5">
                        <div className="flex items-center gap-5 pb-4">
                            <div
                                className="w-40 h-40 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #32B8C6, #1A6873)', boxShadow: '0 8px 32px rgba(50,184,198,0.30)' }}
                            >
                                <Heart className="h-16 w-16 text-white" strokeWidth={1.5} />
                            </div>
                            <div>
                                <p className="vl-view-subtitle" style={{ marginBottom: '6px' }}>Playlist</p>
                                <h1 style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, #A8EFEF 0%, #7DDDE8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    Liked Songs
                                </h1>
                                <p className="vl-view-subtitle">Your favorite tracks</p>
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

            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            <aside className="vl-sidebar">
                {/* Primary nav */}
                <nav>
                    {NAV_PRIMARY.map(item => (
                        <SidebarItem
                            key={item.id}
                            item={item}
                            active={currentView === item.id}
                            onClick={() => navigate(item.id)}
                        />
                    ))}
                </nav>

                <div className="vl-sidebar-divider" />

                <span className="vl-section-label">Collection</span>
                <nav>
                    {NAV_COLLECTION.map(item => (
                        <SidebarItem
                            key={item.id}
                            item={item}
                            active={currentView === item.id}
                            onClick={() => navigate(item.id)}
                        />
                    ))}
                </nav>

                <div className="vl-sidebar-divider" />

                <span className="vl-section-label">Discover</span>
                <nav>
                    {NAV_DISCOVER.map(item => (
                        <SidebarItem
                            key={item.id}
                            item={item}
                            active={currentView === item.id}
                            onClick={() => navigate(item.id)}
                        />
                    ))}
                </nav>

                {/* Footer */}
                <div className="vl-sidebar-footer">
                    <SidebarItem
                        item={{ id: 'upload', label: 'Upload Music', icon: Upload }}
                        active={currentView === 'upload'}
                        onClick={() => navigate('upload')}
                    />
                    <span className="vl-sidebar-version">Z Music v2.0</span>
                </div>
            </aside>

            {/* ── Main content ─────────────────────────────────────────────── */}
            <ScrollArea className="flex-1">
                <div
                    className="relative overflow-hidden contain-paint"
                    style={{ padding: '36px 44px' }}
                >
                    <div
                        className={`relative will-change-transform ${transitioning ? 'elevate-in-up' : ''}`}
                        onAnimationEnd={handleEnterAnimationEnd}
                    >
                        {renderView(currentView)}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
};

// ── App root ─────────────────────────────────────────────────────────────────
export default function App() {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <MusicProvider>
            <div
                className="h-screen flex flex-col text-foreground dark app-fade-in"
                style={{
                    background: '#0A0D0D',
                    backgroundImage: [
                        'radial-gradient(ellipse 90% 65% at 10% -10%, rgba(33,128,141,0.22) 0%, transparent 58%)',
                        'radial-gradient(ellipse 65% 55% at 92% 105%, rgba(26,104,115,0.16) 0%, transparent 55%)',
                        'radial-gradient(ellipse 45% 35% at 60% 15%, rgba(50,184,198,0.07) 0%, transparent 50%)',
                    ].join(', '),
                }}
            >
                {/* ── VL-style header (traffic lights + logo + search + actions) */}
                <div
                    className="vl-header"
                    style={{ WebkitAppRegion: 'drag' as any }}
                >
                    {/* Traffic lights (Titlebar) — inlined here */}
                    <div
                        className="flex items-center gap-[7px] flex-shrink-0"
                        style={{ WebkitAppRegion: 'no-drag' as any }}
                    >
                        <button
                            aria-label="Minimize"
                            onClick={() => (window as any).electronAPI?.minimizeWindow?.()}
                            className="h-3.5 w-3.5 rounded-full bg-[#28c840] hover:ring-2 hover:ring-[#28c840]/40 transition-shadow"
                        />
                        <button
                            aria-label="Toggle maximize"
                            onClick={() => (window as any).electronAPI?.toggleMaximizeWindow?.()}
                            className="h-3.5 w-3.5 rounded-full bg-[#ffbd2e] hover:ring-2 hover:ring-[#ffbd2e]/40 transition-shadow"
                        />
                        <button
                            aria-label="Close"
                            onClick={() => (window as any).electronAPI?.closeWindow?.()}
                            className="h-3.5 w-3.5 rounded-full bg-[#ff5f57] hover:ring-2 hover:ring-[#ff5f57]/40 transition-shadow"
                        />
                    </div>

                    {/* Logo */}
                    <div
                        className="flex items-center gap-3 flex-shrink-0"
                        style={{ WebkitAppRegion: 'no-drag' as any }}
                    >
                        <div className="vl-logo-icon-wrap">
                            {/* Music note icon */}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                            </svg>
                        </div>
                        <span className="vl-logo-text">Z Music</span>
                    </div>

                    {/* Search bar */}
                    <div className="vl-search">
                        <svg className="vl-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            className="vl-search-input"
                            placeholder="Search your library..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </div>

                    {/* Action buttons */}
                    <div
                        className="flex items-center gap-2 ml-auto flex-shrink-0"
                        style={{ WebkitAppRegion: 'no-drag' as any }}
                    >
                        <button
                            className="vl-header-btn vl-header-btn--primary"
                            onClick={() => {}}
                        >
                            <Plus />
                            <span>Add Music</span>
                        </button>
                    </div>
                </div>

                {/* ── Body: sidebar + content ──────────────────────────────── */}
                <div className="flex-1 flex overflow-hidden">
                    <MainLayout onUpload={() => {}} />
                </div>

                {/* ── Player bar ───────────────────────────────────────────── */}
                <div className="flex-shrink-0">
                    <MusicPlayer />
                </div>

                <Toaster />
            </div>
        </MusicProvider>
    );
}
