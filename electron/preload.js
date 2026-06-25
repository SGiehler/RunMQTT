const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // MQTT Connection
    mqtt: {
        connect: (config) => ipcRenderer.invoke('mqtt:connect', config),
        disconnect: () => ipcRenderer.invoke('mqtt:disconnect'),
        getStatus: () => ipcRenderer.invoke('mqtt:getStatus'),
        subscribe: (topic) => ipcRenderer.invoke('mqtt:subscribe', topic),
        unsubscribe: (topic) => ipcRenderer.invoke('mqtt:unsubscribe', topic),
        onMessage: (callback) => {
            ipcRenderer.on('mqtt:message', (event, data) => callback(data));
        },
        onStatus: (callback) => {
            ipcRenderer.on('mqtt:status', (event, data) => callback(data));
        },
        onError: (callback) => {
            ipcRenderer.on('mqtt:error', (event, data) => callback(data));
        }
    },

    // Command Bindings
    bindings: {
        getAll: () => ipcRenderer.invoke('bindings:getAll'),
        save: (bindings) => ipcRenderer.invoke('bindings:save', bindings),
        onExecuted: (callback) => {
            ipcRenderer.on('command:executed', (event, data) => callback(data));
        }
    },

    // Notification Bindings
    notifications: {
        getAll: () => ipcRenderer.invoke('notifications:getAll'),
        save: (bindings) => ipcRenderer.invoke('notifications:save', bindings),
        onShown: (callback) => {
            ipcRenderer.on('notification:shown', (event, data) => callback(data));
        }
    },

    // App Info
    app: {
        getVersion: () => ipcRenderer.invoke('app:getVersion')
    },

    // Configuration
    config: {
        getConnection: () => ipcRenderer.invoke('config:getConnection'),
        getSettings: () => ipcRenderer.invoke('config:getSettings'),
        saveSettings: (settings) => ipcRenderer.invoke('config:saveSettings', settings)
    },

    // Dialogs
    dialog: {
        openFile: (options) => ipcRenderer.invoke('dialog:openFile', options)
    },

    // Command Testing
    command: {
        test: (action) => ipcRenderer.invoke('command:test', action)
    },

    // Updater
    updater: {
        check: () => ipcRenderer.invoke('updater:check'),
        download: () => ipcRenderer.invoke('updater:download'),
        install: () => ipcRenderer.invoke('updater:install'),
        onUpdateAvailable: (callback) => {
            ipcRenderer.on('updater:update-available', (event, info) => callback(info));
        },
        onUpdateNotAvailable: (callback) => {
            ipcRenderer.on('updater:update-not-available', (event, info) => callback(info));
        },
        onError: (callback) => {
            ipcRenderer.on('updater:error', (event, error) => callback(error));
        },
        onDownloadProgress: (callback) => {
            ipcRenderer.on('updater:download-progress', (event, progress) => callback(progress));
        },
        onUpdateDownloaded: (callback) => {
            ipcRenderer.on('updater:update-downloaded', (event, info) => callback(info));
        }
    }
});
