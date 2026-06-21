const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } = require('electron');
const path = require('path');
const { JSONPath } = require('jsonpath-plus');
const MqttClient = require('./mqtt-client');
const CommandExecutor = require('./command-executor');
const ConfigManager = require('./config-manager');
const { autoUpdater } = require('electron-updater');

// Set app name for notifications
app.setName('RunMQTT');

let mainWindow;
let tray;
let mqttClient;
let configManager;
let commandExecutor;

const isDev = !app.isPackaged;

function createWindow(startMinimized = false) {
    // Remove default menu bar
    Menu.setApplicationMenu(null);

    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        title: 'RunMQTT',
        icon: path.join(__dirname, '../assets/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        frame: true,
        titleBarStyle: 'default',
        backgroundColor: '#1a1a2e',
        autoHideMenuBar: true,
        show: !startMinimized  // Don't show window initially if starting minimized
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Show window when ready to avoid visual flash, unless starting minimized
    if (!startMinimized) {
        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
        });
    }

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('minimize', () => {
        mainWindow.hide();
    });
}

function createTray() {
    const iconPath = path.join(__dirname, '../assets/tray-icon.png');
    let trayIcon;

    try {
        trayIcon = nativeImage.createFromPath(iconPath);
        if (trayIcon.isEmpty()) {
            trayIcon = nativeImage.createEmpty();
        }
    } catch (e) {
        trayIcon = nativeImage.createEmpty();
    }

    tray = new Tray(trayIcon);
    tray.setToolTip('RunMQTT');
    updateTrayMenu(false);

    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

function updateTrayMenu(isConnected) {
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Window',
            click: () => {
                mainWindow.show();
                mainWindow.focus();
            }
        },
        { type: 'separator' },
        {
            label: isConnected ? '● Connected' : '○ Disconnected',
            enabled: false
        },
        {
            label: isConnected ? 'Disconnect' : 'Connect',
            click: () => {
                if (isConnected) {
                    mqttClient.disconnect();
                } else {
                    const config = configManager.getConnectionConfig();
                    if (config.brokerUrl) {
                        mqttClient.connect(config);
                    }
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                if (mqttClient) {
                    mqttClient.disconnect();
                }
                app.quit();
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
}

function showNotification(title, body) {
    if (Notification.isSupported()) {
        new Notification({ title, body }).show();
    }
}

// Helper function to update MQTT subscriptions from all bindings
function updateAllSubscriptions() {
    const commandBindings = configManager.getBindings();
    const notificationBindings = configManager.getNotificationBindings();

    // Combine all topics from both binding types
    const allBindings = [
        ...commandBindings.map(b => ({ topic: b.topic })),
        ...notificationBindings.map(b => ({ topic: b.topic }))
    ];

    mqttClient.updateSubscriptions(allBindings);
}

function setupIPC() {
    // Connection management
    ipcMain.handle('mqtt:connect', async (event, config) => {
        try {
            configManager.saveConnectionConfig(config);
            await mqttClient.connect(config);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('mqtt:disconnect', async () => {
        mqttClient.disconnect();
        return { success: true };
    });

    ipcMain.handle('mqtt:getStatus', () => {
        return mqttClient.getStatus();
    });

    // Subscriptions
    ipcMain.handle('mqtt:subscribe', async (event, topic) => {
        return mqttClient.subscribe(topic);
    });

    ipcMain.handle('mqtt:unsubscribe', async (event, topic) => {
        return mqttClient.unsubscribe(topic);
    });

    // Bindings management
    ipcMain.handle('bindings:getAll', () => {
        return configManager.getBindings();
    });

    ipcMain.handle('bindings:save', (event, bindings) => {
        configManager.saveBindings(bindings);
        updateAllSubscriptions();
        return { success: true };
    });

    // Notification bindings
    ipcMain.handle('notifications:getAll', () => {
        return configManager.getNotificationBindings();
    });

    ipcMain.handle('notifications:save', (event, bindings) => {
        configManager.saveNotificationBindings(bindings);
        updateAllSubscriptions();
        return { success: true };
    });

    // App info
    ipcMain.handle('app:getVersion', () => app.getVersion());

    // Config
    ipcMain.handle('config:getConnection', () => {
        return configManager.getConnectionConfig();
    });

    ipcMain.handle('config:getSettings', () => {
        return configManager.getSettings();
    });

    ipcMain.handle('config:saveSettings', (event, settings) => {
        configManager.saveSettings(settings);

        // Apply auto-launch setting
        app.setLoginItemSettings({
            openAtLogin: settings.autoLaunch || false,
            path: app.getPath('exe'),
            args: []
        });

        return { success: true };
    });

    // Command execution (for testing)
    ipcMain.handle('command:test', async (event, action) => {
        try {
            const result = await commandExecutor.execute(action);
            return { success: true, result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // Updater
    autoUpdater.autoDownload = false;

    ipcMain.handle('updater:check', async () => {
        if (isDev) {
            // In development, mock a check and notify renderer
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('updater:update-not-available', { version: app.getVersion() });
                }
            }, 500);
            return { updateInfo: { version: app.getVersion() } };
        }
        return autoUpdater.checkForUpdates().catch(err => ({ error: err.message }));
    });

    ipcMain.handle('updater:download', () => {
        return autoUpdater.downloadUpdate().catch(err => ({ error: err.message }));
    });

    ipcMain.handle('updater:install', () => {
        autoUpdater.quitAndInstall();
    });

    autoUpdater.on('update-available', (info) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:update-available', info);
        }
    });

    autoUpdater.on('update-not-available', (info) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:update-not-available', info);
        }
    });

    autoUpdater.on('error', (err) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:error', err.message);
        }
    });

    autoUpdater.on('download-progress', (progressObj) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:download-progress', progressObj);
        }
    });

    autoUpdater.on('update-downloaded', (info) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:update-downloaded', info);
        }
    });
}

function handleMqttMessage(topic, payload) {
    // Send to renderer for logging
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('mqtt:message', { topic, payload, timestamp: Date.now() });
    }

    // Check command bindings
    const bindings = configManager.getBindings();
    for (const binding of bindings) {
        if (binding.enabled !== false && matchTopic(binding.topic, topic)) {
            if (matchPayload(binding.payloadMatch, binding.payloadValue, payload)) {
                executeBinding(binding, topic, payload);
            }
        }
    }

    // Check notification bindings
    const notifBindings = configManager.getNotificationBindings();
    for (const binding of notifBindings) {
        if (binding.enabled !== false && matchTopic(binding.topic, topic)) {
            executeNotification(binding, topic, payload);
        }
    }
}

function matchTopic(pattern, topic) {
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i] === '#') {
            return true;
        }
        if (patternParts[i] === '+') {
            continue;
        }
        if (patternParts[i] !== topicParts[i]) {
            return false;
        }
    }

    return patternParts.length === topicParts.length;
}

function matchPayload(matchType, matchValue, payload) {
    if (!matchType || matchType === 'any') {
        return true;
    }
    switch (matchType) {
        case 'exact':
            return payload === matchValue;
        case 'contains':
            return payload.includes(matchValue);
        case 'regex':
            try {
                return new RegExp(matchValue).test(payload);
            } catch {
                return false;
            }
        default:
            return true;
    }
}

async function executeBinding(binding, topic, payload) {
    const logEntry = {
        timestamp: Date.now(),
        type: 'command',
        bindingName: binding.name,
        topic,
        payload,
        success: false,
        error: null
    };

    try {
        for (const action of binding.actions) {
            // Replace placeholders in action parameters with JSONPath support
            const actionStr = JSON.stringify(action);
            const processedStr = replacePlaceholders(actionStr, topic, payload);
            const processedAction = JSON.parse(processedStr);
            await commandExecutor.execute(processedAction);
        }
        logEntry.success = true;

        if (binding.notify) {
            showNotification(`Command Executed: ${binding.name}`, `Topic: ${topic}`);
        }
    } catch (error) {
        logEntry.error = error.message;

        if (binding.notify) {
            showNotification(`Command Failed: ${binding.name}`, `Error: ${error.message}`);
        }
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('command:executed', logEntry);
    }
}

function executeNotification(binding, topic, payload) {
    const logEntry = {
        timestamp: Date.now(),
        type: 'notification',
        bindingName: binding.title,
        topic,
        payload,
        success: false,
        error: null
    };

    try {
        const title = replacePlaceholders(binding.title, topic, payload);
        const body = replacePlaceholders(binding.body || '', topic, payload);
        showNotification(title, body);
        logEntry.success = true;
    } catch (error) {
        logEntry.error = error.message;
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('notification:shown', logEntry);
    }
}

function replacePlaceholders(text, topic, payload) {
    // Replace simple placeholders
    let result = text
        .replace(/\{topic\}/g, topic)
        .replace(/\{payload\}/g, payload);

    // Replace JSONPath expressions: {$.path.to.value} or {$[0].item}
    const jsonPathRegex = /\{(\$[^}]+)\}/g;
    let match;

    while ((match = jsonPathRegex.exec(text)) !== null) {
        const jsonPathExpr = match[1];
        try {
            // Try to parse payload as JSON
            const jsonPayload = JSON.parse(payload);
            const values = JSONPath({ path: jsonPathExpr, json: jsonPayload });
            const replacement = values.length > 0 ? String(values[0]) : '';
            result = result.replace(match[0], replacement);
        } catch (e) {
            // If payload is not valid JSON or JSONPath fails, leave placeholder or use raw payload
            result = result.replace(match[0], '');
        }
    }

    return result;
}

app.whenReady().then(() => {
    configManager = new ConfigManager();
    commandExecutor = new CommandExecutor();
    mqttClient = new MqttClient();

    mqttClient.on('connected', () => {
        updateTrayMenu(true);
        updateAllSubscriptions();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('mqtt:status', { connected: true });
        }
    });

    mqttClient.on('disconnected', () => {
        updateTrayMenu(false);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('mqtt:status', { connected: false });
        }
    });

    mqttClient.on('error', (error) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('mqtt:error', { error: error.message });
        }
    });

    mqttClient.on('message', handleMqttMessage);

    // Load settings before creating window to check startMinimized
    const settings = configManager.getSettings();

    createWindow(settings.startMinimized);
    createTray();
    setupIPC();

    // Auto-connect if configured
    const config = configManager.getConnectionConfig();
    if (config.brokerUrl && settings.autoConnect) {
        mqttClient.connect(config);
    }

    // Auto check for updates (handled by renderer on startup)
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

app.on('before-quit', () => {
    app.isQuitting = true;
});
