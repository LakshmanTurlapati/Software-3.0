// Simple editable HTML - keeps original toggle but adds direct editing
import * as vscode from 'vscode';

export function generateSimpleEditableHTML(
  document: { instructions: string; code: string; language?: string },
  webview: vscode.Webview,
  fontAwesomeUri: vscode.Uri,
  instructionsHtml: string,
  codeHtml: string,
  detectedLanguage: string,
  scriptUri: vscode.Uri
): string {
  const escapedInstructions = escapeHtml(document.instructions);
  
  // Format HTML code for better readability in textarea
  const codeToEscape = (detectedLanguage === 'html' || detectedLanguage === 'htm') 
    ? formatHtml(document.code) 
    : document.code;
  const escapedCode = escapeHtml(codeToEscape);
  
  // Check if instructions are empty to show placeholder
  const instructionsContent = document.instructions.trim() === '' 
    ? '<span class="placeholder">Welcome to Software 3.0, Click to begin.</span>'
    : instructionsHtml;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://cdnjs.cloudflare.com; script-src ${webview.cspSource} 'unsafe-inline' https://cdnjs.cloudflare.com; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
    <title>Software 3 Document</title>
    <link rel="stylesheet" href="${fontAwesomeUri}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css">
    <style>
      body {
        padding: 20px;
        line-height: 1.6;
        font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
        font-size: var(--vscode-font-size, 14px);
        color: var(--vscode-foreground);
        background-color: var(--vscode-editor-background);
        max-width: 900px;
        margin: 0 auto;
      }
      
      .s3-container {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        position: relative;
      }
      
      .button-group {
        position: absolute;
        top: 15px;
        right: 15px;
        display: flex;
        gap: 8px;
        z-index: 1000 !important;
        pointer-events: auto !important;
      }
      
      .play-button,
      .code-icon {
        height: 32px;
        width: 32px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: 1px solid var(--vscode-button-border, #007acc);
        border-radius: 6px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        z-index: 1000 !important;
        pointer-events: auto !important;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        position: relative;
      }
      
      .play-button:hover,
      .code-icon:hover {
        background: var(--vscode-button-hoverBackground);
      }
      
      
      .instructions-view {
        padding: 50px 25px 25px 25px;
        background: var(--vscode-editor-background);
        min-height: 400px;
        position: relative;
      }
      
      .code-view {
        padding: 50px 25px 25px 25px;
        background: var(--vscode-editor-background);
        display: none;
        min-height: 400px;
        position: relative;
      }
      
      /* Editable content areas */
      .editable-content {
        outline: none;
        position: relative;
        cursor: text;
        min-height: 50px;
      }
      
      /* Enable horizontal scrolling for code content */
      .code-view .editable-content {
        overflow-x: auto;
        white-space: pre;
      }
      
      .editable-content:focus {
        outline: none;
      }
      
      /* Prevent accidental text selection while clicking */
      .instructions-view:not(.editing) .editable-content,
      .code-view:not(.editing) .editable-content {
        user-select: none;
      }
      
      .instructions-view.editing .editable-content,
      .code-view.editing .editable-content {
        user-select: text;
      }
      
      /* Hidden textarea for code editing */
      .code-textarea {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        background: transparent;
        border: none;
        outline: none;
        resize: none;
        font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
        font-size: var(--vscode-editor-font-size, 14px);
        line-height: 1.5;
        color: transparent;
        z-index: 1;
        padding: 0;
        margin: 0;
        white-space: pre;
        word-wrap: break-word;
        border-radius: 8px;
      }
      
      .code-textarea:focus {
        outline: 3px solid var(--vscode-focusBorder, #007acc);
        outline-offset: -3px;
        border-radius: 8px;
      }
      
      .code-display {
        position: relative;
        z-index: 0;
        overflow-x: auto;
        max-width: 100%;
      }
      
      .code-view.editing .code-textarea {
        opacity: 1;
        color: var(--vscode-editor-foreground);
        background: var(--vscode-editor-background);
        z-index: 2;
      }
      
      .code-view.editing .code-display {
        opacity: 0.1;
      }
      
      .code-view {
        position: relative;
      }
      
      .code-view pre {
        margin: 0;
        background: transparent !important;
        overflow-x: auto;
        font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
        font-size: var(--vscode-editor-font-size, 14px);
        line-height: 1.5;
        border-radius: 6px;
      }
      
      .code-view code {
        background: transparent !important;
        font-family: inherit;
      }
      
      /* Token highlighting styles (preserved from original) */
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
      
      /* Markdown styles (preserved from original) */
      .instructions-view h1, .instructions-view h2, .instructions-view h3, h1, h2, h3, h4, h5, h6 {
        color: var(--vscode-editor-foreground);
        font-weight: 600;
        line-height: 1.25;
        margin-top: 24px;
        margin-bottom: 16px;
        border-bottom: none;
      }
      
      .instructions-view h1, h1 { 
        font-size: 2em; 
        border-bottom: 1px solid var(--vscode-panel-border);
        padding-bottom: 8px;
      }
      .instructions-view h2, h2 { 
        font-size: 1.5em; 
        border-bottom: 1px solid var(--vscode-panel-border);
        padding-bottom: 4px;
      }
      .instructions-view h3, h3 { font-size: 1.25em; }
      
      .instructions-view p {
        margin-bottom: 16px;
        line-height: 1.6;
        color: var(--vscode-editor-foreground);
      }
      
      .instructions-view strong { 
        font-weight: 600; 
        color: var(--vscode-editor-foreground);
      }
      .instructions-view em { 
        font-style: italic; 
        color: var(--vscode-editor-foreground);
      }
      
      .instructions-view code {
        background: var(--vscode-textCodeBlock-background);
        color: var(--vscode-textPreformat-foreground);
        padding: 2px 6px;
        border-radius: 3px;
        font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
        font-size: 0.9em;
        border: 1px solid var(--vscode-panel-border);
      }
      
      .instructions-view ul, .instructions-view ol {
        margin-bottom: 16px;
        padding-left: 32px;
        color: var(--vscode-editor-foreground);
      }
      
      .instructions-view li {
        margin-bottom: 4px;
        line-height: 1.6;
      }
      
      .instructions-view ul {
        list-style-type: disc;
      }
      
      .instructions-view ol {
        list-style-type: decimal;
      }
      
      .instructions-view a {
        color: var(--vscode-textLink-foreground);
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: all 0.2s ease;
      }
      
      .instructions-view a:hover {
        color: var(--vscode-textLink-activeForeground);
        border-bottom-color: var(--vscode-textLink-foreground);
      }
      
      .instructions-view blockquote {
        margin: 16px 0;
        padding: 8px 16px;
        border-left: 4px solid var(--vscode-textLink-foreground);
        background: var(--vscode-textCodeBlock-background);
        color: var(--vscode-editor-foreground);
        font-style: italic;
        border-radius: 0 4px 4px 0;
      }
      
      /* Hidden textarea for instructions editing */
      .instructions-textarea {
        display: none;
        width: 100%;
        height: 400px;
        border: none;
        outline: none;
        resize: none;
        padding: 0;
        margin: 0;
        font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
        font-size: var(--vscode-font-size, 14px);
        line-height: 1.6;
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        border-radius: 8px;
      }
      
      .instructions-textarea:focus {
        outline: 3px solid var(--vscode-focusBorder, #007acc);
        outline-offset: -3px;
        border-radius: 8px;
      }
      
      .instructions-view.editing .instructions-display {
        display: none;
      }
      
      .instructions-view.editing .instructions-textarea {
        display: block;
      }
      
      /* Placeholder text */
      .placeholder {
        color: var(--vscode-input-placeholderForeground, #888);
        font-style: italic;
        pointer-events: none;
        user-select: none;
      }
      
      /* Edit hints - properly hidden */
      .edit-hint {
        position: absolute;
        bottom: 10px;
        right: 10px;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        opacity: 0;
        transition: opacity 0.3s ease;
        background: var(--vscode-editor-background);
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid var(--vscode-panel-border);
        pointer-events: none;
        visibility: hidden;
      }
      
      .s3-container:hover .edit-hint {
        opacity: 0.7;
        visibility: visible;
      }
      
      /* Output Panel Styles - as separate styled container */
      .output-panel {
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        margin-top: 20px;
        overflow: hidden;
        transition: all 0.3s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .output-header {
        background: var(--vscode-editor-background);
        padding: 12px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        user-select: none;
        border-bottom: 1px solid var(--vscode-panel-border);
      }
      
      .output-title {
        font-weight: 600;
        color: var(--vscode-foreground);
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }
      
      .output-controls {
        display: flex;
        gap: 10px;
      }
      
      .output-control-btn {
        background: transparent;
        border: none;
        color: var(--vscode-foreground);
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s;
        opacity: 0.7;
      }
      
      .output-control-btn:hover {
        background: var(--vscode-toolbar-hoverBackground);
        opacity: 1;
      }
      
      .output-content {
        padding: 20px;
        font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
        font-size: 13px;
        line-height: 1.5;
        color: var(--vscode-foreground);
        max-height: 300px;
        overflow-y: auto;
        background: var(--vscode-editor-background);
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      
      .output-content.collapsed {
        max-height: 0;
        padding: 0;
        overflow: hidden;
      }
      
      .output-message {
        margin: 5px 0;
      }
      
      .output-message.error {
        color: var(--vscode-errorForeground, #f48771);
      }
      
      .output-message.success {
        color: var(--vscode-testing-iconPassed, #73c991);
      }
      
      .output-message.info {
        color: var(--vscode-textLink-foreground, #3794ff);
      }
      
      .output-message.url {
        color: var(--vscode-textLink-foreground, #3794ff);
        text-decoration: underline;
        cursor: pointer;
      }
      
      .output-message.url:hover {
        color: var(--vscode-textLink-activeForeground, #4db8ff);
      }
      
      .output-empty {
        color: var(--vscode-disabledForeground);
        font-style: italic;
        text-align: center;
        padding: 20px;
      }
      
      .play-button.running {
        background: var(--vscode-testing-iconErrored, #f14c4c);
      }
      
      .play-button.running:hover {
        background: var(--vscode-testing-iconErrored, #f14c4c);
        opacity: 0.9;
      }
      
      .spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
</head>
<body class="vscode-body">
    <div class="s3-container">
        <div class="button-group">
            <button class="play-button" id="play-button" title="Run code">
                <i class="fas fa-play"></i>
            </button>
            <button class="code-icon" id="toggle-button" title="Toggle between instructions and code">
                <i class="fas fa-code" id="toggle-icon"></i>
            </button>
        </div>
        
        <div class="instructions-view" id="instructions">
            <div class="instructions-display editable-content" id="instructions-display">
                ${instructionsContent}
            </div>
            <textarea 
                class="instructions-textarea" 
                id="instructions-textarea"
            >${escapedInstructions}</textarea>
        </div>
        
        <div class="code-view" id="code">
            <div class="code-display editable-content" id="code-display" data-language="${document.language || detectedLanguage}">
                ${codeHtml}
            </div>
            <textarea 
                class="code-textarea" 
                id="code-textarea"
            >${escapedCode}</textarea>
        </div>
        
        <div class="edit-hint">Click to edit • Ctrl+S to save</div>
    </div>
    
    <!-- Output Panel -->
    <div class="output-panel" id="output-panel" style="display: none;">
        <div class="output-header" id="output-header">
            <div class="output-title">
                <i class="fas fa-terminal"></i>
                <span>Output</span>
            </div>
            <div class="output-controls">
                <button class="output-control-btn" id="clear-output" title="Clear Output">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="output-control-btn" id="toggle-output" title="Toggle Output">
                    <i class="fas fa-chevron-down" id="output-toggle-icon"></i>
                </button>
            </div>
        </div>
        <div class="output-content" id="output-content">
            <div class="output-empty">No output yet. Click the play button to run the code.</div>
        </div>
    </div>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script>
        // Early initialization script
        console.log('[INIT] Starting button initialization');
        console.log('[INIT] Document ready state:', document.readyState);
        
        // Function to ensure buttons work immediately
        function setupButtonsEarly() {
            try {
                const toggleBtn = document.getElementById('toggle-button');
                const playBtn = document.getElementById('play-button');
                
                console.log('[INIT] Toggle button found:', !!toggleBtn);
                console.log('[INIT] Play button found:', !!playBtn);
                
                if (toggleBtn && !toggleBtn.hasAttribute('data-initialized')) {
                    toggleBtn.setAttribute('data-initialized', 'true');
                    toggleBtn.addEventListener('click', function(e) {
                        console.log('[BUTTON] Toggle clicked!');
                        e.preventDefault();
                        e.stopPropagation();
                        // Call global function when available
                        if (typeof window.toggleView === 'function') {
                            window.toggleView();
                        } else {
                            console.warn('[BUTTON] toggleView not yet available');
                        }
                    });
                }
                
                if (playBtn && !playBtn.hasAttribute('data-initialized')) {
                    playBtn.setAttribute('data-initialized', 'true');
                    playBtn.addEventListener('click', function(e) {
                        console.log('[BUTTON] Play clicked!');
                        e.preventDefault();
                        e.stopPropagation();
                        // Call global function when available
                        if (typeof window.handlePlayButtonClick === 'function') {
                            window.handlePlayButtonClick();
                        } else {
                            console.warn('[BUTTON] handlePlayButtonClick not yet available');
                        }
                    });
                }
            } catch (error) {
                console.error('[INIT] Error setting up buttons:', error);
            }
        }
        
        // Setup immediately and on DOM ready
        setupButtonsEarly();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupButtonsEarly);
        }
    </script>
    <script src="${scriptUri}"></script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatHtml(html: string): string {
  if (!html) return '';
  
  // Basic HTML beautification
  let formatted = html;
  let indentLevel = 0;
  const indent = '  ';
  
  // Add newlines after opening tags
  formatted = formatted.replace(/(<[^\/][^>]*>)(?=[^<])/g, '$1\n');
  
  // Add newlines before closing tags
  formatted = formatted.replace(/([^>])(<\/[^>]+>)/g, '$1\n$2');
  
  // Add newlines between adjacent tags
  formatted = formatted.replace(/>(<)/g, '>\n<');
  
  // Split into lines and add proper indentation
  const lines = formatted.split('\n');
  const result: string[] = [];
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    // Decrease indent for closing tags
    if (line.startsWith('</')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }
    
    // Add the line with proper indentation
    if (line) {
      result.push(indent.repeat(indentLevel) + line);
    }
    
    // Increase indent for opening tags (not self-closing)
    if (line.startsWith('<') && !line.startsWith('</') && 
        !line.endsWith('/>') && !line.includes('</')) {
      // Check if it's not a void element
      const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 
                           'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
      const tagName = line.match(/<(\w+)/)?.[1]?.toLowerCase();
      if (!voidElements.includes(tagName || '')) {
        indentLevel++;
      }
    }
  }
  
  return result.join('\n');
}