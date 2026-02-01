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

    // Configuration
    config: {
        getConnection: () => ipcRenderer.invoke('config:getConnection'),
        getSettings: () => ipcRenderer.invoke('config:getSettings'),
        saveSettings: (settings) => ipcRenderer.invoke('config:saveSettings', settings)
    },

    // Command Testing
    command: {
        test: (action) => ipcRenderer.invoke('command:test', action)
    }
});
