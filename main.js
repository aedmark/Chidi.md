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
    };

    // --- Application State ---
    let state = {
        loadedFiles: [],
        history: [],
        historyIndex: -1,
        currentDisplayedMarkdownContent: '',
        geminiChatHistory: [],
        apiKey: null,
    };

    const defaultTitle = "chidi.md";
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
    const getApiKey = async () => {
        if (state.apiKey) return state.apiKey;
        const key = await showInputModal({
            title: "API Key Required",
            prompt: "Please enter your Gemini API Key to use AI features.",
            placeholder: "Enter your API key here",
            confirmText: "Save Key"
        });
        if (key) {
            state.apiKey = key;
            showMessage("API Key accepted. Saving to session.", "info");
            saveSession();
            return key;
        }
        showMessage("API Key not provided. AI features are disabled.", "warn");
        return null;
    };

    const getApiUrl = () => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.apiKey}`;
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
        if (state.loadedFiles.length === 0 && !state.apiKey) {
            showMessage("Nothing to save.", "warn");
            return;
        }
        const sessionData = {
            loadedFiles: state.loadedFiles,
            history: state.history,
            historyIndex: state.historyIndex,
            apiKey: state.apiKey,
            geminiChatHistory: state.geminiChatHistory
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
            state.apiKey = sessionData.apiKey || null;
            state.geminiChatHistory = sessionData.geminiChatHistory || [];

            let message = "Previous session restored.";
            if (state.apiKey) message += " API key loaded.";
            showMessage(message, "success");

            if (state.historyIndex !== -1 && state.history[state.historyIndex] !== undefined) {
                displayFile(state.history[state.historyIndex]);
            }
            elements.restoreSessionModal.classList.add('hidden');
        } else {
            showMessage('Awaiting file selection.', 'info');
        }
    };
    
    const restartSession = () => {
        if (confirm("Are you sure you want to restart? This will clear all loaded files, history, and the saved API key.")) {
            state = { loadedFiles: [], history: [], historyIndex: -1, currentDisplayedMarkdownContent: '', geminiChatHistory: [], apiKey: null };
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
        const hasSessionData = state.loadedFiles.length > 0 || !!state.apiKey;
        elements.fileCountDisplay.textContent = `FILES: ${state.loadedFiles.length}`;
        elements.prevBtn.disabled = state.historyIndex <= 0;
        elements.nextBtn.disabled = !hasFiles;
        elements.summarizeBtn.disabled = !isDisplayingFile;
        elements.suggestQuestionsBtn.disabled = !isDisplayingFile;
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
        state.geminiChatHistory = [{
            role: "user",
            parts: [{ text: `I am currently viewing an article titled "${cleanFilename}". Its full content is:\n\n\`\`\`markdown\n${state.currentDisplayedMarkdownContent}\n\`\`\`\n\nWe can discuss this article.` }]
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
    const callGeminiApi = async (chatHistory) => {
        if (!state.apiKey && !(await getApiKey())) return "Error: API Key not provided.";
        toggleLoader(true);
        try {
            const response = await fetch(getApiUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: chatHistory })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            return result.candidates?.[0]?.content?.parts?.[0]?.text || "Error: Invalid response from AI.";
        } catch (error) {
            showMessage("Failed to connect to AI service. Check console.", "error");
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
    
    const handleQuestionClick = async (question) => {
        const questionButtons = document.querySelectorAll('.question-button');
        
        try {
            // Disable all question buttons to prevent multiple clicks
            questionButtons.forEach(btn => btn.disabled = true);
            
            showMessage("Getting answer...", "info");
            state.geminiChatHistory.push({ role: "user", parts: [{ text: question }] });
            const answer = await callGeminiApi(state.geminiChatHistory);
            state.geminiChatHistory.push({ role: "model", parts: [{ text: answer }] });
            appendAiOutput(`Answer to: "${question}"`, answer);
            showMessage("Answer generated!", "success");
        } finally {
            // Re-enable all question buttons once the process is complete (success or fail)
            questionButtons.forEach(btn => btn.disabled = false);
        }
    };

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
        const chat = [...state.geminiChatHistory, { role: "user", parts: [{ text: "Summarize the current article concisely." }] }];
        const summary = await callGeminiApi(chat);
        appendAiOutput("Article Summary", summary);
    });
    
    elements.suggestQuestionsBtn.addEventListener('click', async () => {
        const prompt = "Directly provide a list of 3-4 thought-provoking questions based on the article. Each question must end with a question mark.";
        const chat = [...state.geminiChatHistory, { role: "user", parts: [{ text: prompt }] }];
        const questions = await callGeminiApi(chat);
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
        const answer = await callGeminiApi([{ role: 'user', parts: [{ text: prompt }] }]);
        appendAiOutput(`Answer based on all files`, answer);
    });
    
    elements.scanFolderBtn.addEventListener('click', handleDirectoryScan);
    elements.saveSessionBtn.addEventListener('click', saveSession);
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