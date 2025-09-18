const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    loadTracks: () => ipcRenderer.invoke('load-tracks'),
    saveTracks: (tracks) => ipcRenderer.send('save-tracks', tracks),
    getMetadata: (filePath) => ipcRenderer.invoke('get-metadata', filePath),
    selectFiles: () => ipcRenderer.invoke('select-files'),
    getCoverPath: (filePath) => ipcRenderer.invoke('get-cover-path', filePath),
    // Podcasts
    podcastsGetAll: () => ipcRenderer.invoke('podcasts:getAll'),
    podcastsAddByUrl: (feedUrl) => ipcRenderer.invoke('podcasts:addByUrl', feedUrl),
    podcastsRefreshAll: () => ipcRenderer.invoke('podcasts:refreshAll'),
});