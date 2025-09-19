const { app, BrowserWindow, Menu, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const musicMetadata = require('music-metadata');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
let RSSParser = null; // инициализируем позже, если понадобится

// Путь к файлу, где будут храниться треки. Он создастся в папке с данными приложения (например, AppData).
const userDataPath = app.getPath('userData');
const tracksFilePath = path.join(userDataPath, 'tracks.json');
// Подкасты: директории и файл хранения
const podcastsDir = path.join(userDataPath, 'podcasts');
const podcastsImagesDir = path.join(podcastsDir, 'images');
const podcastsAudioDir = path.join(podcastsDir, 'audio');
const podcastsFilePath = path.join(podcastsDir, 'podcasts.json');

function ensurePodcastDirs() {
    try {
        if (!fs.existsSync(podcastsDir)) fs.mkdirSync(podcastsDir, { recursive: true });
        if (!fs.existsSync(podcastsImagesDir)) fs.mkdirSync(podcastsImagesDir, { recursive: true });
        if (!fs.existsSync(podcastsAudioDir)) fs.mkdirSync(podcastsAudioDir, { recursive: true });
    } catch {}
}

function loadPodcastsSafe() {
    try {
        ensurePodcastDirs();
        if (fs.existsSync(podcastsFilePath)) {
            const raw = fs.readFileSync(podcastsFilePath, 'utf8');
            const data = JSON.parse(raw);
            if (Array.isArray(data)) return data;
        }
    } catch (e) {
        console.error('Failed to load podcasts:', e);
    }
    return [];
}

function savePodcastsSafe(podcasts) {
    try {
        ensurePodcastDirs();
        fs.writeFileSync(podcastsFilePath, JSON.stringify(podcasts, null, 2));
    } catch (e) {
        console.error('Failed to save podcasts:', e);
    }
}

function fetchBuffer(urlStr) {
    return new Promise((resolve) => {
        try {
            const mod = urlStr.startsWith('https') ? https : http;
            const req = mod.get(urlStr, (res) => {
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    // redirect
                    fetchBuffer(res.headers.location).then(resolve).catch(() => resolve(null));
                    return;
                }
                if (res.statusCode !== 200) { resolve(null); return; }
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => {
                    try { resolve(Buffer.concat(chunks)); } catch { resolve(null); }
                });
            });
            req.on('error', () => resolve(null));
            req.setTimeout(15000, () => { try { req.destroy(); } catch {}; resolve(null); });
        } catch { resolve(null); }
    });
}

function saveImageBufferToCache(buf) {
    try {
        ensurePodcastDirs();
        const png = resizeToPng(buf, 1024) || buf;
        const hash = crypto.createHash('md5').update(png).digest('hex');
        const file = path.join(podcastsImagesDir, `${hash}.png`);
        if (!fs.existsSync(file)) fs.writeFileSync(file, png);
        return `file:///${file.replace(/\\/g,'/')}`;
    } catch {}
    return null;
}

async function cacheImageFromUrlMaybe(urlStr) {
    try {
        if (!urlStr) return null;
        const buf = await fetchBuffer(urlStr);
        if (!buf) return null;
        return saveImageBufferToCache(buf);
    } catch { return null; }
}

function createWindow() {
    // Убираем стандартное меню (File, Edit, etc.)
    Menu.setApplicationMenu(null);

    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "Z Музыка", // Твое кастомное название
        // Путь к иконке. Он будет работать в готовом приложении.
        icon: path.join(__dirname, 'dist', 'icon.ico'),
        frame: false, // кастомный заголовок
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
        show: false, // покажем после готовности, чтобы анимировать появление
        webPreferences: {
            // Указываем наш "мост" для связи с React
            preload: path.join(__dirname, 'preload.js'),

            // Ключевые настройки для работы всего
            nodeIntegration: false, // Безопасность
            contextIsolation: true, // Безопасность и работа preload
            webSecurity: false, // Разрешаем загрузку локальных файлов (наша главная проблема)
        },
    });

    // Используем надежный способ формирования URL
    const startUrl = url.format({
        pathname: path.join(__dirname, 'dist', 'index.html'),
        protocol: 'file:',
        slashes: true
    });

    mainWindow.loadURL(startUrl);

    // Плавное появление окна после готовности
    try {
        mainWindow.setOpacity(0);
    } catch {}
    mainWindow.once('ready-to-show', () => {
        try { mainWindow.show(); } catch {}
        // простая анимация до полной непрозрачности ~200-250мс
        let current = 0;
        const step = 0.08; // 12-13 шагов * 16мс ≈ 200мс
        const timer = setInterval(() => {
            try {
                current = Math.min(1, current + step);
                mainWindow.setOpacity(current);
                if (current >= 1) clearInterval(timer);
            } catch {
                clearInterval(timer);
            }
        }, 16);
    });

    // Прокидываем события изменения состояния окна в рендерер
    mainWindow.on('maximize', () => {
        try { mainWindow.webContents.send('window:maximized'); } catch {}
    });
    mainWindow.on('unmaximize', () => {
        try { mainWindow.webContents.send('window:unmaximized'); } catch {}
    });

    // DevTools можно открыть вручную (F12), авто-открытие отключено
    // mainWindow.webContents.openDevTools();
}

// --- НАША "СЕРВЕРНАЯ" ЛОГИКА ---
// Она слушает команды, которые приходят из React через preload.js

// Команда "Загрузи треки"
ipcMain.handle('load-tracks', () => {
    try {
        if (fs.existsSync(tracksFilePath)) {
            const data = fs.readFileSync(tracksFilePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Failed to load tracks:', error);
    }
    return []; // Если файла нет или он сломан, возвращаем пустой массив
});

// Команда "Сохрани треки"
ipcMain.on('save-tracks', (event, tracks) => {
    try {
        fs.writeFileSync(tracksFilePath, JSON.stringify(tracks, null, 2));
    } catch (error) {
        console.error('Failed to save tracks:', error);
    }
});

// Команда "Выбери файлы" для получения абсолютных путей (персист сохранения)
ipcMain.handle('select-files', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Audio Files', extensions: ['mp3','wav','ogg','m4a','flac','aac'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    if (result.canceled) return [];
    return result.filePaths;
});

// Команда "Получи метаданные"
ipcMain.handle('get-metadata', async (event, filePath) => {
    try {
        // откат: всегда предполагаем реальный путь
        const metadata = await musicMetadata.parseFile(filePath);
        const { common } = metadata;
        let cover = null;
        if (common.picture && common.picture.length > 0) {
            const picture = common.picture[0];
            // Определяем корректный mime-тип, если не задан
            let mimeType = picture.format;
            if (!mimeType || !String(mimeType).startsWith('image/')) {
                const header = picture.data.toString('hex', 0, 4).toUpperCase();
                if (header.startsWith('FFD8')) mimeType = 'image/jpeg';
                else if (header.startsWith('8950')) mimeType = 'image/png';
                else if (header.startsWith('4749')) mimeType = 'image/gif';
                else mimeType = 'image/jpeg';
            }
            // Возвращаем data: URI как раньше
            cover = `data:${mimeType};base64,${picture.data.toString('base64')}`;
        }

        // Лучшие попытки получить корректные поля
        const title = common.title || common.originalTitle || path.basename(filePath, path.extname(filePath));
        const artist = common.artist || (Array.isArray(common.artists) ? common.artists[0] : undefined) || common.albumartist || 'Unknown Artist';
        const album = common.album || common.originalAlbum || 'Unknown Album';
        const duration = metadata?.format?.duration || 0;

        return {
            title,
            artist,
            album,
            duration,
            cover,
        };
    } catch (error) {
        console.error(`Failed to get metadata for: ${filePath}`, error);
        return {
            title: path.basename(filePath),
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            duration: 0,
            cover: null
        };
    }
});

// --- КЕШ МИНИАТЮР ОБЛОЖЕК ---
const coversDir = path.join(userDataPath, 'covers');
function ensureCoversDir() {
    try { if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true }); } catch {}
}

async function tryEmbeddedCover(filePath) {
    try {
        const metadata = await musicMetadata.parseFile(filePath);
        const pic = metadata?.common?.picture?.[0];
        if (pic && pic.data) return Buffer.from(pic.data);
    } catch {}
    return null;
}

function tryFolderCoverSync(audioPath) {
    try {
        const dir = path.dirname(audioPath);
        const candidates = ['cover.jpg','cover.png','folder.jpg','folder.png','front.jpg','front.png'];
        for (const name of candidates) {
            const full = path.join(dir, name);
            if (fs.existsSync(full)) return fs.readFileSync(full);
        }
    } catch {}
    return null;
}

function resizeToPng(buffer, size = 1024) {
    try {
        const img = nativeImage.createFromBuffer(buffer);
        if (img.isEmpty()) return null;
        const resized = img.resize({ width: size, height: size, quality: 'best' });
        const out = resized.toPNG();
        return out && out.length ? out : null;
    } catch {}
    return null;
}

function sniffExt(buffer) {
    try {
        const head = buffer.slice(0, 4).toString('hex').toUpperCase();
        if (head.startsWith('89504E47')) return '.png';
        if (head.startsWith('FFD8')) return '.jpg';
        if (head.startsWith('47494638')) return '.gif';
    } catch {}
    return '.jpg';
}

function writeCover(buffer, ext) {
    try {
        ensureCoversDir();
        const hash = crypto.createHash('md5').update(buffer).digest('hex');
        const file = path.join(coversDir, `${hash}${ext}`);
        if (!fs.existsSync(file)) fs.writeFileSync(file, buffer);
        return `file:///${file.replace(/\\/g,'/')}`;
    } catch {}
    return null;
}

async function ensureCoverPath(filePath) {
    let buf = await tryEmbeddedCover(filePath);
    if (!buf) buf = tryFolderCoverSync(filePath);
    if (!buf) return null;
    // Сначала пробуем сконвертировать в PNG-миниатюру 256x256
    const png = resizeToPng(buf, 1024);
    if (png) return writeCover(png, '.png');
    // Если конверсия не удалась, сохраняем исходник с корректным расширением
    const ext = sniffExt(buf);
    return writeCover(buf, ext);
}

// Вернём file:// путь к миниатюре обложки (создаст при необходимости)
ipcMain.handle('get-cover-path', async (event, filePath) => {
    try {
        if (!filePath || typeof filePath !== 'string') return null;
        return await ensureCoverPath(filePath);
    } catch {
        return null;
    }
});

// --- Управление окном (для кастомного заголовка) ---
ipcMain.handle('window:isMaximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    try { return !!win?.isMaximized(); } catch { return false; }
});
ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    try { win?.minimize(); } catch {}
});
ipcMain.on('window:toggleMaximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    try {
        if (!win) return;
        if (win.isMaximized()) win.unmaximize(); else win.maximize();
    } catch {}
});
ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    try { win?.close(); } catch {}
});

// --- PODCASTS IPC ---
ipcMain.handle('podcasts:getAll', () => {
    try {
        return loadPodcastsSafe();
    } catch { return []; }
});

ipcMain.handle('podcasts:addByUrl', async (event, feedUrl) => {
    try {
        ensurePodcastDirs();
        if (!RSSParser) {
            try { RSSParser = require('rss-parser'); } catch (e) { console.error('rss-parser not installed'); return { ok: false, error: 'rss-parser not installed' }; }
        }
        const parser = new RSSParser({ timeout: 15000 });
        const feed = await parser.parseURL(feedUrl);
        const podcasts = loadPodcastsSafe();

        const podcastId = crypto.createHash('md5').update(feed.feedUrl || feedUrl).digest('hex');
        // Обложка подкаста
        const imageUrl = (feed.itunes && feed.itunes.image) || feed.image?.url || null;
        const imagePath = imageUrl ? await cacheImageFromUrlMaybe(imageUrl) : null;

        const existingIndex = podcasts.findIndex(p => p.id === podcastId);
        const basePodcast = {
            id: podcastId,
            title: feed.title || 'Podcast',
            author: feed.itunes?.author || feed.managingEditor || feed.creator || '',
            description: feed.description || '',
            imagePath,
            feedUrl,
            lastUpdated: Date.now(),
            episodes: []
        };

        const episodes = (feed.items || []).map((item) => {
            const enclosureUrl = item.enclosure?.url || item.link || '';
            return {
                id: crypto.createHash('md5').update((item.guid || item.id || item.link || item.title || enclosureUrl) + feedUrl).digest('hex'),
                title: item.title || 'Episode',
                audioUrl: enclosureUrl,
                pubDate: item.isoDate || item.pubDate || null,
                duration: item.itunes?.duration || null,
                descriptionHtml: item['content:encoded'] || item.content || '',
                imagePath: imagePath, // можно уточнить per-item
                playedSeconds: 0,
                isPlayed: false,
                filePath: null,
            };
        });

        if (existingIndex >= 0) {
            // Мержим: добавляем новые эпизоды, сохраняем старые состояния
            const existing = podcasts[existingIndex];
            const existingMap = new Map(existing.episodes.map(e => [e.id, e]));
            const mergedEpisodes = [];
            for (const ep of episodes) {
                const old = existingMap.get(ep.id);
                if (old) {
                    mergedEpisodes.push({ ...ep, playedSeconds: old.playedSeconds || 0, isPlayed: old.isPlayed || false, filePath: old.filePath || null });
                } else {
                    mergedEpisodes.push(ep);
                }
            }
            podcasts[existingIndex] = { ...existing, title: basePodcast.title, author: basePodcast.author, description: basePodcast.description, imagePath: basePodcast.imagePath || existing.imagePath, lastUpdated: Date.now(), episodes: mergedEpisodes };
        } else {
            podcasts.push({ ...basePodcast, episodes });
        }

        savePodcastsSafe(podcasts);
        return { ok: true };
    } catch (e) {
        console.error('Add podcast failed', e);
        return { ok: false, error: String(e && e.message || e) };
    }
});

ipcMain.handle('podcasts:refreshAll', async () => {
    try {
        const podcasts = loadPodcastsSafe();
        for (let i = 0; i < podcasts.length; i++) {
            const p = podcasts[i];
            try {
                if (!RSSParser) RSSParser = require('rss-parser');
                const parser = new RSSParser({ timeout: 15000 });
                const feed = await parser.parseURL(p.feedUrl);
                const imageUrl = (feed.itunes && feed.itunes.image) || feed.image?.url || null;
                const imagePath = imageUrl ? await cacheImageFromUrlMaybe(imageUrl) : p.imagePath;
                const items = feed.items || [];
                const newEpisodes = items.map((item) => {
                    const enclosureUrl = item.enclosure?.url || item.link || '';
                    return {
                        id: crypto.createHash('md5').update((item.guid || item.id || item.link || item.title || enclosureUrl) + p.feedUrl).digest('hex'),
                        title: item.title || 'Episode',
                        audioUrl: enclosureUrl,
                        pubDate: item.isoDate || item.pubDate || null,
                        duration: item.itunes?.duration || null,
                        descriptionHtml: item['content:encoded'] || item.content || '',
                        imagePath: imagePath,
                        playedSeconds: 0,
                        isPlayed: false,
                        filePath: null,
                    };
                });
                const existingMap = new Map(p.episodes.map(e => [e.id, e]));
                const merged = [];
                for (const ep of newEpisodes) {
                    const old = existingMap.get(ep.id);
                    if (old) merged.push({ ...ep, playedSeconds: old.playedSeconds || 0, isPlayed: old.isPlayed || false, filePath: old.filePath || null });
                    else merged.push(ep);
                }
                podcasts[i] = { ...p, imagePath, episodes: merged, lastUpdated: Date.now() };
            } catch (e) {
                console.error('Refresh podcast failed', e);
            }
        }
        savePodcastsSafe(podcasts);
        return { ok: true };
    } catch (e) {
        return { ok: false, error: String(e && e.message || e) };
    }
});

ipcMain.handle('podcasts:remove', async (event, podcastId) => {
    try {
        const podcasts = loadPodcastsSafe();
        const next = podcasts.filter(p => p.id !== podcastId);
        savePodcastsSafe(next);
        return { ok: true };
    } catch (e) {
        return { ok: false, error: String(e && e.message || e) };
    }
});

// --- СТАНДАРТНЫЕ СОБЫТИЯ ЖИЗНЕННОГО ЦИКЛА ELECTRON ---
app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});