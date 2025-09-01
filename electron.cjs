const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const musicMetadata = require('music-metadata');

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
            webSecurity: false, // Разрешение на загрузку локальных файлов
        },
    });

    // Использование надежного способа формирования URL
    const startUrl = url.format({
        pathname: path.join(__dirname, 'dist', 'index.html'),
        protocol: 'file:',
        slashes: true
    });

    mainWindow.loadURL(startUrl);

    // DevTools можно открыть вручную (F12), авто-открытие отключено
    // mainWindow.webContents.openDevTools();
}

// "СЕРВЕРНАЯ" ЛОГИКА
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