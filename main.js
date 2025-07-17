document.addEventListener('DOMContentLoaded', () => {
    "use strict";

    // --- Application State ---
    let state = {
        loadedFiles: [],
        currentIndex: -1,
        isVerbose: false,
        geminiChatHistory: [],
        apiKey: null,
        isChatActive: false,
    };

    const SESSION_STORAGE_KEY = 'chidiMdSession_v2';

    // --- DOM Element Cache ---
    let elements = {};

    // --- Utility Functions ---
    const getFileExtension = (filename) => filename.split('.').pop();
    const showMessage = (msg) => {
        if (elements.messageBox) elements.messageBox.textContent = `LOG: ${msg}`;
        if (state.isVerbose) console.log(msg);
    };
    const toggleLoader = (show) => {
        if (elements.loader) elements.loader.classList.toggle('hidden', !show);
    };

    // --- Core Application Logic (Chidi Manager) ---
    const App = {
        init() {
            // Restore session or show file prompt
            const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
            if (savedSession) {
                const sessionData = JSON.parse(savedSession);
                state.loadedFiles = sessionData.loadedFiles || [];
                state.currentIndex = sessionData.currentIndex ?? -1;
                state.apiKey = sessionData.apiKey || null;
                state.geminiChatHistory = sessionData.geminiChatHistory || [];
                if (state.loadedFiles.length > 0) {
                     UI.buildMainApp();
                     UI.update();
                     showMessage("Previous session restored.");
                } else {
                     UI.buildFilePrompt();
                }
            } else {
                UI.buildFilePrompt();
            }
        },
        addFiles(fileObjects) {
            const addedFiles = [];
            for (const fileObject of fileObjects) {
                const isDuplicate = state.loadedFiles.some(f => f.name === fileObject.name && f.content === fileObject.content);
                if (!isDuplicate) {
                    const fileExt = getFileExtension(fileObject.name);
                    addedFiles.push({
                        ...fileObject,
                        isCode: ['js', 'sh'].includes(fileExt)
                    });
                }
            }

            if (addedFiles.length > 0) {
                state.loadedFiles.push(...addedFiles);
                state.currentIndex = state.loadedFiles.length - addedFiles.length; // Point to first new file
                if (!document.getElementById('chidi-console-panel')) {
                    UI.buildMainApp();
                }
                UI.update();
                showMessage(`Added ${addedFiles.length} new file(s).`);
            } else {
                showMessage("Skipped duplicate file(s).");
            }
        },
        selectFile(index) {
            state.currentIndex = index;
            UI.update();
            showMessage(`Displaying: ${state.loadedFiles[index].name}`);
        },
        async getApiKey() {
            if (state.apiKey) return state.apiKey;
            // Simplified API key prompt
            const key = prompt("Please enter your Gemini API Key:");
            if (key) {
                state.apiKey = key;
                showMessage("API Key accepted. Saving to session.");
                this.saveSession();
                return key;
            }
            showMessage("API Key not provided. AI features are disabled.");
            return null;
        },
        saveSession() {
            if (state.loadedFiles.length === 0) return;
            const sessionData = {
                loadedFiles: state.loadedFiles,
                currentIndex: state.currentIndex,
                apiKey: state.apiKey,
                geminiChatHistory: state.geminiChatHistory
            };
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
            showMessage("Session saved successfully!");
        },
        async callLlmApi(chatHistory, systemPrompt = null) {
            const apiKey = await this.getApiKey();
            if (!apiKey) return "Error: API Key not provided.";

            toggleLoader(true);
            try {
                const body = { contents: chatHistory };
                if (systemPrompt) {
                    body.systemInstruction = { role: "system", parts: [{ text: systemPrompt }] };
                }

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error.message || `HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) throw new Error("Invalid response from AI.");
                return text;

            } catch (error) {
                showMessage(`AI Error: ${error.message}`);
                return `Error: ${error.message}`;
            } finally {
                toggleLoader(false);
            }
        },
        // --- AI Feature Methods ---
        async summarize() {
            const file = state.loadedFiles[state.currentIndex];
            if (!file) return;
            const prompt = `Please provide a concise summary of the following document named "${file.name}":\n\n---\n\n${file.content}`;
            const summary = await this.callLlmApi([{ role: 'user', parts: [{ text: prompt }] }]);
            UI.appendAiOutput("Summary", summary);
        },
        async study() {
            const file = state.loadedFiles[state.currentIndex];
            if (!file) return;
            const prompt = `Based on the document "${file.name}", what are some insightful questions a user might ask?\n\n---\n\n${file.content}`;
            const questions = await this.callLlmApi([{ role: 'user', parts: [{ text: prompt }] }]);
            UI.appendAiOutput("Suggested Questions", questions);
        },
        async autoLink() {
            const allContent = state.loadedFiles.map(f => `--- DOCUMENT: ${f.name} ---\n${f.content}`).join('\n\n');
            const conceptsPrompt = `From the following text, extract a list of up to 15 key concepts. Return ONLY a comma-separated list.\n\nTEXT:\n${allContent}`;
            const conceptsResult = await this.callLlmApi([{role: 'user', parts: [{text: conceptsPrompt}]}]);
            if (conceptsResult.startsWith("Error:")) { UI.appendAiOutput("Auto-Link Error", conceptsResult); return; }

            const keyConcepts = conceptsResult.split(',').map(c => c.trim()).filter(Boolean);
            const summaryPrompt = `Write a concise, one-paragraph summary of the document set below, naturally incorporating these key concepts: ${keyConcepts.join(', ')}.\n\nDOCUMENTS:\n${allContent}`;
            const summaryResult = await this.callLlmApi([{ role: 'user', parts: [{ text: summaryPrompt }] }]);
            if (summaryResult.startsWith("Error:")) { UI.appendAiOutput("Auto-Link Error", summaryResult); return; }

            let linkedSummary = summaryResult;
            keyConcepts.forEach(concept => {
                const regex = new RegExp(`\\b(${concept})\\b`, 'gi');
                linkedSummary = linkedSummary.replace(regex, '<b>$1</b>'); // Simple bolding instead of custom syntax
            });
            UI.appendAiOutput("Auto-Linked Summary", linkedSummary);
        }
    };

    // --- UI Building and Management ---
    const UI = {
        buildFilePrompt() {
            const container = document.getElementById('app-container');
            container.innerHTML = ''; // Clear previous UI
            const promptPanel = this._createEl('div', { id: 'chidi-console-panel' });
            const label = this._createEl('label', { textContent: 'Select .md, .txt, .js, or .sh files to begin', className: 'chidi-btn primary-action' });
            label.setAttribute('for', 'mdFileInput');
            promptPanel.append(this._createEl('h1', { id: 'chidi-mainTitle', textContent: 'chidi.md' }), label);
            container.append(promptPanel);
        },
        buildMainApp() {
            const container = document.getElementById('app-container');
            container.innerHTML = ''; // Clear previous UI

            const header = this._createEl('header', { className: 'chidi-console-header' }, [
                this._createEl('h1', { id: 'chidi-mainTitle' }),
                this._createEl('div', { id: 'chidi-loader', className: 'loader hidden' })
            ]);

            const display = this._createEl('main', { id: 'chidi-markdownDisplay' });

            const controls = this._createEl('div', { className: 'controls-container' }, [
                this._createEl('div', { className: 'control-group' }, [
                    this._createEl('button', { id: 'prevBtn', className: 'chidi-btn', textContent: '<' }),
                    this._createEl('select', { id: 'fileSelector', className: 'chidi-btn' }),
                    this._createEl('button', { id: 'nextBtn', className: 'chidi-btn', textContent: '>' })
                ]),
                this._createEl('div', { className: 'control-group' }, [
                    this._createEl('button', { id: 'summarizeBtn', className: 'chidi-btn secondary-action', textContent: 'Summarize' }),
                    this._createEl('button', { id: 'studyBtn', className: 'chidi-btn secondary-action', textContent: 'Study' }),
                    this._createEl('button', { id: 'autoLinkBtn', className: 'chidi-btn secondary-action', textContent: 'Auto-Link' }),
                    this._createEl('button', { id: 'chatBtn', className: 'chidi-btn secondary-action', textContent: 'Chat' })
                ])
            ]);

            const footer = this._createEl('footer', { className: 'chidi-status-readout' }, [
                this._createEl('div', { id: 'fileCountDisplay', className: 'chidi-status-item' }),
                this._createEl('div', { id: 'messageBox', className: 'chidi-status-message' }),
                this._createEl('div', { className: 'control-group' }, [
                    this._createEl('button', { id: 'saveSessionBtn', className: 'chidi-btn', textContent: 'Save' }),
                    this._createEl('label', { textContent: 'Add Files', className: 'chidi-btn primary-action', for: 'mdFileInput' })
                ])
            ]);

            const consolePanel = this._createEl('div', { id: 'chidi-console-panel' }, [header, display, controls, footer]);
            container.appendChild(consolePanel);

            this._cacheElements();
            this._setupEventListeners();
        },
        _cacheElements() {
            const get = (id) => document.getElementById(id);
            elements = {
                mainTitle: get('chidi-mainTitle'),
                loader: get('chidi-loader'),
                markdownDisplay: get('chidi-markdownDisplay'),
                prevBtn: get('prevBtn'),
                nextBtn: get('nextBtn'),
                fileSelector: get('fileSelector'),
                summarizeBtn: get('summarizeBtn'),
                studyBtn: get('studyBtn'),
                autoLinkBtn: get('autoLinkBtn'),
                chatBtn: get('chatBtn'),
                fileCountDisplay: get('fileCountDisplay'),
                messageBox: get('messageBox'),
                saveSessionBtn: get('saveSessionBtn'),
                mdFileInput: get('mdFileInput'),
                // Chat UI elements will be cached when built
            };
        },
        _setupEventListeners() {
            elements.mdFileInput.addEventListener('change', async (event) => {
                const files = Array.from(event.target.files);
                if (files.length === 0) return;
                const fileObjects = await Promise.all(files.map(async file => ({
                    name: file.name,
                    content: await file.text()
                })));
                App.addFiles(fileObjects);
                event.target.value = ''; // Reset file input
            });
            elements.fileSelector.addEventListener('change', (e) => App.selectFile(parseInt(e.target.value)));
            elements.prevBtn.addEventListener('click', () => App.selectFile(state.currentIndex > 0 ? state.currentIndex - 1 : state.loadedFiles.length - 1));
            elements.nextBtn.addEventListener('click', () => App.selectFile(state.currentIndex < state.loadedFiles.length - 1 ? state.currentIndex + 1 : 0));
            elements.saveSessionBtn.addEventListener('click', () => App.saveSession());
            elements.summarizeBtn.addEventListener('click', () => App.summarize());
            elements.studyBtn.addEventListener('click', () => App.study());
            elements.autoLinkBtn.addEventListener('click', () => App.autoLink());
            elements.chatBtn.addEventListener('click', () => Chat.enter());
        },
        update() {
            if (!elements.mainTitle) return; // UI not built yet

            const hasFiles = state.loadedFiles.length > 0;
            const currentFile = hasFiles ? state.loadedFiles[state.currentIndex] : null;

            // Update Header
            elements.mainTitle.textContent = currentFile ? currentFile.name.replace(/\.(md|txt|js|sh)$/i, '') : "chidi.md";

            // Update Display
            if (currentFile) {
                if (currentFile.isCode) {
                    elements.markdownDisplay.innerHTML = `<pre>${currentFile.content || ''}</pre>`;
                } else {
                    elements.markdownDisplay.innerHTML = DOMPurify.sanitize(marked.parse(currentFile.content || ''));
                }
            } else {
                elements.markdownDisplay.innerHTML = '<p>No file selected.</p>';
            }

            // Update Controls
            elements.fileSelector.innerHTML = '';
            state.loadedFiles.forEach((file, index) => {
                const option = this._createEl('option', { value: index, textContent: file.name });
                if (index === state.currentIndex) option.selected = true;
                elements.fileSelector.appendChild(option);
            });

            [elements.summarizeBtn, elements.studyBtn, elements.autoLinkBtn, elements.chatBtn, elements.prevBtn, elements.nextBtn, elements.fileSelector].forEach(btn => btn.disabled = !hasFiles);
            elements.saveSessionBtn.disabled = !hasFiles;

            // Update Footer
            elements.fileCountDisplay.textContent = `Files: ${state.loadedFiles.length}`;
        },
        appendAiOutput(title, content) {
            if (!elements.markdownDisplay) return;
            const outputBlock = this._createEl('div', { className: 'chidi-ai-output' });
            outputBlock.innerHTML = DOMPurify.sanitize(marked.parse(`### ${title}\n\n${content}`));
            elements.markdownDisplay.appendChild(outputBlock);
            outputBlock.scrollIntoView({ behavior: 'smooth', block: 'end' });
            showMessage(`AI Response received for "${title}".`);
        },
        _createEl(tag, props = {}, children = []) {
            const el = document.createElement(tag);
            Object.entries(props).forEach(([key, value]) => {
                if (key === 'textContent') el.textContent = value;
                else el.setAttribute(key, value);
            });
            if (children.length > 0) el.append(...children);
            return el;
        }
    };

    // --- Gemini Chat Logic ---
    const Chat = {
        enter() {
            if (state.isChatActive) return;
            state.isChatActive = true;
            this.buildUI();
        },
        exit() {
            if (!state.isChatActive) return;
            state.isChatActive = false;
            document.getElementById('gemini-chat-container').remove();
        },
        async sendMessage(userInput) {
            if (!userInput.trim()) return;

            this.appendMessage(userInput, 'user');
            elements.chatLoader.classList.remove('hidden');

            const allFilesContext = state.loadedFiles.map(f => `--- DOCUMENT: ${f.name} ---\n${f.content}`).join('\n\n');
            const systemPrompt = `You are a helpful AI assistant. You are in a chat session within the Chidi.md application. The user has loaded the following documents. Use them as context to answer questions. If the question is general, you don't need to reference them.\n\n${allFilesContext}`;

            state.geminiChatHistory.push({ role: 'user', parts: [{ text: userInput }] });

            const response = await App.callLlmApi(state.geminiChatHistory, systemPrompt);

            elements.chatLoader.classList.add('hidden');
            if (response && !response.startsWith("Error:")) {
                state.geminiChatHistory.push({ role: 'model', parts: [{ text: response }] });
                this.appendMessage(response, 'ai');
            } else {
                this.appendMessage(response || "An unknown error occurred.", 'ai');
                state.geminiChatHistory.pop(); // Remove user message on failure
            }
        },
        buildUI() {
            const exitBtn = UI._createEl('button', { className: 'chidi-btn exit-btn', textContent: 'Exit Chat' });
            const header = UI._createEl('header', { className: 'gemini-chat-header' }, [UI._createEl('h2', { textContent: 'Gemini Chat' }), exitBtn]);
            elements.chatMessages = UI._createEl('div', { className: 'gemini-chat-messages' });
            elements.chatLoader = UI._createEl('div', { className: 'loader hidden' });
            elements.chatInput = UI._createEl('input', { className: 'gemini-chat-input', placeholder: 'Ask about the loaded files...' });
            const sendBtn = UI._createEl('button', { className: 'chidi-btn primary-action', textContent: 'Send' });
            const form = UI._createEl('form', { className: 'gemini-chat-form' }, [elements.chatInput, sendBtn]);
            const modal = UI._createEl('div', { className: 'gemini-chat-modal' }, [header, elements.chatMessages, elements.chatLoader, form]);
            const container = UI._createEl('div', { id: 'gemini-chat-container' }, [modal]);

            exitBtn.addEventListener('click', () => this.exit());
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendMessage(elements.chatInput.value);
                elements.chatInput.value = '';
            });

            document.body.appendChild(container);
            elements.chatInput.focus();

            // Render existing history
            state.geminiChatHistory.forEach(msg => this.appendMessage(msg.parts[0].text, msg.role === 'user' ? 'user' : 'ai'));
        },
        appendMessage(message, sender) {
            const messageDiv = UI._createEl('div', { className: `gemini-chat-message ${sender}` });
            messageDiv.innerHTML = DOMPurify.sanitize(marked.parse(message));
            elements.chatMessages.appendChild(messageDiv);
            elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        }
    }

    // --- Start the application ---
    App.init();
});