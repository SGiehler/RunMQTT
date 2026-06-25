// Mock electron-store before requiring ConfigManager
jest.mock('electron-store', () => {
    return jest.fn().mockImplementation((options) => {
        const store = new Map();
        // Set defaults from options
        if (options && options.defaults) {
            Object.entries(options.defaults).forEach(([key, value]) => {
                store.set(key, value);
            });
        }
        return {
            get: jest.fn((key, defaultValue) => {
                return store.has(key) ? store.get(key) : defaultValue;
            }),
            set: jest.fn((key, value) => store.set(key, value)),
            delete: jest.fn((key) => store.delete(key)),
            clear: jest.fn(() => store.clear())
        };
    });
});

const ConfigManager = require('../electron/config-manager');

describe('ConfigManager', () => {
    let configManager;

    beforeEach(() => {
        jest.clearAllMocks();
        configManager = new ConfigManager();
    });

    describe('Connection Config', () => {
        test('should return default connection config when using defaults', () => {
            const config = configManager.getConnectionConfig();
            expect(config).toEqual({
                brokerUrl: '',
                username: '',
                password: '',
                clientId: '',
                tlsEnabled: false,
                rejectUnauthorized: true,
                caPath: '',
                certPath: '',
                keyPath: ''
            });
        });

        test('should save connection config', () => {
            const testConfig = {
                brokerUrl: 'mqtt://localhost:1883',
                username: 'testuser',
                password: 'testpass',
                clientId: 'test-client'
            };

            configManager.saveConnectionConfig(testConfig);
            expect(configManager.store.set).toHaveBeenCalledWith('connection', testConfig);
        });
    });

    describe('Bindings', () => {
        test('should return empty array for bindings by default', () => {
            const bindings = configManager.getBindings();
            expect(bindings).toEqual([]);
        });

        test('should save bindings', () => {
            const testBindings = [
                {
                    id: '1',
                    name: 'Test Binding',
                    topic: 'test/topic',
                    payloadMatch: 'any',
                    actions: [{ type: 'shell-command', command: 'echo test' }],
                    enabled: true
                }
            ];

            configManager.saveBindings(testBindings);
            expect(configManager.store.set).toHaveBeenCalledWith('bindings', testBindings);
        });
    });

    describe('Notification Bindings', () => {
        test('should return empty array for notification bindings by default', () => {
            const bindings = configManager.getNotificationBindings();
            expect(bindings).toEqual([]);
        });

        test('should save notification bindings', () => {
            const testBindings = [
                {
                    id: '1',
                    topic: 'alerts/#',
                    title: 'Alert',
                    body: '{payload}',
                    enabled: true
                }
            ];

            configManager.saveNotificationBindings(testBindings);
            expect(configManager.store.set).toHaveBeenCalledWith('notificationBindings', testBindings);
        });
    });

    describe('Settings', () => {
        test('should return default settings', () => {
            const settings = configManager.getSettings();
            expect(settings).toEqual({
                autoConnect: false,
                minimizeToTray: true,
                startMinimized: false,
                autoLaunch: false
            });
        });

        test('should save settings', () => {
            const testSettings = {
                autoConnect: true,
                minimizeToTray: false,
                startMinimized: true
            };

            configManager.saveSettings(testSettings);
            expect(configManager.store.set).toHaveBeenCalledWith('settings', testSettings);
        });
    });

    describe('Constructor', () => {
        test('should create store with correct config name', () => {
            const Store = require('electron-store');
            expect(Store).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'mqtt-controller-config'
                })
            );
        });

        test('should have store property', () => {
            expect(configManager.store).toBeDefined();
            expect(configManager.store.get).toBeDefined();
            expect(configManager.store.set).toBeDefined();
        });
    });
});
