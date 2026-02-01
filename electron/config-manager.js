const Store = require('electron-store');

class ConfigManager {
    constructor() {
        this.store = new Store({
            name: 'mqtt-controller-config',
            defaults: {
                connection: {
                    brokerUrl: '',
                    username: '',
                    password: '',
                    clientId: ''
                },
                bindings: [],
                notificationBindings: [],
                settings: {
                    autoConnect: false,
                    minimizeToTray: true,
                    startMinimized: false,
                    autoLaunch: false
                }
            }
        });
    }

    getConnectionConfig() {
        return this.store.get('connection');
    }

    saveConnectionConfig(config) {
        this.store.set('connection', config);
    }

    getBindings() {
        return this.store.get('bindings', []);
    }

    saveBindings(bindings) {
        this.store.set('bindings', bindings);
    }

    getNotificationBindings() {
        return this.store.get('notificationBindings', []);
    }

    saveNotificationBindings(bindings) {
        this.store.set('notificationBindings', bindings);
    }

    getSettings() {
        return this.store.get('settings');
    }

    saveSettings(settings) {
        this.store.set('settings', settings);
    }
}

module.exports = ConfigManager;
