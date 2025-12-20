"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEditableHTML = generateEditableHTML;
function generateEditableHTML(document, webview, fontAwesomeUri, instructionsHtml, codeHtml, detectedLanguage) {
    const escapedInstructions = escapeHtml(document.instructions);
    const escapedCode = escapeHtml(document.code);
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://cdnjs.cloudflare.com; script-src ${webview.cspSource} 'unsafe-inline' https://cdnjs.cloudflare.com; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
    <title>Software 3 Document</title>
    <link rel="stylesheet" href="${fontAwesomeUri}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <style>
      body {
        padding: 20px;
        line-height: 1.6;
        font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
        font-size: var(--vscode-font-size, 14px);
        color: var(--vscode-foreground);
        background-color: var(--vscode-editor-background);
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .s3-container {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .toolbar {
        background: var(--vscode-sideBar-background);
        border-bottom: 1px solid var(--vscode-panel-border);
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        justify-content: space-between;
      }
      
      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .mode-toggle {
        display: flex;
        background: var(--vscode-button-background);
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid var(--vscode-button-border);
      }
      
      .mode-btn {
        padding: 8px 16px;
        background: transparent;
        color: var(--vscode-button-foreground);
        border: none;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      
      .mode-btn.active {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
      }
      
      .mode-btn:hover:not(.active) {
        background: var(--vscode-button-hoverBackground);
      }
      
      .save-btn {
        padding: 8px 16px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: 1px solid var(--vscode-button-border);
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s ease;
      }
      
      .save-btn:hover {
        background: var(--vscode-button-hoverBackground);
      }
      
      .save-btn.saving {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .dirty-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--vscode-charts-orange, #ff8c00);
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .dirty-indicator.dirty {
        opacity: 1;
      }
      
      .content-container {
        display: flex;
        height: 70vh;
        min-height: 500px;
      }
      
      .panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        border-right: 1px solid var(--vscode-panel-border);
      }
      
      .panel:last-child {
        border-right: none;
      }
      
      .panel-header {
        background: var(--vscode-editor-background);
        border-bottom: 1px solid var(--vscode-panel-border);
        padding: 12px 16px;
        font-weight: 600;
        font-size: 13px;
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .panel-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        position: relative;
      }
      
      .edit-area, .preview-area {
        flex: 1;
        display: none;
      }
      
      .edit-area.active, .preview-area.active {
        display: flex;
        flex-direction: column;
      }
      
      .textarea-wrapper {
        flex: 1;
        position: relative;
      }
      
      .content-textarea {
        width: 100%;
        height: 100%;
        border: none;
        outline: none;
        resize: none;
        padding: 16px;
        font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
        font-size: var(--vscode-editor-font-size, 14px);
        line-height: 1.5;
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        border-radius: 0;
      }
      
      .instructions-textarea {
        font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
        line-height: 1.6;
      }
      
      .preview-content {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        background: var(--vscode-editor-background);
      }
      
      .preview-content pre {
        margin: 0;
        background: transparent !important;
        overflow-x: auto;
        font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
        font-size: var(--vscode-editor-font-size, 14px);
        line-height: 1.5;
        border-radius: 6px;
      }
      
      .preview-content code {
        background: transparent !important;
        font-family: inherit;
      }
      
      .char-count {
        position: absolute;
        bottom: 8px;
        right: 12px;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        opacity: 0.7;
        background: var(--vscode-editor-background);
        padding: 2px 6px;
        border-radius: 3px;
        border: 1px solid var(--vscode-panel-border);
      }
      
      /* Token highlighting styles */
      .token-keyword { color: var(--vscode-charts-purple, #c586c0); font-weight: 600; }
      .token-string { color: var(--vscode-charts-green, #ce9178); }
      .token-comment { color: var(--vscode-descriptionForeground); font-style: italic; opacity: 0.85; }
      .token-number { color: var(--vscode-charts-orange, #d19a66); }
      .token-function { color: var(--vscode-charts-blue, #61afef); }
      .token-property { color: var(--vscode-charts-yellow, #e5c07b); }
      .token-decorator { color: var(--vscode-charts-red, #e06c75); font-weight: 600; }
      
      .token.keyword { color: var(--vscode-charts-purple, #c586c0); font-weight: 600; }
      .token.string, .token.template-string { color: var(--vscode-charts-green, #ce9178); }
      .token.comment { color: var(--vscode-descriptionForeground); font-style: italic; opacity: 0.85; }
      .token.number { color: var(--vscode-charts-orange, #d19a66); }
      .token.function { color: var(--vscode-charts-blue, #61afef); }
      .token.property { color: var(--vscode-charts-yellow, #e5c07b); }
      .token.decorator, .token.macro { color: var(--vscode-charts-red, #e06c75); font-weight: 600; }
      .token.builtin { color: var(--vscode-charts-cyan, #56b6c2); font-weight: 500; }
      .token.operator { color: var(--vscode-symbolIcon-operatorForeground, #569cd6); }
      .token.punctuation { color: var(--vscode-foreground); opacity: 0.7; }
      
      /* Markdown styles for preview */
      .preview-content h1, .preview-content h2, .preview-content h3 {
        color: var(--vscode-editor-foreground);
        font-weight: 600;
        line-height: 1.25;
        margin-top: 24px;
        margin-bottom: 16px;
      }
      
      .preview-content h1 { 
        font-size: 2em; 
        border-bottom: 1px solid var(--vscode-panel-border);
        padding-bottom: 8px;
      }
      .preview-content h2 { 
        font-size: 1.5em; 
        border-bottom: 1px solid var(--vscode-panel-border);
        padding-bottom: 4px;
      }
      .preview-content h3 { font-size: 1.25em; }
      
      .preview-content p {
        margin-bottom: 16px;
        line-height: 1.6;
      }
      
      .preview-content code {
        background: var(--vscode-textCodeBlock-background);
        color: var(--vscode-textPreformat-foreground);
        padding: 2px 6px;
        border-radius: 3px;
        font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
        font-size: 0.9em;
        border: 1px solid var(--vscode-panel-border);
      }
      
      .preview-content ul, .preview-content ol {
        margin-bottom: 16px;
        padding-left: 32px;
      }
      
      .preview-content li {
        margin-bottom: 4px;
        line-height: 1.6;
      }
      
      .preview-content a {
        color: var(--vscode-textLink-foreground);
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: all 0.2s ease;
      }
      
      .preview-content a:hover {
        color: var(--vscode-textLink-activeForeground);
        border-bottom-color: var(--vscode-textLink-foreground);
      }
      
      .preview-content blockquote {
        margin: 16px 0;
        padding: 8px 16px;
        border-left: 4px solid var(--vscode-textLink-foreground);
        background: var(--vscode-textCodeBlock-background);
        font-style: italic;
        border-radius: 0 4px 4px 0;
      }
    </style>
</head>
<body>
    <div class="s3-container">
        <div class="toolbar">
            <div class="toolbar-left">
                <div class="mode-toggle">
                    <button class="mode-btn active" onclick="setMode('edit')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="mode-btn" onclick="setMode('preview')">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                </div>
            </div>
            <div class="toolbar-right">
                <div class="dirty-indicator" id="dirty-indicator"></div>
                <button class="save-btn" id="save-btn" onclick="saveDocument()">
                    <i class="fas fa-save"></i> Save
                </button>
            </div>
        </div>
        
        <div class="content-container">
            <div class="panel">
                <div class="panel-header">
                    <i class="fas fa-file-text"></i> Instructions (Markdown)
                </div>
                <div class="panel-content">
                    <div class="edit-area active" id="instructions-edit">
                        <div class="textarea-wrapper">
                            <textarea 
                                class="content-textarea instructions-textarea" 
                                id="instructions-textarea"
                                placeholder="Write your documentation and instructions in Markdown..."
                                oninput="handleContentChange('instructions')"
                            >${escapedInstructions}</textarea>
                            <div class="char-count" id="instructions-count">${document.instructions.length} chars</div>
                        </div>
                    </div>
                    <div class="preview-area" id="instructions-preview">
                        <div class="preview-content" id="instructions-preview-content">
                            ${instructionsHtml}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="panel">
                <div class="panel-header">
                    <i class="fas fa-code"></i> Code (${detectedLanguage})
                </div>
                <div class="panel-content">
                    <div class="edit-area active" id="code-edit">
                        <div class="textarea-wrapper">
                            <textarea 
                                class="content-textarea" 
                                id="code-textarea"
                                placeholder="Write your code implementation here..."
                                oninput="handleContentChange('code')"
                            >${escapedCode}</textarea>
                            <div class="char-count" id="code-count">${document.code.length} chars</div>
                        </div>
                    </div>
                    <div class="preview-area" id="code-preview">
                        <div class="preview-content" id="code-preview-content">
                            ${codeHtml}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        let isDirty = false;
        let currentMode = 'edit';
        
        // VS Code API for message passing
        const vscode = acquireVsCodeApi();
        
        function setMode(mode) {
            currentMode = mode;
            
            // Update toggle buttons
            document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector(\`[onclick="setMode('\${mode}')"]\`).classList.add('active');
            
            // Show/hide edit and preview areas
            const editAreas = document.querySelectorAll('.edit-area');
            const previewAreas = document.querySelectorAll('.preview-area');
            
            if (mode === 'edit') {
                editAreas.forEach(area => area.classList.add('active'));
                previewAreas.forEach(area => area.classList.remove('active'));
            } else {
                editAreas.forEach(area => area.classList.remove('active'));
                previewAreas.forEach(area => area.classList.add('active'));
                // Refresh previews when switching to preview mode
                updatePreviews();
            }
        }
        
        function handleContentChange(type) {
            const textarea = document.getElementById(\`\${type}-textarea\`);
            const countEl = document.getElementById(\`\${type}-count\`);
            
            // Update character count
            countEl.textContent = \`\${textarea.value.length} chars\`;
            
            // Mark as dirty
            setDirty(true);
            
            // Send edit to extension
            vscode.postMessage({
                type: 'edit',
                editType: type,
                content: textarea.value
            });
        }
        
        function setDirty(dirty) {
            isDirty = dirty;
            const indicator = document.getElementById('dirty-indicator');
            const saveBtn = document.getElementById('save-btn');
            
            if (dirty) {
                indicator.classList.add('dirty');
                saveBtn.querySelector('i').className = 'fas fa-save';
            } else {
                indicator.classList.remove('dirty');
                saveBtn.querySelector('i').className = 'fas fa-check';
                setTimeout(() => {
                    saveBtn.querySelector('i').className = 'fas fa-save';
                }, 2000);
            }
        }
        
        function saveDocument() {
            if (!isDirty) return;
            
            const saveBtn = document.getElementById('save-btn');
            saveBtn.classList.add('saving');
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            vscode.postMessage({
                type: 'save'
            });
        }
        
        function updatePreviews() {
            // This would typically re-render the markdown and code
            // For now, we'll just refresh syntax highlighting
            if (typeof hljs !== 'undefined') {
                document.querySelectorAll('#code-preview-content pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }
        }
        
        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'saved':
                    setDirty(false);
                    const saveBtn = document.getElementById('save-btn');
                    saveBtn.classList.remove('saving');
                    saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
                    setTimeout(() => {
                        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
                    }, 2000);
                    break;
            }
        });
        
        // Initialize Highlight.js
        if (typeof hljs !== 'undefined') {
            hljs.highlightAll();
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveDocument();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                setMode(currentMode === 'edit' ? 'preview' : 'edit');
            }
        });
    </script>
</body>
</html>`;
}
function escapeHtml(text) {
    if (!text)
        return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
//# sourceMappingURL=editor-new-html.js.map