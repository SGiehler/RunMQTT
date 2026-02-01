module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        'electron/**/*.js',
        '!electron/main.js',
        '!electron/preload.js'
    ],
    coverageDirectory: 'coverage',
    verbose: true
};
