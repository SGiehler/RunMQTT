const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class CommandExecutor {
    constructor() {
        this.actionHandlers = {
            'run-program': this.runProgram.bind(this),
            'shell-command': this.shellCommand.bind(this),
            'batch-script': this.batchScript.bind(this),
            'volume': this.setVolume.bind(this),
            'keyboard': this.sendKeyboard.bind(this),
            'notification': this.showNotification.bind(this)
        };
    }

    async execute(action) {
        const handler = this.actionHandlers[action.type];
        if (!handler) {
            throw new Error(`Unknown action type: ${action.type}`);
        }
        return await handler(action);
    }

    runProgram(action) {
        return new Promise((resolve, reject) => {
            const { program, args = '', workingDir } = action;

            const options = {};
            if (workingDir) {
                options.cwd = workingDir;
            }

            const argsArray = args.split(' ').filter(a => a.trim());
            const child = spawn(program, argsArray, {
                ...options,
                detached: true,
                stdio: 'ignore'
            });

            child.unref();

            child.on('error', (error) => {
                reject(error);
            });

            // Give it a moment to start
            setTimeout(() => resolve({ started: true, pid: child.pid }), 100);
        });
    }

    shellCommand(action) {
        return new Promise((resolve, reject) => {
            const { command, shell = 'powershell' } = action;

            const shellCmd = shell === 'cmd'
                ? `cmd /c "${command}"`
                : `powershell -Command "${command.replace(/"/g, '\\"')}"`;

            exec(shellCmd, { timeout: 30000 }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr || error.message));
                } else {
                    resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
                }
            });
        });
    }

    batchScript(action) {
        return new Promise((resolve, reject) => {
            const { script, scriptFile } = action;

            // If a script file path is provided, run it directly
            if (scriptFile) {
                exec(`cmd /c "${scriptFile}"`, { timeout: 60000 }, (error, stdout, stderr) => {
                    if (error) {
                        reject(new Error(stderr || error.message));
                    } else {
                        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
                    }
                });
                return;
            }

            // If inline script content is provided, write to temp file and execute
            if (script) {
                const tempDir = os.tmpdir();
                const tempFile = path.join(tempDir, `mqtt_cmd_${Date.now()}.bat`);

                // Write script to temp file
                fs.writeFile(tempFile, script, (writeErr) => {
                    if (writeErr) {
                        reject(new Error(`Failed to create temp script: ${writeErr.message}`));
                        return;
                    }

                    // Execute the batch file
                    exec(`cmd /c "${tempFile}"`, { timeout: 60000 }, (error, stdout, stderr) => {
                        // Clean up temp file
                        fs.unlink(tempFile, () => { });

                        if (error) {
                            reject(new Error(stderr || error.message));
                        } else {
                            resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
                        }
                    });
                });
                return;
            }

            reject(new Error('Either scriptFile or script content must be provided'));
        });
    }

    setVolume(action) {
        return new Promise((resolve, reject) => {
            const { level } = action;
            const volumeLevel = Math.max(0, Math.min(100, parseInt(level, 10)));

            // Using PowerShell to set system volume
            const psScript = `
        $vol = ${volumeLevel / 100};
        $obj = New-Object -ComObject WScript.Shell;
        1..50 | ForEach-Object { $obj.SendKeys([char]174) };
        $steps = [math]::Round($vol * 50);
        1..$steps | ForEach-Object { $obj.SendKeys([char]175) };
      `;

            exec(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr || error.message));
                } else {
                    resolve({ volumeSet: volumeLevel });
                }
            });
        });
    }

    sendKeyboard(action) {
        return new Promise((resolve, reject) => {
            const { keys } = action;

            // Using PowerShell's SendKeys
            const psScript = `
        Add-Type -AssemblyName System.Windows.Forms;
        [System.Windows.Forms.SendKeys]::SendWait("${keys}");
      `;

            exec(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr || error.message));
                } else {
                    resolve({ keysSent: keys });
                }
            });
        });
    }

    showNotification(action) {
        // This is handled in main.js via Electron's Notification API
        // This handler is for manual/test invocations
        const { Notification } = require('electron');
        return new Promise((resolve) => {
            if (Notification.isSupported()) {
                new Notification({
                    title: action.title || 'MQTT Notification',
                    body: action.body || ''
                }).show();
            }
            resolve({ shown: true });
        });
    }
}

module.exports = CommandExecutor;
