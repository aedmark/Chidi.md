document.addEventListener('DOMContentLoaded', () => {
    // --- Element Constants ---
    const elements = {
        mdFileInput: document.getElementById('mdFileInput'),
        fileInputLabel: document.getElementById('fileInputLabel'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        summarizeBtn: document.getElementById('summarizeBtn'),
        suggestQuestionsBtn: document.getElementById('suggestQuestionsBtn'),
        askAllFilesBtn: document.getElementById('askAllFilesBtn'),
        scanFolderBtn: document.getElementById('scanFolderBtn'),
        markdownDisplay: document.getElementById('markdownDisplay'),
        messageBox: document.getElementById('messageBox'),
        loader: document.getElementById('loader'),
        mainTitle: document.getElementById('mainTitle'),
        fileCountDisplay: document.getElementById('fileCountDisplay'),
        saveSessionBtn: document.getElementById('saveSessionBtn'),
        restartSessionBtn: document.getElementById('restartSessionBtn'),
        restoreSessionModal: document.getElementById('restoreSessionModal'),
        inputModal: document.getElementById('inputModal'),
        inputModalTitle: document.getElementById('inputModalTitle'),
        inputModalText: document.getElementById('inputModalText'),
        inputModalField: document.getElementById('inputModalField'),
        confirmInputBtn: document.getElementById('confirmInputBtn'),
        cancelInputBtn: document.getElementById('cancelInputBtn'),
        askForm: document.getElementById('askForm'),
        askInput: document.getElementById('askInput'),
        askBtn: document.getElementById('askBtn'),
        modelSettingsBtn: document.getElementById('modelSettingsBtn'),
        modelSettingsModal: document.getElementById('modelSettingsModal'),
        modelApiStyle: document.getElementById('modelApiStyle'),
        modelBaseUrl: document.getElementById('modelBaseUrl'),
        modelName: document.getElementById('modelName'),
        modelSettingsError: document.getElementById('modelSettingsError'),
        fetchModelsBtn: document.getElementById('fetchModelsBtn'),
        saveModelSettingsBtn: document.getElementById('saveModelSettingsBtn'),
        cancelModelSettingsBtn: document.getElementById('cancelModelSettingsBtn'),
    };

    // --- Application State ---
    let state = {
        loadedFiles: [],
        history: [],
        historyIndex: -1,
        currentDisplayedMarkdownContent: '',
        chatHistory: [],
        modelSettings: null,
        isAsking: false,
    };

    const defaultTitle = "chidi.md";
    // Local model servers only, and no API keys (D-007).
    const DEFAULT_BASE_URLS = { ollama: 'http://localhost:11434', openai: 'http://localhost:8080/v1' };
    const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
    const SESSION_STORAGE_KEY = 'chidiMdSession';
    
    // --- Modal Logic ---
    const showInputModal = (config) => {
        return new Promise((resolve) => {
            elements.inputModalTitle.textContent = config.title;
            elements.inputModalText.textContent = config.prompt;
            elements.inputModalField.value = '';
            elements.inputModalField.placeholder = config.placeholder || '';
            elements.confirmInputBtn.textContent = config.confirmText || 'Confirm';
            elements.inputModal.classList.remove('hidden');
            elements.inputModalField.focus();

            const onConfirm = () => {
                cleanup();
                resolve(elements.inputModalField.value);
            };
            const onCancel = () => {
                cleanup();
                resolve(null);
            };
            const onKeydown = (e) => {
                if (e.key === 'Enter') onConfirm();
                if (e.key === 'Escape') onCancel();
            };

            const cleanup = () => {
                elements.inputModal.classList.add('hidden');
                elements.confirmInputBtn.removeEventListener('click', onConfirm);
                elements.cancelInputBtn.removeEventListener('click', onCancel);
                document.removeEventListener('keydown', onKeydown);
            };

            elements.confirmInputBtn.addEventListener('click', onConfirm);
            elements.cancelInputBtn.addEventListener('click', onCancel);
            document.addEventListener('keydown', onKeydown);
        });
    };

    // --- Core Functions ---
    const isLocalUrl = (value) => {
        try {
            const url = new URL(value);
            const host = url.hostname;
            return ['http:', 'https:'].includes(url.protocol) &&
                (LOCAL_HOSTS.includes(host) || host.endsWith('.localhost'));
        } catch {
            return false;
        }
    };
    const trimSlash = (value) => value.trim().replace(/\/+$/, '');

    // Both servers take OpenAI-style {role, content} messages; only the paths and reply shapes differ.
    const modelEndpoints = (settings) => settings.apiStyle === 'ollama'
        ? { chat: `${settings.baseUrl}/api/chat`, models: `${settings.baseUrl}/api/tags` }
        : { chat: `${settings.baseUrl}/chat/completions`, models: `${settings.baseUrl}/models` };

    // Returns [{name, chat}], where chat is true, false (cannot chat, e.g. an embedding model) or null (unknown).
    // Ollama reports capabilities per model; OpenAI-compatible servers do not, so there we only spot embedders by name.
    const ollamaCanChat = async (baseUrl, name) => {
        try {
            const response = await fetch(`${baseUrl}/api/show`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: name })
            });
            if (!response.ok) return null;
            const { capabilities } = await response.json();
            return Array.isArray(capabilities) ? capabilities.includes('completion') : null;
        } catch {
            return null;
        }
    };

    const listModels = async (settings) => {
        const response = await fetch(modelEndpoints(settings).models);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        const names = (settings.apiStyle === 'ollama'
            ? (result.models || []).map(m => m.name)
            : (result.data || []).map(m => m.id)
        ).filter(name => typeof name === 'string');
        if (settings.apiStyle === 'ollama') {
            const chat = await Promise.all(names.map(name => ollamaCanChat(settings.baseUrl, name)));
            return names.map((name, i) => ({ name, chat: chat[i] }));
        }
        return names.map(name => ({ name, chat: /embed/i.test(name) ? false : null }));
    };

    const fillModelSelect = (models, preferred) => {
        // Models that cannot chat stay visible, so the list matches the server, but cannot be picked (P2-04).
        const sorted = [...models.filter(m => m.chat !== false), ...models.filter(m => m.chat === false)];
        if (preferred && !models.some(m => m.name === preferred)) sorted.unshift({ name: preferred, chat: null });
        elements.modelName.replaceChildren(...sorted.map(({ name, chat }) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = chat === false ? `${name} (cannot chat)` : name;
            option.disabled = chat === false;
            return option;
        }));
        const keep = sorted.find(m => m.name === preferred && m.chat !== false);
        const first = sorted.find(m => m.chat !== false);
        elements.modelName.value = (keep || first || { name: '' }).name;
    };

    const readModelSettingsForm = () => ({
        apiStyle: elements.modelApiStyle.value,
        baseUrl: trimSlash(elements.modelBaseUrl.value),
        model: elements.modelName.value.trim(),
    });

    const showModelSettings = () => {
        return new Promise((resolve) => {
            const current = state.modelSettings || { apiStyle: 'ollama', baseUrl: DEFAULT_BASE_URLS.ollama, model: '' };
            elements.modelApiStyle.value = current.apiStyle;
            elements.modelBaseUrl.value = current.baseUrl;
            fillModelSelect([], current.model);
            elements.modelSettingsError.textContent = '';
            elements.modelSettingsModal.classList.remove('hidden');
            elements.modelBaseUrl.focus();

            let fetchId = 0;
            const onFetch = async () => {
                // Opening, changing style and editing the URL can each start a fetch; only the newest may fill the list.
                const id = ++fetchId;
                const settings = readModelSettingsForm();
                if (!isLocalUrl(settings.baseUrl)) {
                    elements.modelSettingsError.textContent = 'Only localhost, 127.0.0.1 or [::1] URLs are allowed.';
                    return;
                }
                elements.modelSettingsError.textContent = 'Asking the server...';
                try {
                    const models = await listModels(settings);
                    if (id !== fetchId) return;
                    fillModelSelect(models, settings.model || current.model);
                    const usable = models.filter(m => m.chat !== false).length;
                    elements.modelSettingsError.textContent = !models.length ? 'The server reported no models.'
                        : usable ? `Found ${usable} chat model(s).` : 'The server has no models that can chat.';
                } catch (error) {
                    if (id !== fetchId) return;
                    elements.modelSettingsError.textContent =
                        `Could not reach the server (${error.message}). Is it running, and does it allow this origin (CORS)?`;
                }
            };
            const onStyleChange = () => {
                // Swap the URL only if it is still the other style's default.
                if (Object.values(DEFAULT_BASE_URLS).includes(trimSlash(elements.modelBaseUrl.value))) {
                    elements.modelBaseUrl.value = DEFAULT_BASE_URLS[elements.modelApiStyle.value];
                }
                onFetch();
            };
            const onSave = () => {
                const settings = readModelSettingsForm();
                if (!isLocalUrl(settings.baseUrl)) {
                    elements.modelSettingsError.textContent = 'Only localhost, 127.0.0.1 or [::1] URLs are allowed.';
                    return;
                }
                if (!settings.model) {
                    elements.modelSettingsError.textContent = 'Pick a model; use Refresh List if none are shown.';
                    return;
                }
                state.modelSettings = settings;
                showMessage(`Model set: ${settings.model} at ${settings.baseUrl}.`, 'info');
                cleanup();
                updateUI();
                resolve(settings);
            };
            const onCancel = () => {
                cleanup();
                resolve(null);
            };
            const onKeydown = (e) => {
                if (e.key === 'Escape') onCancel();
            };
            const cleanup = () => {
                elements.modelSettingsModal.classList.add('hidden');
                elements.modelApiStyle.removeEventListener('change', onStyleChange);
                elements.fetchModelsBtn.removeEventListener('click', onFetch);
                elements.modelBaseUrl.removeEventListener('change', onFetch);
                elements.saveModelSettingsBtn.removeEventListener('click', onSave);
                elements.cancelModelSettingsBtn.removeEventListener('click', onCancel);
                document.removeEventListener('keydown', onKeydown);
            };

            elements.modelApiStyle.addEventListener('change', onStyleChange);
            elements.fetchModelsBtn.addEventListener('click', onFetch);
            elements.modelBaseUrl.addEventListener('change', onFetch);
            elements.saveModelSettingsBtn.addEventListener('click', onSave);
            elements.cancelModelSettingsBtn.addEventListener('click', onCancel);
            document.addEventListener('keydown', onKeydown);
            onFetch();
        });
    };

    // File content and model replies are untrusted: sanitise every render (D-006).
    const convertMarkdownToHtml = (markdownText) => DOMPurify.sanitize(marked.parse(markdownText));
    const showMessage = (message, type = 'info') => {
        elements.messageBox.textContent = `SYSTEM LOG: ${message}`;
        console[type === 'error' ? 'error' : (type === 'warn' ? 'warn' : 'info')](message);
    };
    const toggleLoader = (show) => elements.loader.classList.toggle('hidden', !show);
    const getCleanFilename = (filename) => {
        if (!filename) return '';
        const baseName = filename.substring(filename.lastIndexOf('/') + 1);
        return baseName.replace(/\.md$/, '');
    };

    // --- Session Management ---
    const saveSession = () => {
        if (state.loadedFiles.length === 0 && !state.modelSettings) {
            showMessage("Nothing to save.", "warn");
            return;
        }
        const sessionData = {
            loadedFiles: state.loadedFiles,
            history: state.history,
            historyIndex: state.historyIndex,
            chatHistory: state.chatHistory,
            modelSettings: state.modelSettings
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
        showMessage("Session saved successfully!", "success");
        const originalText = elements.saveSessionBtn.textContent;
        elements.saveSessionBtn.textContent = 'Saved!';
        elements.saveSessionBtn.disabled = true;
        setTimeout(() => {
            elements.saveSessionBtn.textContent = originalText;
            updateUI();
        }, 1500);
    };

    const restoreSession = () => {
        const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
        if (savedSession) {
            const sessionData = JSON.parse(savedSession);
            state.loadedFiles = sessionData.loadedFiles || [];
            state.history = sessionData.history || [];
            state.historyIndex = sessionData.historyIndex ?? -1;
            const settings = sessionData.modelSettings;
            state.modelSettings = settings && isLocalUrl(settings.baseUrl) ? settings : null;
            // Sessions saved before D-007 hold a Gemini key and Gemini-format chat; drop both from storage now.
            if ('apiKey' in sessionData || 'geminiChatHistory' in sessionData) {
                delete sessionData.apiKey;
                delete sessionData.geminiChatHistory;
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
            }

            showMessage("Previous session restored.", "success");

            if (state.historyIndex !== -1 && state.history[state.historyIndex] !== undefined) {
                displayFile(state.history[state.historyIndex]);
            }
            elements.restoreSessionModal.classList.add('hidden');
        } else {
            showMessage('Awaiting file selection.', 'info');
        }
    };
    
    const restartSession = () => {
        if (confirm("Are you sure you want to restart? This will clear all loaded files, history, and model settings.")) {
            state = { loadedFiles: [], history: [], historyIndex: -1, currentDisplayedMarkdownContent: '', chatHistory: [], modelSettings: null, isAsking: false };
            localStorage.removeItem(SESSION_STORAGE_KEY);
            elements.markdownDisplay.innerHTML = '<p class="placeholder-text">Awaiting file selection...</p>';
            elements.mainTitle.textContent = defaultTitle;
            document.title = "chidi.md";
            showMessage("Session restarted. All data cleared.", "info");
            updateUI();
        }
    };

    // --- UI Update Function ---
    const updateUI = () => {
        const hasFiles = state.loadedFiles.length > 0;
        const isDisplayingFile = state.historyIndex > -1;
        const hasSessionData = state.loadedFiles.length > 0 || !!state.modelSettings;
        elements.fileCountDisplay.textContent = `FILES: ${state.loadedFiles.length}`;
        elements.prevBtn.disabled = state.historyIndex <= 0;
        elements.nextBtn.disabled = !hasFiles;
        elements.summarizeBtn.disabled = !isDisplayingFile;
        elements.suggestQuestionsBtn.disabled = !isDisplayingFile;
        elements.askInput.disabled = !isDisplayingFile || state.isAsking;
        elements.askBtn.disabled = !isDisplayingFile || state.isAsking;
        elements.askAllFilesBtn.disabled = state.loadedFiles.length < 2;
        elements.saveSessionBtn.disabled = !hasSessionData;
        if (elements.restartSessionBtn) elements.restartSessionBtn.disabled = !hasSessionData && !localStorage.getItem(SESSION_STORAGE_KEY);
        elements.fileInputLabel.textContent = hasFiles ? "Add More" : "Add Files";
    };

    // --- File Processing ---
    const processAndStoreFile = (fileObject) => {
        const newFileCleanName = getCleanFilename(fileObject.name);
        const isDuplicate = state.loadedFiles.some(existingFile => 
            getCleanFilename(existingFile.name) === newFileCleanName && 
            existingFile.content === fileObject.content
        );

        if (!isDuplicate) {
            state.loadedFiles.push(fileObject);
            return true;
        }
        return false;
    };
    
    // --- Display Logic ---
    const displayFile = (fileIndex) => {
        if (fileIndex < 0 || fileIndex >= state.loadedFiles.length) return;
        const selectedFile = state.loadedFiles[fileIndex];
        const cleanFilename = getCleanFilename(selectedFile.name);
        elements.mainTitle.textContent = cleanFilename;
        document.title = `${cleanFilename} - chidi.md`;
        state.currentDisplayedMarkdownContent = selectedFile.content;
        elements.markdownDisplay.innerHTML = convertMarkdownToHtml(state.currentDisplayedMarkdownContent);
        showMessage(`Displaying: ${selectedFile.name}`, 'info');
        state.chatHistory = [{
            role: "user",
            content: `I am currently viewing an article titled "${cleanFilename}". Its full content is:\n\n\`\`\`markdown\n${state.currentDisplayedMarkdownContent}\n\`\`\`\n\nWe can discuss this article.`
        }];
        updateUI();
    };
    
    const pickAndDisplayRandomFile = () => {
        if (state.loadedFiles.length === 0) return;
        let newRandomIndex;
        do { newRandomIndex = Math.floor(Math.random() * state.loadedFiles.length); } 
        while (state.loadedFiles.length > 1 && state.history.length > 0 && newRandomIndex === state.history[state.historyIndex]);
        
        if (state.historyIndex < state.history.length - 1) {
            state.history = state.history.slice(0, state.historyIndex + 1);
        }
        state.history.push(newRandomIndex);
        state.historyIndex = state.history.length - 1;
        displayFile(newRandomIndex);
    };

    const addFilesAndDisplay = (fileObjects) => {
        if (fileObjects.length === 0) return;
        
        let addedCount = 0;
        const skippedFiles = [];
        let firstNewFileIndex = -1;

        for (const fileObject of fileObjects) {
            if (processAndStoreFile(fileObject)) {
                addedCount++;
                if (firstNewFileIndex === -1) {
                    firstNewFileIndex = state.loadedFiles.length - 1;
                }
            } else {
                skippedFiles.push(getCleanFilename(fileObject.name));
            }
        }

        let message = `Added ${addedCount} new file(s).`;
        if (skippedFiles.length > 0) message += ` Skipped ${skippedFiles.length} duplicate(s).`;
        
        if (addedCount > 0) {
            showMessage(message, 'success');
            // If nothing was displayed before, or to show the new file:
            const shouldDisplayNewFile = state.history.length === 0 || firstNewFileIndex !== -1;
            if (shouldDisplayNewFile) {
                if (state.historyIndex < state.history.length - 1) {
                    state.history = state.history.slice(0, state.historyIndex + 1);
                }
                state.history.push(firstNewFileIndex);
                state.historyIndex = state.history.length - 1;
                displayFile(firstNewFileIndex);
            }
        } else if (skippedFiles.length > 0) {
            showMessage(`Skipped ${skippedFiles.length} file(s) as they are already loaded.`, 'info');
        }
        updateUI();
    };
    
    const handleDirectoryScan = async () => {
        if (!window.showDirectoryPicker) {
            const message = "Folder scanning requires a compatible browser (e.g., Chrome, Edge) and must be run from a local server (http://localhost), not a file:// URL.";
            showMessage(message, "warn");
            alert(message);
            return;
        }
        toggleLoader(true);
        try {
            const dirHandle = await window.showDirectoryPicker();
            const processDirectory = async (directoryHandle, path = '') => {
                const fileObjects = [];
                for await (const entry of directoryHandle.values()) {
                    const newPath = path ? `${path}/${entry.name}` : entry.name;
                    if (entry.kind === 'file' && entry.name.endsWith('.md')) {
                        const file = await entry.getFile();
                        const content = await file.text();
                        fileObjects.push({ name: newPath, content: content });
                    } else if (entry.kind === 'directory') {
                        fileObjects.push(...await processDirectory(entry, newPath));
                    }
                }
                return fileObjects;
            };
            const mdFileObjects = await processDirectory(dirHandle);
            addFilesAndDisplay(mdFileObjects);

        } catch (error) {
            if (error.name !== 'AbortError') {
                showMessage("Folder Scan Error. See console.", "error");
                console.error("Folder Scan Error:", error);
            }
        } finally {
            toggleLoader(false);
        }
    };

    // --- AI Functions ---
    const callModel = async (messages) => {
        const settings = state.modelSettings || await showModelSettings();
        if (!settings) return "Error: No local model configured.";
        if (!isLocalUrl(settings.baseUrl)) return "Error: Only local model servers are allowed.";
        toggleLoader(true);
        try {
            const response = await fetch(modelEndpoints(settings).chat, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: settings.model, messages, stream: false })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            const text = settings.apiStyle === 'ollama'
                ? result.message?.content
                : result.choices?.[0]?.message?.content;
            return typeof text === 'string' && text ? text : "Error: Invalid response from the model server.";
        } catch (error) {
            showMessage("Failed to reach the local model server. Check Model settings and the console.", "error");
            return `Error: ${error.message}`;
        } finally {
            toggleLoader(false);
        }
    };

    const appendAiOutput = (title, content) => {
        const container = document.createElement('div');
        // The title can contain model-suggested text, so it is set as text, never as HTML (P1-02).
        const heading = document.createElement('h3');
        heading.textContent = title;
        container.append(document.createElement('hr'), heading);
        const contentBody = document.createElement('div');
        if (title.startsWith("Suggested Questions")) {
            content.split('\n').filter(line => line.trim().endsWith('?')).forEach(q => {
                const btn = document.createElement('button');
                btn.textContent = q.replace(/^[0-9*.-]+\s*/, '').trim();
                btn.className = 'question-button';
                btn.onclick = () => handleQuestionClick(btn.textContent);
                contentBody.appendChild(btn);
            });
        } else {
            contentBody.innerHTML = convertMarkdownToHtml(content);
        }
        container.appendChild(contentBody);
        elements.markdownDisplay.appendChild(container);
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    
    // Typed questions and suggested-question buttons share one conversation about the current file (P2-01).
    const askAboutCurrentFile = async (question) => {
        if (state.isAsking || !question.trim()) return;
        const questionButtons = document.querySelectorAll('.question-button');
        try {
            // One question at a time, so answers land in the order they were asked.
            state.isAsking = true;
            questionButtons.forEach(btn => btn.disabled = true);
            updateUI();

            showMessage("Getting answer...", "info");
            state.chatHistory.push({ role: "user", content: question });
            const answer = await callModel(state.chatHistory);
            state.chatHistory.push({ role: "assistant", content: answer });
            appendAiOutput(`Answer to: "${question}"`, answer);
            showMessage("Answer generated!", "success");
        } finally {
            state.isAsking = false;
            questionButtons.forEach(btn => btn.disabled = false);
            updateUI();
        }
    };
    const handleQuestionClick = askAboutCurrentFile;

    // --- Event Listeners ---
    elements.mdFileInput.addEventListener('change', async (event) => {
        const files = Array.from(event.target.files).filter(f => f.name.endsWith('.md'));
        if (files.length === 0) return;
        
        const fileObjects = [];
        for(const file of files) {
            const content = await file.text();
            fileObjects.push({ name: file.name, content });
        }
        addFilesAndDisplay(fileObjects);
        
        event.target.value = ''; // Reset file input
    });

    elements.prevBtn.addEventListener('click', () => {
        if (state.historyIndex > 0) {
            state.historyIndex--;
            displayFile(state.history[state.historyIndex]);
        }
    });

    elements.nextBtn.addEventListener('click', () => {
        if (state.historyIndex < state.history.length - 1) {
            state.historyIndex++;
            displayFile(state.history[state.historyIndex]);
        } else {
            pickAndDisplayRandomFile();
        }
    });
    
    elements.summarizeBtn.addEventListener('click', async () => {
        const chat = [...state.chatHistory, { role: "user", content: "Summarize the current article concisely." }];
        const summary = await callModel(chat);
        appendAiOutput("Article Summary", summary);
    });
    
    elements.suggestQuestionsBtn.addEventListener('click', async () => {
        const prompt = "Directly provide a list of 3-4 thought-provoking questions based on the article. Each question must end with a question mark.";
        const chat = [...state.chatHistory, { role: "user", content: prompt }];
        const questions = await callModel(chat);
        appendAiOutput("Suggested Questions", questions);
    });

    elements.askAllFilesBtn.addEventListener('click', async () => {
        const userQuestion = await showInputModal({
            title: "Ask All Files",
            prompt: "What question would you like to ask across all loaded documents?",
            placeholder: "e.g., 'Summarize the main points from all documents'",
            confirmText: "Ask"
        });
        if (!userQuestion || userQuestion.trim() === '') return;
        let combinedContent = "You have access to the following documents:\n\n";
        state.loadedFiles.forEach(file => { combinedContent += `--- DOCUMENT: ${file.name} ---\n${file.content}\n\n`; });
        const prompt = `${combinedContent}Based on all the documents provided, please answer the following question: ${userQuestion}`;
        const answer = await callModel([{ role: 'user', content: prompt }]);
        appendAiOutput(`Answer based on all files`, answer);
    });
    
    elements.askForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const question = elements.askInput.value.trim();
        if (!question) return;
        elements.askInput.value = '';
        await askAboutCurrentFile(question);
        elements.askInput.focus();
    });

    elements.scanFolderBtn.addEventListener('click', handleDirectoryScan);
    elements.saveSessionBtn.addEventListener('click', saveSession);
    elements.modelSettingsBtn.addEventListener('click', showModelSettings);
    if (elements.restartSessionBtn) {
        elements.restartSessionBtn.addEventListener('click', restartSession);
    }
    
    // --- Initial Setup ---
    const initialize = () => {
        elements.mainTitle.textContent = defaultTitle;
        restoreSession();
        updateUI();
    };

    initialize();
});