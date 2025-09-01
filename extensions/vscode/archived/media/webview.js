// Software 3 Editor JavaScript
console.log('[WEBVIEW] SOFTWARE 3 EDITOR SCRIPT LOADED');
console.log('[WEBVIEW] Script load time:', new Date().toISOString());

// Global state variables
let showingCode = false;
let isDirty = false;
let isEditingInstructions = false;
let isEditingCode = false;
let vscode = null;

// Global references for output panel (will be initialized later)
let outputPanel = null;
let outputContent = null;
let outputToggleIcon = null;

// Global output panel functions
function showOutputPanel() {
    console.log('showOutputPanel called, panel exists:', !!outputPanel);
    if (outputPanel) {
        outputPanel.style.display = 'block';
        if (outputContent && outputContent.classList.contains('collapsed')) {
            outputContent.classList.remove('collapsed');
            if (outputToggleIcon) {
                outputToggleIcon.className = 'fas fa-chevron-up';
            }
        }
    }
}

function toggleOutputPanel() {
    if (outputContent) {
        outputContent.classList.toggle('collapsed');
        if (outputToggleIcon) {
            outputToggleIcon.className = outputContent.classList.contains('collapsed') 
                ? 'fas fa-chevron-down' 
                : 'fas fa-chevron-up';
        }
    }
}

function clearOutput() {
    console.log('clearOutput called, content exists:', !!outputContent);
    if (outputContent) {
        outputContent.innerHTML = '<div class="output-empty">Output cleared.</div>';
    }
}

function addOutputMessage(message, type = 'info') {
    console.log('addOutputMessage called:', message, type);
    if (outputContent) {
        // Remove empty message if it exists
        const emptyMsg = outputContent.querySelector('.output-empty');
        if (emptyMsg) {
            emptyMsg.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `output-message ${type}`;
        
        // Check if message is a URL or contains a URL
        if (type === 'url' || message.match(/https?:\/\/[^\s]+/)) {
            messageDiv.className = 'output-message url';
            
            // Extract the actual URL from the message
            const urlMatch = message.match(/https?:\/\/[^\s]+/);
            const actualUrl = urlMatch ? urlMatch[0] : message;
            
            // Store the URL in a data attribute
            messageDiv.setAttribute('data-url', actualUrl);
            messageDiv.textContent = message;
            messageDiv.style.cursor = 'pointer';
            
            messageDiv.addEventListener('click', function() {
                const urlToOpen = this.getAttribute('data-url');
                console.log('[OUTPUT] Opening URL:', urlToOpen);
                if (vscode && urlToOpen) {
                    vscode.postMessage({ 
                        type: 'openExternal',
                        url: urlToOpen
                    });
                }
            });
        } else {
            messageDiv.textContent = message;
        }
        
        outputContent.appendChild(messageDiv);
        // Scroll to bottom
        outputContent.scrollTop = outputContent.scrollHeight;
    }
}

function resetPlayButton() {
    const playButton = document.getElementById('play-button');
    if (playButton) {
        playButton.classList.remove('running');
        const playIcon = playButton.querySelector('i');
        if (playIcon) {
            playIcon.className = 'fas fa-play';
        }
    }
}

// Initialize VS Code API
try {
    if (typeof acquireVsCodeApi !== 'undefined') {
        vscode = acquireVsCodeApi();
        console.log('VS Code API acquired successfully');
    } else {
        console.warn('acquireVsCodeApi is not available - running in degraded mode');
    }
} catch (error) {
    console.error('Failed to acquire VS Code API:', error);
}

// Track current execution type
let currentExecutionType = null;

// Listen for messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'output':
            addOutputMessage(message.text, message.outputType || 'info');
            break;
        case 'execution-complete':
            addOutputMessage('Execution completed.', 'success');
            resetPlayButton();
            currentExecutionType = null;
            break;
        case 'execution-error':
            addOutputMessage(message.error || 'Execution failed.', 'error');
            resetPlayButton();
            currentExecutionType = null;
            break;
        case 'server-started':
            addOutputMessage(`Server running at: ${message.url}`, 'url');
            // For Live Server, keep the button in stop state
            // Don't reset it until user explicitly stops
            break;
    }
});

// Simple toggle function
function toggleView() {
    try {
        console.log('[TOGGLE] toggleView called');
        const instructionsView = document.getElementById('instructions');
        const codeView = document.getElementById('code');
        const toggleIcon = document.getElementById('toggle-icon');
        
        if (!instructionsView || !codeView) {
            console.error('[TOGGLE] Views not found');
            return;
        }
    
    // Exit any active editing mode before switching
    if (isEditingInstructions) {
        saveInstructions();
    }
    if (isEditingCode) {
        saveCode();
    }
    
    if (!showingCode) {
        // Switch to code view
        instructionsView.style.display = 'none';
        codeView.style.display = 'block';
        if (toggleIcon) {
            toggleIcon.className = 'fas fa-file-alt';
            toggleIcon.parentElement.title = 'View instructions';
        }
        showingCode = true;
        console.log('[TOGGLE] Switched to code view');
    } else {
        // Switch to instructions view
        codeView.style.display = 'none';
        instructionsView.style.display = 'block';
        if (toggleIcon) {
            toggleIcon.className = 'fas fa-code';
            toggleIcon.parentElement.title = 'View code';
        }
        showingCode = false;
        console.log('[TOGGLE] Switched to instructions view');
    }
    } catch (error) {
        console.error('[TOGGLE] Error in toggleView:', error);
    }
}

function editInstructions() {
    try {
        console.log('editInstructions called');
        const instructionsView = document.getElementById('instructions');
        const textarea = document.getElementById('instructions-textarea');
        const display = document.getElementById('instructions-display');
        
        if (!instructionsView || !textarea) {
            console.error('Missing elements for edit instructions');
            return;
        }
        
        if (isEditingInstructions) {
            console.log('Already in edit mode');
            return;
        }
        
        // Check if placeholder is shown and clear it
        if (display && display.querySelector('.placeholder')) {
            textarea.value = '';
            display.innerHTML = '';
        }
        
        instructionsView.classList.add('editing');
        isEditingInstructions = true;
        
        // Set cursor at the end of content
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        
        console.log('Entered instructions editing mode');
    } catch (error) {
        console.error('Error entering edit mode:', error);
    }
}

function saveInstructions() {
    try {
        const instructionsView = document.getElementById('instructions');
        const textarea = document.getElementById('instructions-textarea');
        const display = document.getElementById('instructions-display');
        
        if (!instructionsView || !textarea || !display) {
            console.error('Missing elements for save instructions');
            return;
        }
        
        instructionsView.classList.remove('editing');
        isEditingInstructions = false;
        
        // Send edit to extension if VS Code API is available
        if (vscode) {
            vscode.postMessage({
                type: 'edit',
                editType: 'instructions',
                content: textarea.value
            });
        } else {
            console.warn('Cannot send message - VS Code API not available');
        }
        
        // Update display with simple markdown rendering
        updateInstructionsDisplay(textarea.value);
        
        console.log('Instructions saved successfully');
    } catch (error) {
        console.error('Error saving instructions:', error);
    }
}

function editCode() {
    try {
        console.log('editCode called');
        const codeView = document.getElementById('code');
        const textarea = document.getElementById('code-textarea');
        
        if (!codeView || !textarea) {
            console.error('Missing elements for edit code');
            return;
        }
        
        if (isEditingCode) {
            console.log('Already in edit mode');
            return;
        }
        
        codeView.classList.add('editing');
        isEditingCode = true;
        
        // Set cursor at the end of content
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        
        console.log('Entered code editing mode');
    } catch (error) {
        console.error('Error entering edit mode:', error);
    }
}

function saveCode() {
    try {
        const codeView = document.getElementById('code');
        const textarea = document.getElementById('code-textarea');
        
        if (!codeView || !textarea) {
            console.error('Missing elements for save code');
            return;
        }
        
        codeView.classList.remove('editing');
        isEditingCode = false;
        
        // Send edit to extension if VS Code API is available
        if (vscode) {
            vscode.postMessage({
                type: 'edit',
                editType: 'code',
                content: textarea.value
            });
        } else {
            console.warn('Cannot send message - VS Code API not available');
        }
        
        // Update display with syntax highlighting
        updateCodeDisplay(textarea.value);
        
        console.log('Code saved successfully');
    } catch (error) {
        console.error('Error saving code:', error);
    }
}

function updateInstructionsDisplay(markdown) {
    const display = document.getElementById('instructions-display');
    // Simple markdown rendering (basic)
    let html = markdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    html = '<p>' + html + '</p>';
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6])/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    
    display.innerHTML = html;
}

function updateCodeDisplay(code) {
    const display = document.getElementById('code-display');
    const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Get detected language from data attribute
    const detectedLanguage = display.dataset.language || 'javascript';
    
    display.innerHTML = '<pre><code class="language-' + detectedLanguage + '">' + escapedCode + '</code></pre>';
    
    // Re-apply syntax highlighting
    if (typeof hljs !== 'undefined') {
        display.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }
}

function markDirty() {
    if (!isDirty) {
        isDirty = true;
    }
}

function markClean() {
    isDirty = false;
}

function handleInstructionsKeydown(event) {
    if (event.key === 'Escape') {
        saveInstructions();
    } else if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveInstructions();
        saveDocument();
    }
}

function handleCodeKeydown(event) {
    if (event.key === 'Escape') {
        saveCode();
    } else if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveCode();
        saveDocument();
    }
}

function saveDocument() {
    if (isDirty && vscode) {
        vscode.postMessage({ type: 'save' });
    } else if (isDirty) {
        console.warn('Cannot save - VS Code API not available');
    }
}

// Main initialization function
function initializeEditor() {
    console.log('[INIT] === INITIALIZING EDITOR ===');
    console.log('[INIT] Initialization time:', new Date().toISOString());
    
    try {
        // Get DOM elements
        const toggleButton = document.getElementById('toggle-button');
        const instructionsView = document.getElementById('instructions');
        const codeView = document.getElementById('code');
        const instructionsDisplay = document.getElementById('instructions-display');
        const codeDisplay = document.getElementById('code-display');
        const instructionsTextarea = document.getElementById('instructions-textarea');
        const codeTextarea = document.getElementById('code-textarea');
        
        console.log('[INIT] DOM elements found:');
        console.log('[INIT] - Toggle button:', !!toggleButton);
        console.log('[INIT] - Instructions view:', !!instructionsView);
        console.log('[INIT] - Code view:', !!codeView);
        console.log('[INIT] - Instructions display:', !!instructionsDisplay);
        console.log('[INIT] - Code display:', !!codeDisplay);
        
        // Initialize what we can, even if some elements are missing
        if (!instructionsView || !codeView) {
            console.error('[INIT] Critical view elements missing! Retrying in 500ms...');
            setTimeout(initializeEditor, 500);
            return;
        }
        
        // Set initial state - ensure code view is hidden
        codeView.style.display = 'none';
        instructionsView.style.display = 'block';
        showingCode = false;
        
        // Set up toggle button if it exists
        if (toggleButton) {
            // Ensure toggle button has correct initial state
            const toggleIcon = document.getElementById('toggle-icon');
            if (toggleIcon) {
                toggleIcon.className = 'fas fa-code';
                toggleButton.title = 'View code';
            }
            
            // Remove any existing listeners first
            const newToggleButton = toggleButton.cloneNode(true);
            toggleButton.parentNode.replaceChild(newToggleButton, toggleButton);
            
            // Add event listener for toggle button
            newToggleButton.addEventListener('click', function(e) {
                console.log('[BUTTON] Toggle button clicked!');
                e.preventDefault();
                e.stopPropagation();
                toggleView();
            });
            console.log('[INIT] Toggle button click listener added successfully');
        } else {
            console.warn('Toggle button not found in DOM');
        }
        
        // Add event listener for play button
        const playButton = document.getElementById('play-button');
        if (playButton) {
            // Remove any existing listeners first
            const newPlayButton = playButton.cloneNode(true);
            playButton.parentNode.replaceChild(newPlayButton, playButton);
            
            newPlayButton.addEventListener('click', function(e) {
                console.log('[BUTTON] Play button clicked!');
                e.preventDefault();
                e.stopPropagation();
                handlePlayButtonClick();
            });
            console.log('[INIT] Play button click listener added successfully');
        } else {
            console.warn('Play button not found in DOM');
        }
        
        // Initialize output panel global references
        outputPanel = document.getElementById('output-panel');
        outputContent = document.getElementById('output-content');
        const outputHeader = document.getElementById('output-header');
        const clearOutputBtn = document.getElementById('clear-output');
        const toggleOutputBtn = document.getElementById('toggle-output');
        outputToggleIcon = document.getElementById('output-toggle-icon');
        
        console.log('Output panel elements initialized:');
        console.log('- Output panel:', !!outputPanel);
        console.log('- Output content:', !!outputContent);
        console.log('- Output header:', !!outputHeader);
        
        if (outputHeader) {
            outputHeader.addEventListener('click', function(e) {
                if (e.target.closest('#clear-output')) return;
                toggleOutputPanel();
            });
        }
        
        if (clearOutputBtn) {
            clearOutputBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                clearOutput();
            });
        }
        
        
        // Bind edit handlers
        if (instructionsDisplay) {
            instructionsDisplay.addEventListener('click', function(e) {
                // Don't trigger edit if already editing or if clicking on a link/button
                if (isEditingInstructions) return;
                if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
                
                console.log('Instructions display clicked - entering edit mode');
                e.stopPropagation();
                editInstructions();
            });
        }
        
        if (codeDisplay) {
            codeDisplay.addEventListener('click', function(e) {
                // Don't trigger edit if already editing
                if (isEditingCode) return;
                
                console.log('Code display clicked - entering edit mode');
                e.stopPropagation();
                editCode();
            });
        }
        
        // Bind textarea events
        if (instructionsTextarea) {
            instructionsTextarea.addEventListener('blur', saveInstructions);
            instructionsTextarea.addEventListener('input', markDirty);
            instructionsTextarea.addEventListener('keydown', handleInstructionsKeydown);
        }
        
        if (codeTextarea) {
            codeTextarea.addEventListener('blur', saveCode);
            codeTextarea.addEventListener('input', markDirty);
            codeTextarea.addEventListener('keydown', handleCodeKeydown);
        }
        
        console.log('All event listeners bound successfully');
        
        // Initialize syntax highlighting
        if (typeof hljs !== 'undefined') {
            console.log('Initializing Highlight.js');
            hljs.highlightAll();
        } else {
            console.log('Highlight.js not available');
        }
        
        console.log('[INIT] === EDITOR INITIALIZATION COMPLETE ===');
    } catch (error) {
        console.error('[INIT] Initialization error:', error);
    }
}

// Wait for DOM to load before initializing
if (document.readyState === 'loading') {
    console.log('DOM still loading, waiting...');
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, initializing editor');
        initializeEditor();
        setupEventDelegation();
    });
} else {
    console.log('DOM already loaded, initializing immediately');
    // Small delay to ensure everything is rendered
    setTimeout(() => {
        initializeEditor();
        setupEventDelegation();
    }, 100);
}

// Fallback event delegation for buttons
function setupEventDelegation() {
    console.log('Setting up event delegation as fallback');
    
    // Use event delegation on document body for button clicks
    document.body.addEventListener('click', function(e) {
        // Check if toggle button was clicked
        const toggleBtn = e.target.closest('#toggle-button');
        if (toggleBtn) {
            console.log('Toggle button clicked via delegation!');
            e.preventDefault();
            e.stopPropagation();
            toggleView();
            return;
        }
        
        // Check if play button was clicked
        const playBtn = e.target.closest('#play-button');
        if (playBtn) {
            console.log('Play button clicked via delegation!');
            e.preventDefault();
            e.stopPropagation();
            handlePlayButtonClick();
            return;
        }
    });
}

// Extract play button logic to reusable function
function handlePlayButtonClick() {
    try {
        console.log('[PLAY] handlePlayButtonClick called');
        const playButton = document.getElementById('play-button');
        if (!playButton) {
            console.error('[PLAY] Play button not found');
            return;
        }
    
    // Check if already running
    if (playButton.classList.contains('running')) {
        console.log('[PLAY] Stopping execution...');
        // Stop execution
        if (vscode) {
            vscode.postMessage({ type: 'stop-execution' });
            // If it's HTML/Live Server, we need to manually reset since we don't get execution-complete
            if (currentExecutionType === 'html') {
                setTimeout(() => {
                    resetPlayButton();
                    currentExecutionType = null;
                    addOutputMessage('Live Server stopped.', 'info');
                }, 500);
            }
        }
        return;
    }
    
    // Get the current code and language
    const codeTextarea = document.getElementById('code-textarea');
    const codeDisplay = document.getElementById('code-display');
    const code = codeTextarea ? codeTextarea.value : '';
    const language = codeDisplay ? (codeDisplay.dataset.language || 'javascript') : 'javascript';
    
    // Track execution type
    currentExecutionType = language.toLowerCase() === 'html' || language.toLowerCase() === 'htm' ? 'html' : 'other';
    
    // Show output panel
    showOutputPanel();
    clearOutput();
    addOutputMessage('Running...', 'info');
    
    // Update button state
    playButton.classList.add('running');
    const playIcon = playButton.querySelector('i');
    if (playIcon) {
        playIcon.className = 'fas fa-stop';
    }
    
    // Send execution request
    if (vscode) {
        console.log('[PLAY] Sending execution request for language:', language);
        vscode.postMessage({ 
            type: 'execute',
            code: code,
            language: language
        });
    } else {
        console.error('[PLAY] VS Code API not available');
    }
    } catch (error) {
        console.error('[PLAY] Error in handlePlayButtonClick:', error);
        resetPlayButton();
    }
}

// Debug function to test button functionality
window.debugButtons = function() {
    console.log('=== DEBUG BUTTON TEST ===');
    const toggleButton = document.getElementById('toggle-button');
    const playButton = document.getElementById('play-button');
    const instructionsView = document.getElementById('instructions');
    const codeView = document.getElementById('code');
    
    console.log('Toggle button exists:', !!toggleButton);
    console.log('Play button exists:', !!playButton);
    console.log('Instructions view exists:', !!instructionsView);
    console.log('Code view exists:', !!codeView);
    
    if (toggleButton) {
        console.log('Toggle button classes:', toggleButton.className);
        console.log('Toggle button onclick:', toggleButton.onclick);
        console.log('Simulating toggle button click...');
        toggleView();
    }
    
    console.log('=== END DEBUG ===');
};

// Make functions globally accessible for debugging
window.toggleView = toggleView;
window.handlePlayButtonClick = handlePlayButtonClick;

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        console.log('Save keyboard shortcut pressed');
        e.preventDefault();
        if (isEditingInstructions) saveInstructions();
        if (isEditingCode) saveCode();
        saveDocument();
    }
});

// Listen for messages from extension if VS Code API is available
if (vscode) {
    window.addEventListener('message', event => {
        const message = event.data;
        console.log('Message from extension:', message);
        switch (message.type) {
            case 'saved':
                markClean();
                break;
        }
    });
}

// Click outside to save edits
document.addEventListener('click', (e) => {
    // Don't interfere with toggle button clicks
    if (e.target.closest('#toggle-button')) {
        return;
    }
    
    if (isEditingInstructions && !e.target.closest('.instructions-view')) {
        console.log('Clicked outside instructions, saving');
        saveInstructions();
    }
    if (isEditingCode && !e.target.closest('.code-view')) {
        console.log('Clicked outside code, saving');
        saveCode();
    }
});

console.log('Software 3 Editor JavaScript fully loaded');