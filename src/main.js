// State
let bindings = [];
let notificationBindings = [];
let logEntries = [];
let editingBindingIndex = -1;
let editingNotificationIndex = -1;
let currentActions = [];

// DOM Elements
const elements = {
    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    views: document.querySelectorAll('.view'),

    // Connection
    brokerUrl: document.getElementById('brokerUrl'),
    username: document.getElementById('username'),
    password: document.getElementById('password'),
    clientId: document.getElementById('clientId'),
    btnConnect: document.getElementById('btnConnect'),
    btnDisconnect: document.getElementById('btnDisconnect'),
    connectionIndicator: document.getElementById('connectionIndicator'),

    // Bindings
    bindingsList: document.getElementById('bindingsList'),
    emptyBindings: document.getElementById('emptyBindings'),
    btnAddBinding: document.getElementById('btnAddBinding'),

    // Binding Modal
    bindingModal: document.getElementById('bindingModal'),
    bindingModalTitle: document.getElementById('bindingModalTitle'),
    bindingName: document.getElementById('bindingName'),
    bindingTopic: document.getElementById('bindingTopic'),
    payloadMatch: document.getElementById('payloadMatch'),
    payloadValue: document.getElementById('payloadValue'),
    payloadValueGroup: document.getElementById('payloadValueGroup'),
    actionsList: document.getElementById('actionsList'),
    btnAddAction: document.getElementById('btnAddAction'),
    btnSaveBinding: document.getElementById('btnSaveBinding'),
    btnCancelBinding: document.getElementById('btnCancelBinding'),
    closeBindingModal: document.getElementById('closeBindingModal'),
    bindingNotify: document.getElementById('bindingNotify'),

    // Notifications
    notificationsList: document.getElementById('notificationsList'),
    emptyNotifications: document.getElementById('emptyNotifications'),
    btnAddNotification: document.getElementById('btnAddNotification'),

    // Notification Modal
    notificationModal: document.getElementById('notificationModal'),
    notificationModalTitle: document.getElementById('notificationModalTitle'),
    notifTopic: document.getElementById('notifTopic'),
    notifTitle: document.getElementById('notifTitle'),
    notifBody: document.getElementById('notifBody'),
    btnSaveNotification: document.getElementById('btnSaveNotification'),
    btnCancelNotification: document.getElementById('btnCancelNotification'),
    closeNotificationModal: document.getElementById('closeNotificationModal'),

    // Log
    logContainer: document.getElementById('logContainer'),
    emptyLog: document.getElementById('emptyLog'),
    btnClearLog: document.getElementById('btnClearLog'),

    // Settings
    settingAutoConnect: document.getElementById('settingAutoConnect'),
    settingMinimizeToTray: document.getElementById('settingMinimizeToTray'),
    settingStartMinimized: document.getElementById('settingStartMinimized'),
    settingAutoLaunch: document.getElementById('settingAutoLaunch'),

    // Updater
    appVersionDesc: document.getElementById('appVersionDesc'),
    btnCheckUpdate: document.getElementById('btnCheckUpdate'),
    updateActionContainer: document.getElementById('updateActionContainer'),
    btnDownloadUpdate: document.getElementById('btnDownloadUpdate'),
    btnInstallUpdate: document.getElementById('btnInstallUpdate'),
    updateProgressContainer: document.getElementById('updateProgressContainer'),
    updateProgressBar: document.getElementById('updateProgressBar'),
    updateProgressText: document.getElementById('updateProgressText')
};

// Initialize
async function init() {
    setupNavigation();
    setupConnectionHandlers();
    setupBindingHandlers();
    setupNotificationHandlers();
    setupLogHandlers();
    setupSettingsHandlers();
    setupUpdaterHandlers();
    setupMqttEvents();

    await loadInitialData();
}

// Navigation
function setupNavigation() {
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.dataset.view;
            switchView(viewId);
        });
    });
}

function switchView(viewId) {
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewId);
    });

    elements.views.forEach(view => {
        view.classList.toggle('active', view.id === `view-${viewId}`);
    });
}

// Connection
function setupConnectionHandlers() {
    elements.btnConnect.addEventListener('click', async () => {
        const config = {
            brokerUrl: elements.brokerUrl.value.trim(),
            username: elements.username.value.trim(),
            password: elements.password.value,
            clientId: elements.clientId.value.trim()
        };

        if (!config.brokerUrl) {
            alert('Please enter a broker URL');
            return;
        }

        updateConnectionStatus('connecting');
        const result = await window.api.mqtt.connect(config);

        if (!result.success) {
            updateConnectionStatus('disconnected');
            alert(`Connection failed: ${result.error}`);
        }
    });

    elements.btnDisconnect.addEventListener('click', async () => {
        await window.api.mqtt.disconnect();
    });
}

function updateConnectionStatus(status) {
    const indicator = elements.connectionIndicator;
    const dot = indicator.querySelector('.status-dot');
    const text = indicator.querySelector('.status-text');

    dot.className = 'status-dot ' + status;

    switch (status) {
        case 'connected':
            text.textContent = 'Connected';
            elements.btnConnect.disabled = true;
            elements.btnDisconnect.disabled = false;
            break;
        case 'connecting':
            text.textContent = 'Connecting...';
            elements.btnConnect.disabled = true;
            elements.btnDisconnect.disabled = true;
            break;
        case 'disconnected':
        default:
            text.textContent = 'Disconnected';
            elements.btnConnect.disabled = false;
            elements.btnDisconnect.disabled = true;
    }
}

// Bindings
function setupBindingHandlers() {
    elements.btnAddBinding.addEventListener('click', () => openBindingModal());
    elements.btnCancelBinding.addEventListener('click', () => closeBindingModal());
    elements.closeBindingModal.addEventListener('click', () => closeBindingModal());
    elements.bindingModal.querySelector('.modal-backdrop').addEventListener('click', () => closeBindingModal());

    elements.payloadMatch.addEventListener('change', () => {
        elements.payloadValueGroup.style.display =
            elements.payloadMatch.value === 'any' ? 'none' : 'block';
    });

    elements.btnAddAction.addEventListener('click', () => addAction());
    elements.btnSaveBinding.addEventListener('click', () => saveBinding());
}

function openBindingModal(index = -1) {
    editingBindingIndex = index;
    currentActions = [];

    if (index >= 0) {
        const binding = bindings[index];
        elements.bindingModalTitle.textContent = 'Edit Command Binding';
        elements.bindingName.value = binding.name || '';
        elements.bindingTopic.value = binding.topic || '';
        elements.payloadMatch.value = binding.payloadMatch || 'any';
        elements.payloadValue.value = binding.payloadValue || '';
        elements.payloadValueGroup.style.display =
            binding.payloadMatch && binding.payloadMatch !== 'any' ? 'block' : 'none';
        elements.bindingNotify.checked = binding.notify || false;
        currentActions = JSON.parse(JSON.stringify(binding.actions || []));
    } else {
        elements.bindingModalTitle.textContent = 'Add Command Binding';
        elements.bindingName.value = '';
        elements.bindingTopic.value = '';
        elements.payloadMatch.value = 'any';
        elements.payloadValue.value = '';
        elements.bindingNotify.checked = false;
        elements.payloadValueGroup.style.display = 'none';
        currentActions = [];
    }

    renderActions();
    elements.bindingModal.classList.add('active');
}

function closeBindingModal() {
    elements.bindingModal.classList.remove('active');
    editingBindingIndex = -1;
    currentActions = [];
}

function addAction(type = 'shell-command') {
    currentActions.push({ type, command: '', program: '', args: '', level: '50', keys: '' });
    renderActions();
}

function renderActions() {
    elements.actionsList.innerHTML = '';

    if (currentActions.length === 0) {
        elements.actionsList.innerHTML = '<p class="empty-hint">No actions added. Click "+ Add Action" to add one.</p>';
        return;
    }

    currentActions.forEach((action, index) => {
        const template = document.getElementById('actionTemplate');
        const clone = template.content.cloneNode(true);
        const item = clone.querySelector('.action-item');

        item.dataset.actionIndex = index;
        item.querySelector('.action-type').value = action.type;

        renderActionConfig(item, action);

        item.querySelector('.action-type').addEventListener('change', (e) => {
            currentActions[index].type = e.target.value;
            renderActionConfig(item, currentActions[index]);
        });

        item.querySelector('.btn-remove-action').addEventListener('click', () => {
            currentActions.splice(index, 1);
            renderActions();
        });

        elements.actionsList.appendChild(clone);
    });
}

function renderActionConfig(item, action) {
    const config = item.querySelector('.action-config');
    config.innerHTML = '';

    switch (action.type) {
        case 'run-program':
            config.innerHTML = `
        <div class="form-group">
          <label>Program Path</label>
          <input type="text" class="action-program" value="${escapeHtml(action.program || '')}" placeholder="C:\\Path\\To\\program.exe" />
        </div>
        <div class="form-group">
          <label>Arguments (optional)</label>
          <input type="text" class="action-args" value="${escapeHtml(action.args || '')}" placeholder="--arg1 {$.data.value}" />
          <span class="form-hint">Placeholders: {payload}, {topic}, or JSONPath: {$.path.to.value}</span>
        </div>
      `;
            setupActionInputs(config, action, ['program', 'args']);
            break;

        case 'shell-command':
            config.innerHTML = `
        <div class="form-group">
          <label>Command</label>
          <input type="text" class="action-command" value="${escapeHtml(action.command || '')}" placeholder="echo {$.message}" />
          <span class="form-hint">PowerShell command. Placeholders: {payload}, {topic}, or {$.json.path}</span>
        </div>
      `;
            setupActionInputs(config, action, ['command']);
            break;

        case 'volume':
            config.innerHTML = `
        <div class="form-group">
          <label>Volume Level (0-100)</label>
          <input type="text" class="action-level" value="${escapeHtml(action.level || '50')}" placeholder="50 or {$.volume}" />
          <span class="form-hint">Enter a number, {payload}, or {$.path} to extract from JSON</span>
        </div>
      `;
            setupActionInputs(config, action, ['level']);
            break;

        case 'keyboard':
            config.innerHTML = `
        <div class="form-group">
          <label>Keys to Send</label>
          <input type="text" class="action-keys" value="${escapeHtml(action.keys || '')}" placeholder="{ENTER} or ^c (Ctrl+C)" />
          <span class="form-hint">SendKeys syntax: {ENTER}, {TAB}, ^c (Ctrl+C), %f (Alt+F)</span>
        </div>
      `;
            setupActionInputs(config, action, ['keys']);
            break;

        case 'batch-script':
            config.innerHTML = `
        <div class="form-group">
          <label>Script File Path (optional)</label>
          <input type="text" class="action-scriptFile" value="${escapeHtml(action.scriptFile || '')}" placeholder="C:\\Scripts\\myscript.bat" />
          <span class="form-hint">Path to a .bat or .cmd file, or leave empty to use inline script below</span>
        </div>
        <div class="form-group">
          <label>Inline Script (optional)</label>
          <textarea class="action-script" rows="6" placeholder="@echo off&#10;rem Your batch script here&#10;echo Hello {payload}">${escapeHtml(action.script || '')}</textarea>
          <span class="form-hint">Use {payload} and {$.json.path} placeholders. Multi-line batch scripts supported.</span>
        </div>
      `;
            setupActionInputs(config, action, ['scriptFile', 'script']);
            // Special handler for textarea
            const scriptTextarea = config.querySelector('.action-script');
            if (scriptTextarea) {
                scriptTextarea.addEventListener('input', (e) => {
                    action.script = e.target.value;
                });
            }
            break;
    }
}

function setupActionInputs(config, action, fields) {
    fields.forEach(field => {
        const input = config.querySelector(`.action-${field}`);
        if (input) {
            input.addEventListener('input', (e) => {
                action[field] = e.target.value;
            });
        }
    });
}

async function saveBinding() {
    const binding = {
        id: editingBindingIndex >= 0 ? bindings[editingBindingIndex].id : Date.now().toString(),
        name: elements.bindingName.value.trim(),
        topic: elements.bindingTopic.value.trim(),
        payloadMatch: elements.payloadMatch.value,
        payloadValue: elements.payloadValue.value,
        actions: currentActions,
        notify: elements.bindingNotify.checked,
        enabled: editingBindingIndex >= 0 ? bindings[editingBindingIndex].enabled : true
    };

    if (!binding.name || !binding.topic) {
        alert('Please enter a name and topic');
        return;
    }

    if (binding.actions.length === 0) {
        alert('Please add at least one action');
        return;
    }

    if (editingBindingIndex >= 0) {
        bindings[editingBindingIndex] = binding;
    } else {
        bindings.push(binding);
    }

    await window.api.bindings.save(bindings);
    renderBindings();
    closeBindingModal();
}

function renderBindings() {
    if (bindings.length === 0) {
        elements.emptyBindings.style.display = 'block';
        elements.bindingsList.querySelectorAll('.binding-card').forEach(el => el.remove());
        return;
    }

    elements.emptyBindings.style.display = 'none';
    elements.bindingsList.querySelectorAll('.binding-card').forEach(el => el.remove());

    bindings.forEach((binding, index) => {
        const card = document.createElement('div');
        card.className = 'binding-card';
        card.innerHTML = `
      <div class="binding-info">
        <div class="binding-name">${escapeHtml(binding.name)}</div>
        <div class="binding-topic">${escapeHtml(binding.topic)} → ${binding.actions.length} action(s)</div>
      </div>
      <div class="binding-actions">
        <div class="binding-toggle ${binding.enabled !== false ? 'enabled' : ''}" data-index="${index}"></div>
        <button class="btn-icon-only btn-edit" data-index="${index}" title="Edit">✏️</button>
        <button class="btn-icon-only btn-delete" data-index="${index}" title="Delete">🗑️</button>
      </div>
    `;

        card.querySelector('.binding-toggle').addEventListener('click', async (e) => {
            const idx = parseInt(e.target.dataset.index);
            bindings[idx].enabled = !bindings[idx].enabled;
            await window.api.bindings.save(bindings);
            renderBindings();
        });

        card.querySelector('.btn-edit').addEventListener('click', (e) => {
            openBindingModal(parseInt(e.target.dataset.index));
        });

        card.querySelector('.btn-delete').addEventListener('click', async (e) => {
            if (confirm('Delete this binding?')) {
                bindings.splice(parseInt(e.target.dataset.index), 1);
                await window.api.bindings.save(bindings);
                renderBindings();
            }
        });

        elements.bindingsList.appendChild(card);
    });
}

// Notifications
function setupNotificationHandlers() {
    elements.btnAddNotification.addEventListener('click', () => openNotificationModal());
    elements.btnCancelNotification.addEventListener('click', () => closeNotificationModal());
    elements.closeNotificationModal.addEventListener('click', () => closeNotificationModal());
    elements.notificationModal.querySelector('.modal-backdrop').addEventListener('click', () => closeNotificationModal());
    elements.btnSaveNotification.addEventListener('click', () => saveNotification());
}

function openNotificationModal(index = -1) {
    editingNotificationIndex = index;

    if (index >= 0) {
        const notif = notificationBindings[index];
        elements.notificationModalTitle.textContent = 'Edit Notification Binding';
        elements.notifTopic.value = notif.topic || '';
        elements.notifTitle.value = notif.title || '';
        elements.notifBody.value = notif.body || '';
    } else {
        elements.notificationModalTitle.textContent = 'Add Notification Binding';
        elements.notifTopic.value = '';
        elements.notifTitle.value = '';
        elements.notifBody.value = '';
    }

    elements.notificationModal.classList.add('active');
}

function closeNotificationModal() {
    elements.notificationModal.classList.remove('active');
    editingNotificationIndex = -1;
}

async function saveNotification() {
    const notif = {
        id: editingNotificationIndex >= 0 ? notificationBindings[editingNotificationIndex].id : Date.now().toString(),
        topic: elements.notifTopic.value.trim(),
        title: elements.notifTitle.value.trim(),
        body: elements.notifBody.value.trim(),
        enabled: editingNotificationIndex >= 0 ? notificationBindings[editingNotificationIndex].enabled : true
    };

    if (!notif.topic || !notif.title) {
        alert('Please enter a topic and title');
        return;
    }

    if (editingNotificationIndex >= 0) {
        notificationBindings[editingNotificationIndex] = notif;
    } else {
        notificationBindings.push(notif);
    }

    await window.api.notifications.save(notificationBindings);
    renderNotifications();
    closeNotificationModal();
}

function renderNotifications() {
    if (notificationBindings.length === 0) {
        elements.emptyNotifications.style.display = 'block';
        elements.notificationsList.querySelectorAll('.binding-card').forEach(el => el.remove());
        return;
    }

    elements.emptyNotifications.style.display = 'none';
    elements.notificationsList.querySelectorAll('.binding-card').forEach(el => el.remove());

    notificationBindings.forEach((notif, index) => {
        const card = document.createElement('div');
        card.className = 'binding-card';
        card.innerHTML = `
      <div class="binding-info">
        <div class="binding-name">${escapeHtml(notif.title)}</div>
        <div class="binding-topic">${escapeHtml(notif.topic)}</div>
      </div>
      <div class="binding-actions">
        <div class="binding-toggle ${notif.enabled !== false ? 'enabled' : ''}" data-index="${index}"></div>
        <button class="btn-icon-only btn-edit" data-index="${index}" title="Edit">✏️</button>
        <button class="btn-icon-only btn-delete" data-index="${index}" title="Delete">🗑️</button>
      </div>
    `;

        card.querySelector('.binding-toggle').addEventListener('click', async (e) => {
            const idx = parseInt(e.target.dataset.index);
            notificationBindings[idx].enabled = !notificationBindings[idx].enabled;
            await window.api.notifications.save(notificationBindings);
            renderNotifications();
        });

        card.querySelector('.btn-edit').addEventListener('click', (e) => {
            openNotificationModal(parseInt(e.target.dataset.index));
        });

        card.querySelector('.btn-delete').addEventListener('click', async (e) => {
            if (confirm('Delete this notification binding?')) {
                notificationBindings.splice(parseInt(e.target.dataset.index), 1);
                await window.api.notifications.save(notificationBindings);
                renderNotifications();
            }
        });

        elements.notificationsList.appendChild(card);
    });
}

// Log
function setupLogHandlers() {
    elements.btnClearLog.addEventListener('click', () => {
        logEntries = [];
        renderLog();
    });
}

function addLogEntry(entry) {
    logEntries.unshift(entry);
    if (logEntries.length > 200) {
        logEntries.pop();
        // Remove last DOM element if over limit
        const entries = elements.logContainer.querySelectorAll('.log-entry');
        if (entries.length > 200) {
            entries[entries.length - 1].remove();
        }
    }

    // Hide empty state
    elements.emptyLog.style.display = 'none';

    // Create and prepend the new entry
    const el = createLogEntryElement(entry);
    const firstEntry = elements.logContainer.querySelector('.log-entry');
    if (firstEntry) {
        elements.logContainer.insertBefore(el, firstEntry);
    } else {
        elements.logContainer.appendChild(el);
    }
}

function createLogEntryElement(entry) {
    const el = document.createElement('div');
    el.className = `log-entry ${entry.type}`;
    const time = new Date(entry.timestamp).toLocaleTimeString();

    if (entry.type === 'message') {
        el.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-content">
        ← <span class="log-topic">${escapeHtml(entry.topic)}</span> = "${escapeHtml(entry.payload)}"
      </span>
    `;
    } else if (entry.type === 'command') {
        const icon = entry.success ? '✓' : '✗';
        el.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-content">
        → Executed: ${escapeHtml(entry.bindingName)} ${icon}
        ${entry.error ? `<br><small style="color:var(--error)">${escapeHtml(entry.error)}</small>` : ''}
      </span>
    `;
        if (!entry.success) {
            el.classList.add('error');
        }
    } else if (entry.type === 'error') {
        el.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-content" style="color:var(--error)">
        Error: ${escapeHtml(entry.error)}
      </span>
    `;
    } else if (entry.type === 'notification') {
        const icon = entry.success ? '🔔' : '✗';
        el.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-content">
        ${icon} Notification: ${escapeHtml(entry.bindingName)}
        ${entry.error ? `<br><small style="color:var(--error)">${escapeHtml(entry.error)}</small>` : ''}
      </span>
    `;
        el.classList.add('notification');
        if (!entry.success) {
            el.classList.add('error');
        }
    }

    return el;
}

function renderLog() {
    // Clear existing entries
    elements.logContainer.querySelectorAll('.log-entry').forEach(el => el.remove());

    if (logEntries.length === 0) {
        elements.emptyLog.style.display = 'block';
        return;
    }

    elements.emptyLog.style.display = 'none';

    // Render all entries
    logEntries.forEach(entry => {
        const el = createLogEntryElement(entry);
        elements.logContainer.appendChild(el);
    });
}

// Settings
function setupSettingsHandlers() {
    // Auto-save function for settings
    const autoSaveSettings = async () => {
        const settings = {
            autoConnect: elements.settingAutoConnect.checked,
            minimizeToTray: elements.settingMinimizeToTray.checked,
            startMinimized: elements.settingStartMinimized.checked,
            autoLaunch: elements.settingAutoLaunch.checked
        };

        await window.api.config.saveSettings(settings);
    };

    // Add change listeners to all settings checkboxes for auto-save
    elements.settingAutoConnect.addEventListener('change', autoSaveSettings);
    elements.settingMinimizeToTray.addEventListener('change', autoSaveSettings);
    elements.settingStartMinimized.addEventListener('change', autoSaveSettings);
    elements.settingAutoLaunch.addEventListener('change', autoSaveSettings);
}

// Updater
function setupUpdaterHandlers() {
    elements.btnCheckUpdate.addEventListener('click', async () => {
        elements.appVersionDesc.textContent = 'Checking for updates...';
        elements.btnCheckUpdate.disabled = true;
        await window.api.updater.check();
    });

    elements.btnDownloadUpdate.addEventListener('click', async () => {
        elements.btnDownloadUpdate.disabled = true;
        elements.appVersionDesc.textContent = 'Downloading update...';
        elements.updateProgressContainer.style.display = 'block';
        await window.api.updater.download();
    });

    elements.btnInstallUpdate.addEventListener('click', async () => {
        await window.api.updater.install();
    });

    // Handle events from main process
    window.api.updater.onUpdateAvailable((info) => {
        elements.appVersionDesc.textContent = `Version ${info.version} is available!`;
        elements.btnCheckUpdate.disabled = false;
        elements.updateActionContainer.style.display = 'flex';
        elements.btnDownloadUpdate.style.display = 'block';
        elements.btnInstallUpdate.style.display = 'none';

        addLogEntry({
            type: 'message',
            timestamp: Date.now(),
            topic: 'System',
            payload: `Update available: v${info.version}`
        });
    });

    window.api.updater.onUpdateNotAvailable((info) => {
        updateVersionDisplay();
        elements.btnCheckUpdate.disabled = false;
        elements.updateActionContainer.style.display = 'none';
    });

    window.api.updater.onError((error) => {
        elements.appVersionDesc.textContent = `Update error: ${error}`;
        elements.btnCheckUpdate.disabled = false;
        elements.updateActionContainer.style.display = 'none';
        elements.updateProgressContainer.style.display = 'none';
    });

    window.api.updater.onDownloadProgress((progress) => {
        const percent = Math.round(progress.percent);
        elements.updateProgressBar.style.width = `${percent}%`;
        elements.updateProgressText.textContent = `${percent}% (${(progress.transferred / 1024 / 1024).toFixed(1)}MB / ${(progress.total / 1024 / 1024).toFixed(1)}MB)`;
    });

    window.api.updater.onUpdateDownloaded((info) => {
        elements.appVersionDesc.textContent = `Version ${info.version} downloaded and ready to install.`;
        elements.updateActionContainer.style.display = 'flex';
        elements.btnDownloadUpdate.style.display = 'none';
        elements.btnInstallUpdate.style.display = 'block';
        elements.updateProgressContainer.style.display = 'none';
    });
}

async function updateVersionDisplay() {
    const version = await window.api.app.getVersion();
    elements.appVersionDesc.textContent = `Current version: v${version}`;
}

// MQTT Events
function setupMqttEvents() {
    window.api.mqtt.onStatus((data) => {
        updateConnectionStatus(data.connected ? 'connected' : 'disconnected');
    });

    window.api.mqtt.onMessage((data) => {
        addLogEntry({
            type: 'message',
            timestamp: data.timestamp,
            topic: data.topic,
            payload: data.payload
        });
    });

    window.api.mqtt.onError((data) => {
        addLogEntry({
            type: 'error',
            timestamp: Date.now(),
            error: data.error
        });
    });

    window.api.bindings.onExecuted((data) => {
        addLogEntry({
            type: 'command',
            timestamp: data.timestamp,
            bindingName: data.bindingName,
            success: data.success,
            error: data.error
        });
    });

    window.api.notifications.onShown((data) => {
        addLogEntry({
            type: 'notification',
            timestamp: data.timestamp,
            bindingName: data.bindingName,
            success: data.success,
            error: data.error
        });
    });
}

// Load Initial Data
async function loadInitialData() {
    // Show current version
    await updateVersionDisplay();

    // Load connection config
    const connConfig = await window.api.config.getConnection();
    if (connConfig) {
        elements.brokerUrl.value = connConfig.brokerUrl || '';
        elements.username.value = connConfig.username || '';
        elements.password.value = connConfig.password || '';
        elements.clientId.value = connConfig.clientId || '';
    }

    // Load bindings
    bindings = await window.api.bindings.getAll() || [];
    renderBindings();

    // Load notification bindings
    notificationBindings = await window.api.notifications.getAll() || [];
    renderNotifications();

    // Load settings
    const settings = await window.api.config.getSettings();
    if (settings) {
        elements.settingAutoConnect.checked = settings.autoConnect || false;
        elements.settingMinimizeToTray.checked = settings.minimizeToTray !== false;
        elements.settingStartMinimized.checked = settings.startMinimized || false;
        elements.settingAutoLaunch.checked = settings.autoLaunch || false;
    }

    // Check current connection status
    const status = await window.api.mqtt.getStatus();
    updateConnectionStatus(status.connected ? 'connected' : 'disconnected');
}

// Utility
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Start
init();
