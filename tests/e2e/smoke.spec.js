// Smoke tests: the user's main paths, with the CDN served from node_modules and a stubbed local model server,
// so a run needs no network and no real model.
const { test: base, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const CDN = {
    'https://cdn.jsdelivr.net/npm/marked@18.0.14/lib/marked.umd.js': 'node_modules/marked/lib/marked.umd.js',
    'https://cdn.jsdelivr.net/npm/dompurify@3.4.16/dist/purify.min.js': 'node_modules/dompurify/dist/purify.min.js',
};
const MODEL = 'http://localhost:11434';
const CORS = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
};

const md = (name, text) => ({ name, mimeType: 'text/markdown', buffer: Buffer.from(text) });
const TEA = md('tea.md', '# Tea\n\nGreen tea is not oxidised.');
const COFFEE = md('coffee.md', '# Coffee\n\nArabica is milder than robusta.');

// Every request goes to the app's own server, the CDN copies, or the stub model; anything else is recorded and
// refused, which proves documents only go where the app says.
const routeAll = async (page) => {
    const net = { outside: [], modelRequests: [], modelReply: 'Stub reply.' };
    await page.context().route('**/*', async (route) => {
        const request = route.request();
        const url = request.url();
        if (url.startsWith('http://localhost:8123/')) return route.continue();
        if (CDN[url]) {
            return route.fulfill({
                body: fs.readFileSync(path.join(__dirname, CDN[url])),
                contentType: 'application/javascript',
                headers: { 'access-control-allow-origin': '*' },
            });
        }
        if (url.startsWith(MODEL)) {
            if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
            const body = request.postDataJSON();
            net.modelRequests.push({ url, body });
            const { pathname } = new URL(url);
            const json = {
                '/api/tags': { models: [{ name: 'stub-chat' }] },
                '/v1/models': { data: [{ id: 'stub-chat' }] },
                '/api/chat': { message: { role: 'assistant', content: net.modelReply } },
                '/v1/chat/completions': { choices: [{ message: { role: 'assistant', content: net.modelReply } }] },
            }[pathname];
            return json ? route.fulfill({ json, headers: CORS }) : route.fulfill({ status: 404, headers: CORS });
        }
        if (/fonts\.(googleapis|gstatic)\.com/.test(url)) return route.abort();
        net.outside.push(url);
        return route.abort();
    });
    page.on('dialog', (dialog) => dialog.accept());
    return net;
};

// `net` routes every request and, after each test, fails it if anything tried to leave the machine.
// Set `net.modelReply` to choose what the stub model answers.
const test = base.extend({
    net: async ({ page }, use) => {
        const net = await routeAll(page);
        await use(net);
        expect(net.outside, 'requests to hosts outside the allowed list').toEqual([]);
    },
});

const addFiles = (page, files) => page.locator('#mdFileInput').setInputFiles(files);

const configureModel = async (page, { style, url }) => {
    await page.locator('#modelSettingsBtn').click();
    await page.locator('#modelApiStyle').selectOption(style);
    await page.locator('#modelBaseUrl').fill(url);
    await page.locator('#fetchModelsBtn').click();
    await expect(page.locator('#modelSettingsError')).toHaveText('Found 1 model(s).');
    await expect(page.locator('#modelName')).toHaveValue('stub-chat');
    await page.locator('#saveModelSettingsBtn').click();
    await expect(page.locator('#modelSettingsModal')).toBeHidden();
};

test('loads files, skips duplicates, and navigates history', async ({ page, net }) => {
    await page.goto('/');
    await addFiles(page, [TEA, COFFEE]);
    await expect(page.locator('#fileCountDisplay')).toHaveText('FILES: 2');
    await expect(page.locator('#mainTitle')).toHaveText('tea');
    await expect(page.locator('#markdownDisplay h1')).toHaveText('Tea');

    await addFiles(page, [TEA]);
    await expect(page.locator('#messageBox')).toContainText('already loaded');
    await expect(page.locator('#fileCountDisplay')).toHaveText('FILES: 2');

    await page.locator('#nextBtn').click();
    await expect(page.locator('#mainTitle')).toHaveText('coffee');
    await page.locator('#prevBtn').click();
    await expect(page.locator('#mainTitle')).toHaveText('tea');
});

test('saves, restores after reload, and restarts', async ({ page, net }) => {
    await page.goto('/');
    await addFiles(page, [TEA, COFFEE]);
    await page.locator('#nextBtn').click();
    await page.locator('#saveSessionBtn').click();
    await expect(page.locator('#messageBox')).toContainText('saved');

    await page.reload();
    await expect(page.locator('#fileCountDisplay')).toHaveText('FILES: 2');
    await expect(page.locator('#mainTitle')).toHaveText('coffee');

    await page.locator('#restartSessionBtn').click();
    await expect(page.locator('#fileCountDisplay')).toHaveText('FILES: 0');
    expect(await page.evaluate(() => localStorage.getItem('chidiMdSession'))).toBeNull();
});

test('sanitises hostile Markdown (D-006)', async ({ page, net }) => {
    await page.goto('/');
    const hostile = '# Evil\n\n<img src=x onerror="window.__xss=1"> <script>window.__xss=2</script> [x](javascript:window.__xss=3)';
    await addFiles(page, [md('evil.md', hostile)]);
    const display = page.locator('#markdownDisplay');
    await expect(display.locator('h1')).toHaveText('Evil');
    await expect(display.locator('img')).toHaveCount(1);
    await expect(display.locator('[onerror], script, a[href^="javascript"]')).toHaveCount(0);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
});

test('refuses a non-local model URL (D-007)', async ({ page, net }) => {
    await page.goto('/');
    await page.locator('#modelSettingsBtn').click();
    await page.locator('#modelBaseUrl').fill('https://api.example.com/v1');
    await page.locator('#modelName').fill('anything');
    await page.locator('#fetchModelsBtn').click();
    await expect(page.locator('#modelSettingsError')).toContainText('Only localhost');
    await page.locator('#saveModelSettingsBtn').click();
    await expect(page.locator('#modelSettingsError')).toContainText('Only localhost');
    await expect(page.locator('#modelSettingsModal')).toBeVisible();
});

test('summarises through the Ollama API', async ({ page, net }) => {
    const { modelRequests } = net;
    net.modelReply = 'A **short** summary.';
    await page.goto('/');
    await addFiles(page, [TEA]);
    await configureModel(page, { style: 'ollama', url: MODEL });
    await page.locator('#summarizeBtn').click();
    await expect(page.locator('#markdownDisplay strong')).toHaveText('short');

    const chat = modelRequests.find((r) => r.url === `${MODEL}/api/chat`);
    expect(chat.body.model).toBe('stub-chat');
    expect(chat.body.stream).toBe(false);
    expect(chat.body.messages[0].content).toContain('Green tea is not oxidised.');
    expect(chat.body.messages.at(-1)).toEqual({ role: 'user', content: 'Summarize the current article concisely.' });
});

test('suggests questions and answers a follow-up through an OpenAI-compatible API', async ({ page, net }) => {
    const { modelRequests } = net;
    net.modelReply = '1. Why is green tea not oxidised?\n2. <b>What</b> about black tea?';
    await page.goto('/');
    await addFiles(page, [TEA]);
    await configureModel(page, { style: 'openai', url: `${MODEL}/v1` });

    await page.locator('#suggestQuestionsBtn').click();
    const buttons = page.locator('.question-button');
    await expect(buttons).toHaveCount(2);
    // Model text in a heading must stay text (P1-02).
    await buttons.nth(1).click();
    await expect(page.locator('#markdownDisplay h3').last()).toHaveText('Answer to: "<b>What</b> about black tea?"');

    const chats = modelRequests.filter((r) => r.url === `${MODEL}/v1/chat/completions`);
    expect(chats).toHaveLength(2);
    expect(chats[1].body.messages.at(-1)).toEqual({ role: 'user', content: '<b>What</b> about black tea?' });
});

test('asks a question across all files', async ({ page, net }) => {
    const { modelRequests } = net;
    await page.goto('/');
    await addFiles(page, [TEA, COFFEE]);
    await configureModel(page, { style: 'ollama', url: MODEL });
    await page.locator('#askAllFilesBtn').click();
    await page.locator('#inputModalField').fill('Which drinks are mentioned?');
    await page.locator('#confirmInputBtn').click();
    await expect(page.locator('#markdownDisplay h3').last()).toHaveText('Answer based on all files');

    const prompt = modelRequests.find((r) => r.url === `${MODEL}/api/chat`).body.messages[0].content;
    expect(prompt).toContain('Green tea');
    expect(prompt).toContain('Arabica');
    expect(prompt).toContain('Which drinks are mentioned?');
});

test('removes a Gemini key saved by an older version (D-007)', async ({ page, net }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('chidiMdSession', JSON.stringify({
        loadedFiles: [{ name: 'tea.md', content: '# Tea' }], history: [0], historyIndex: 0,
        apiKey: 'EXAMPLE-NOT-A-KEY', geminiChatHistory: [{ role: 'user', parts: [{ text: 'x' }] }],
        modelSettings: { apiStyle: 'openai', baseUrl: 'https://remote.example.com/v1', model: 'm' },
    })));
    await page.reload();
    await expect(page.locator('#mainTitle')).toHaveText('tea');
    const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('chidiMdSession')));
    expect(saved).not.toHaveProperty('apiKey');
    expect(saved).not.toHaveProperty('geminiChatHistory');

    // The saved remote URL is ignored, so asking for a summary opens the Model dialog instead of sending.
    await page.locator('#summarizeBtn').click();
    await expect(page.locator('#modelSettingsModal')).toBeVisible();
    await expect(page.locator('#modelBaseUrl')).toHaveValue(MODEL);
});
