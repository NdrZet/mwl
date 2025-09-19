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
    podcastsRemove: (podcastId) => ipcRenderer.invoke('podcasts:remove', podcastId),
    // Radio
    radioGetAll: () => ipcRenderer.invoke('radio:getAll'),
    radioSaveAll: (stations) => ipcRenderer.invoke('radio:saveAll', stations),
    // Window controls for custom titlebar
    isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    minimizeWindow: () => ipcRenderer.send('window:minimize'),
    toggleMaximizeWindow: () => ipcRenderer.send('window:toggleMaximize'),
    closeWindow: () => ipcRenderer.send('window:close'),
    onWindowMaximized: (cb) => { ipcRenderer.on('window:maximized', cb); return () => ipcRenderer.removeListener('window:maximized', cb); },
    onWindowUnmaximized: (cb) => { ipcRenderer.on('window:unmaximized', cb); return () => ipcRenderer.removeListener('window:unmaximized', cb); },
});