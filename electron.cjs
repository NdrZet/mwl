const { app, BrowserWindow, Menu, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const musicMetadata = require('music-metadata');
const crypto = require('crypto');

// Путь к файлу, где будут храниться треки. Он создастся в папке с данными приложения (например, AppData).
const userDataPath = app.getPath('userData');
const tracksFilePath = path.join(userDataPath, 'tracks.json');

function createWindow() {
    // Убираем стандартное меню (File, Edit, etc.)
    Menu.setApplicationMenu(null);

    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "Z Музыка", // Твое кастомное название
        // Путь к иконке. Он будет работать в готовом приложении.
        icon: path.join(__dirname, 'dist', 'icon.ico'),
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

function resizeToPng(buffer, size = 256) {
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
    const png = resizeToPng(buf, 256);
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