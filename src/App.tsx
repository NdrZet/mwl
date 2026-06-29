import React, { useState, useRef, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { MusicProvider, useMusicContext } from './components/MusicContext';
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
    BarChart2,
    Settings as SettingsIcon,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { ScrollArea } from './components/ui/scroll-area';
import { AlbumsGrid } from './components/AlbumsGrid';
import { ArtistsGrid, type ArtistInfo } from './components/ArtistsGrid';
import { ArtistDetail } from './components/ArtistDetail';
import { Podcasts } from './components/Podcasts';
import { PodcastDetail } from './components/PodcastDetail';
import { RadioPage } from './components/RadioPage';
import { AlbumDetail } from './components/AlbumDetail';
import { type AlbumInfo } from './components/AlbumsGrid';
import { Settings } from './components/Settings';
import { Stats } from './components/Stats';

type View = 'home' | 'search' | 'library' | 'playlists' | 'upload' | 'liked' | 'albums' | 'albumDetail' | 'artists' | 'artistDetail' | 'podcasts' | 'podcastDetail' | 'radio' | 'settings' | 'stats';

// ── Sidebar navigation definition ─────────────────────────────────────────
type NavItem = { id: View; label: string; icon: LucideIcon };

const NAV_PRIMARY: NavItem[] = [
    { id: 'home',    label: 'Home',         icon: Home    },
    { id: 'search',  label: 'Search',       icon: Search  },
    { id: 'library', label: 'Library',      icon: Library },
];
const NAV_COLLECTION: NavItem[] = [
    { id: 'liked',     label: 'Liked',       icon: Heart     },
    { id: 'playlists', label: 'Playlists',   icon: ListMusic },
    { id: 'albums',    label: 'Albums',      icon: Music     },
    { id: 'artists',   label: 'Artists',     icon: Users     },
];
const NAV_DISCOVER: NavItem[] = [
    { id: 'radio',    label: 'Radio',    icon: RadioIcon },
    { id: 'podcasts', label: 'Podcasts', icon: Mic2      },
];

// ── Sidebar item ───────────────────────────────────────────────────────────
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
        <button className={`vl-sidebar-item${active ? ' is-active' : ''}`} onClick={onClick}>
            <Icon />
            <span>{item.label}</span>
        </button>
    );
};

// ── Main layout (pure presenter: получает navigate/currentView сверху) ─────
interface MainLayoutProps {
    currentView: View;
    displayView: View;
    navigate: (v: View) => void;
    openedPodcastId: string | null;
    setOpenedPodcastId: (id: string | null) => void;
    openedAlbum: AlbumInfo | null;
    setOpenedAlbum: (album: AlbumInfo | null) => void;
    openedArtist: ArtistInfo | null;
    setOpenedArtist: (artist: ArtistInfo | null) => void;
    transitioning: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({
    currentView,
    displayView,
    navigate,
    openedPodcastId,
    setOpenedPodcastId,
    openedAlbum,
    setOpenedAlbum,
    openedArtist,
    setOpenedArtist,
    transitioning,
}) => {

    const { tracks } = useMusicContext();

    useEffect(() => {
        const viewport = document.querySelector('[data-slot="scroll-area-viewport"]');
        if (viewport) {
            viewport.scrollTo(0, 0);
        }
    }, [displayView, openedPodcastId, openedAlbum, openedArtist]);

    const renderView = (view: View) => {
        switch (view) {
            case 'home':
                return (
                    <div className="space-y-8">
                        <div>
                            <p className="vl-section-title">Quick access</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <button className="vl-quick-card" onClick={() => navigate('liked')}>
                                    <div className="vl-quick-card-icon" style={{ background: 'linear-gradient(135deg,#32B8C6,#1A6873)' }}>
                                        <Heart className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="vl-quick-card-label">Liked</span>
                                </button>
                                <button className="vl-quick-card" onClick={() => navigate('playlists')}>
                                    <div className="vl-quick-card-icon" style={{ background: 'rgba(255,255,255,0.07)' }}>
                                        <ListMusic className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.6)' }} />
                                    </div>
                                    <span className="vl-quick-card-label">Playlists</span>
                                </button>
                                <button className="vl-quick-card" onClick={() => navigate('library')}>
                                    <div className="vl-quick-card-icon" style={{ background: 'rgba(255,255,255,0.07)' }}>
                                        <Music className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.6)' }} />
                                    </div>
                                    <span className="vl-quick-card-label">Library</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <p className="vl-section-title">Albums</p>
                                <button
                                    className="vl-header-btn vl-header-btn--secondary"
                                    style={{ fontSize: '12px', padding: '5px 12px' }}
                                    onClick={() => navigate('albums')}
                                >
                                    See all
                                </button>
                            </div>
                            <AlbumsGrid mode="recent" limit={4} onAlbumClick={(album) => { setOpenedAlbum(album); navigate('albumDetail'); }} />
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Clock className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
                                <p className="vl-section-title" style={{ marginBottom: 0 }}>Recently Played</p>
                            </div>
                            <TrackList showSearch={false} disableScroll={true} tracks={tracks.filter(t => t.lastPlayedAt).sort((a, b) => b.lastPlayedAt! - a.lastPlayedAt!).slice(0, 50)} />
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
                        <TrackList disableScroll={true} />
                    </div>
                );

            case 'library':
                return (
                    <div className="space-y-5">
                        <div>
                            <h1 className="vl-view-title">Library</h1>
                            <p className="vl-view-subtitle">All your music in one place</p>
                        </div>
                        <TrackList disableScroll={true} />
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
                        <AlbumsGrid mode="all" onAlbumClick={(album) => { setOpenedAlbum(album); navigate('albumDetail'); }} />
                    </div>
                );

            case 'albumDetail':
                return (
                    <div className="space-y-5">
                        <AlbumDetail 
                            album={openedAlbum} 
                            onBack={() => navigate('albums')} 
                            onArtistClick={(artistName) => {
                                const artistTracks = tracks.filter(t => t.artist?.toLowerCase().includes(artistName.toLowerCase()));
                                setOpenedArtist({
                                    name: artistName,
                                    cover: artistTracks[0]?.cover || null,
                                    tracks: artistTracks
                                });
                                navigate('artistDetail');
                            }}
                        />
                    </div>
                );

            case 'artists':
                return (
                    <div className="space-y-5">
                        <div>
                            <h1 className="vl-view-title">Artists</h1>
                            <p className="vl-view-subtitle">Browse your collection by artist</p>
                        </div>
                        <ArtistsGrid mode="all" onArtistClick={(artist) => { setOpenedArtist(artist); navigate('artistDetail'); }} />
                    </div>
                );

            case 'artistDetail':
                return (
                    <div className="space-y-5">
                        <ArtistDetail 
                            artist={openedArtist} 
                            onBack={() => navigate('artists')} 
                            onAlbumClick={(album) => { setOpenedAlbum(album); navigate('albumDetail'); }} 
                        />
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
                                style={{ background: 'linear-gradient(135deg,#32B8C6,#1A6873)', boxShadow: '0 8px 32px rgba(50,184,198,0.30)' }}
                            >
                                <Heart className="h-16 w-16 text-white" strokeWidth={1.5} />
                            </div>
                            <div>
                                <p className="vl-view-subtitle" style={{ marginBottom: '6px' }}>Playlist</p>
                                <h1 style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-0.04em', background: 'linear-gradient(135deg,#A8EFEF 0%,#7DDDE8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    Liked
                                </h1>
                                <p className="vl-view-subtitle">Your favorite tracks</p>
                            </div>
                        </div>
                        <TrackList showSearch={false} disableScroll={true} tracks={tracks.filter(t => t.isLiked)} />
                    </div>
                );

            case 'settings':
                return <Settings />;
                
            case 'stats':
                return <Stats />;

            default:
                return <TrackList disableScroll={true} />;
        }
    };

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <aside className="vl-sidebar">
                <nav>
                    {NAV_PRIMARY.map(item => (
                        <SidebarItem key={item.id} item={item} active={currentView === item.id} onClick={() => navigate(item.id)} />
                    ))}
                </nav>

                <div className="vl-sidebar-divider" />
                <span className="vl-section-label">Collection</span>
                <nav>
                    {NAV_COLLECTION.map(item => (
                        <SidebarItem key={item.id} item={item} active={currentView === item.id} onClick={() => navigate(item.id)} />
                    ))}
                </nav>

                <div className="vl-sidebar-divider" />
                <span className="vl-section-label">Discover</span>
                <nav>
                    {NAV_DISCOVER.map(item => (
                        <SidebarItem key={item.id} item={item} active={currentView === item.id} onClick={() => navigate(item.id)} />
                    ))}
                </nav>

                <div className="vl-sidebar-footer flex flex-col gap-1">
                    <SidebarItem
                        item={{ id: 'upload', label: 'Upload Music', icon: Upload }}
                        active={currentView === 'upload'}
                        onClick={() => navigate('upload')}
                    />
                    <SidebarItem
                        item={{ id: 'stats', label: 'Listening Stats', icon: BarChart2 }}
                        active={currentView === 'stats'}
                        onClick={() => navigate('stats')}
                    />
                    <SidebarItem
                        item={{ id: 'settings', label: 'Settings', icon: SettingsIcon }}
                        active={currentView === 'settings'}
                        onClick={() => navigate('settings')}
                    />
                    <div className="mt-2 text-center">
                        <span className="vl-sidebar-version">Omni Project v3.0</span>
                    </div>
                </div>
            </aside>

            {/* ── Content ─────────────────────────────────────────────────── */}
            <ScrollArea className="flex-1">
                <div className="relative overflow-hidden contain-paint" style={{ padding: '36px 44px' }}>
                    <div
                        className={`relative will-change-transform transition-all duration-150 ease-in-out ${transitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
                    >
                        {renderView(displayView)}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
};

// ── App root ──────────────────────────────────────────────────────────────
export default function App() {
    const [currentView, setCurrentView]             = useState<View>('home');
    const [displayView, setDisplayView]             = useState<View>('home');
    const [openedPodcastId, setOpenedPodcastId]     = useState<string | null>(null);
    const [openedAlbum, setOpenedAlbum]             = useState<AlbumInfo | null>(null);
    const [openedArtist, setOpenedArtist] = useState<ArtistInfo | null>(null);
    const [transitioning, setTransitioning]         = useState(false);
    const transitionTimeoutRef                      = useRef<number | null>(null);

    const navigate = (next: View) => {
        if (next === currentView) return;
        setCurrentView(next);
        setTransitioning(true);
        if (transitionTimeoutRef.current) window.clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = window.setTimeout(() => {
            setDisplayView(next);
            setTransitioning(false);
            transitionTimeoutRef.current = null;
        }, 150);
    };

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
                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="vl-header" style={{ WebkitAppRegion: 'drag' as any }}>
                    {/* Traffic lights */}
                    <div className="flex items-center gap-[7px] flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' as any }}>
                        <button aria-label="Minimize"        onClick={() => (window as any).electronAPI?.minimizeWindow?.()}       className="h-3.5 w-3.5 rounded-full bg-[#28c840] hover:ring-2 hover:ring-[#28c840]/40 transition-shadow" />
                        <button aria-label="Toggle maximize" onClick={() => (window as any).electronAPI?.toggleMaximizeWindow?.()} className="h-3.5 w-3.5 rounded-full bg-[#ffbd2e] hover:ring-2 hover:ring-[#ffbd2e]/40 transition-shadow" />
                        <button aria-label="Close"           onClick={() => (window as any).electronAPI?.closeWindow?.()}          className="h-3.5 w-3.5 rounded-full bg-[#ff5f57] hover:ring-2 hover:ring-[#ff5f57]/40 transition-shadow" />
                    </div>

                    {/* Logo */}
                    <div className="flex items-center gap-3 flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' as any }}>
                        <span className="vl-logo-text">Omni Project</span>
                    </div>

                    {/* Search — кнопка-переход, текст вводится внутри страницы Search */}
                    <button
                        className="vl-search"
                        style={{ cursor: 'text' }}
                        onClick={() => navigate('search')}
                    >
                        <svg className="vl-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <span className="vl-search-input" style={{ pointerEvents: 'none' }}>
                            {currentView === 'search' ? 'Searching…' : 'Search your library...'}
                        </span>
                    </button>

                    {/* Add Music — теперь реально работает */}
                    <div className="flex items-center gap-2 ml-auto flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' as any }}>
                        <button className="vl-header-btn vl-header-btn--primary" onClick={() => navigate('upload')}>
                            <Plus />
                            <span>Add Music</span>
                        </button>
                    </div>
                </div>

                {/* ── Body ────────────────────────────────────────────────── */}
                <div className="flex-1 flex overflow-hidden">
                    <MainLayout
                        currentView={currentView}
                        displayView={displayView}
                        navigate={navigate}
                        openedPodcastId={openedPodcastId}
                        setOpenedPodcastId={setOpenedPodcastId}
                        openedAlbum={openedAlbum}
                        setOpenedAlbum={setOpenedAlbum}
                        openedArtist={openedArtist}
                        setOpenedArtist={setOpenedArtist}
                        transitioning={transitioning}
                    />
                </div>

                {/* ── Player ──────────────────────────────────────────────── */}
                <div className="flex-shrink-0">
                    <MusicPlayer />
                </div>

                <Toaster />
            </div>
        </MusicProvider>
    );
}
