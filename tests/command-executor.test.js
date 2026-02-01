const CommandExecutor = require('../electron/command-executor');

// Mock child_process
jest.mock('child_process', () => ({
    exec: jest.fn((cmd, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
        }
        // Simulate successful execution
        if (callback) {
            callback(null, 'success', '');
        }
    }),
    spawn: jest.fn(() => ({
        on: jest.fn((event, handler) => {
            if (event === 'error') {
                // Don't trigger error by default
            }
        }),
        unref: jest.fn(),
        pid: 12345
    }))
}));

// Mock fs for batch script tests
jest.mock('fs', () => ({
    writeFile: jest.fn((path, content, callback) => callback(null)),
    unlink: jest.fn((path, callback) => callback(null))
}));

// Mock os
jest.mock('os', () => ({
    tmpdir: jest.fn(() => '/tmp')
}));

describe('CommandExecutor', () => {
    let executor;

    beforeEach(() => {
        executor = new CommandExecutor();
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should have all action handlers registered', () => {
            expect(executor.actionHandlers).toHaveProperty('run-program');
            expect(executor.actionHandlers).toHaveProperty('shell-command');
            expect(executor.actionHandlers).toHaveProperty('batch-script');
            expect(executor.actionHandlers).toHaveProperty('volume');
            expect(executor.actionHandlers).toHaveProperty('keyboard');
            expect(executor.actionHandlers).toHaveProperty('notification');
        });
    });

    describe('execute', () => {
        test('should throw error for unknown action type', async () => {
            await expect(executor.execute({ type: 'unknown' }))
                .rejects.toThrow('Unknown action type: unknown');
        });

        test('should call correct handler for shell-command', async () => {
            const action = { type: 'shell-command', command: 'echo test' };
            const result = await executor.execute(action);
            expect(result).toHaveProperty('stdout');
        });
    });

    describe('shellCommand', () => {
        test('should execute PowerShell command by default', async () => {
            const { exec } = require('child_process');
            await executor.shellCommand({ command: 'Get-Process' });

            expect(exec).toHaveBeenCalled();
            const callArgs = exec.mock.calls[0][0];
            expect(callArgs).toContain('powershell');
        });

        test('should execute cmd command when shell is cmd', async () => {
            const { exec } = require('child_process');
            await executor.shellCommand({ command: 'dir', shell: 'cmd' });

            expect(exec).toHaveBeenCalled();
            const callArgs = exec.mock.calls[0][0];
            expect(callArgs).toContain('cmd /c');
        });
    });

    describe('runProgram', () => {
        test('should spawn program with arguments', async () => {
            const { spawn } = require('child_process');

            const result = await executor.runProgram({
                program: 'notepad.exe',
                args: 'test.txt'
            });

            expect(spawn).toHaveBeenCalledWith(
                'notepad.exe',
                ['test.txt'],
                expect.objectContaining({ detached: true })
            );
            expect(result).toHaveProperty('started', true);
            expect(result).toHaveProperty('pid');
        });

        test('should handle empty arguments', async () => {
            const { spawn } = require('child_process');

            await executor.runProgram({
                program: 'notepad.exe',
                args: ''
            });

            expect(spawn).toHaveBeenCalledWith(
                'notepad.exe',
                [],
                expect.any(Object)
            );
        });
    });

    describe('batchScript', () => {
        test('should execute script file when scriptFile is provided', async () => {
            const { exec } = require('child_process');

            await executor.batchScript({
                scriptFile: 'C:\\Scripts\\test.bat'
            });

            expect(exec).toHaveBeenCalled();
            const callArgs = exec.mock.calls[0][0];
            expect(callArgs).toContain('C:\\Scripts\\test.bat');
        });

        test('should create temp file for inline script', async () => {
            const fs = require('fs');

            await executor.batchScript({
                script: '@echo off\necho Hello'
            });

            expect(fs.writeFile).toHaveBeenCalled();
        });

        test('should reject when no script or scriptFile provided', async () => {
            await expect(executor.batchScript({}))
                .rejects.toThrow('Either scriptFile or script content must be provided');
        });
    });

    describe('setVolume', () => {
        test('should clamp volume to valid range', async () => {
            const { exec } = require('child_process');

            await executor.setVolume({ level: '150' });

            expect(exec).toHaveBeenCalled();
            // Volume should be clamped to 100
        });

        test('should handle volume level 0', async () => {
            const result = await executor.setVolume({ level: '0' });
            expect(result).toHaveProperty('volumeSet', 0);
        });
    });

    describe('sendKeyboard', () => {
        test('should execute SendKeys command', async () => {
            const { exec } = require('child_process');

            const result = await executor.sendKeyboard({ keys: '{ENTER}' });

            expect(exec).toHaveBeenCalled();
            expect(result).toHaveProperty('keysSent', '{ENTER}');
        });
    });
});
