// Browser smoke tests for Chidi.md (P4-01, D-008). Run from tests/e2e: `npm test`.
const { defineConfig, devices } = require('@playwright/test');

const PORT = 8123;

module.exports = defineConfig({
    testDir: '.',
    fullyParallel: true,
    reporter: 'list',
    use: { baseURL: `http://localhost:${PORT}` },
    // Serve the repository root, exactly as a user would.
    webServer: {
        command: `python3 -m http.server ${PORT} --bind 127.0.0.1`,
        cwd: '../..',
        url: `http://localhost:${PORT}/index.html`,
        reuseExistingServer: false,
        stdout: 'ignore',
        stderr: 'ignore',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    ],
});
