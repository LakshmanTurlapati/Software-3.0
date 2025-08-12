import * as vscode from 'vscode';

/**
 * Simple Document interface for S3 files
 */
interface S3Document {
  instructions: string;
  code: string;
}

/**
 * Simplified Custom Document for S3 files
 */
class S3CustomDocument extends vscode.Disposable implements vscode.CustomDocument {
  static async create(
    uri: vscode.Uri,
    backupId: string | undefined
  ): Promise<S3CustomDocument> {
    const dataFile = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri;
    const fileData = await vscode.workspace.fs.readFile(dataFile);
    return new S3CustomDocument(uri, fileData);
  }

  private readonly _uri: vscode.Uri;
  private _documentData: Uint8Array;

  private constructor(
    uri: vscode.Uri,
    initialData: Uint8Array
  ) {
    super(() => {
      // Cleanup resources
    });
    this._uri = uri;
    this._documentData = initialData;
  }

  public get uri() { return this._uri; }
  public get documentData(): Uint8Array { return this._documentData; }

  private readonly _onDidDispose = new vscode.EventEmitter<void>();
  public readonly onDidDispose = this._onDidDispose.event;

  dispose(): void {
    this._onDidDispose.fire();
    super.dispose();
  }
}

/**
 * Simplified Custom Editor Provider for Software 3 (.s3) files
 * Jupyter-like interface with instructions/code toggle
 */
export class S3DocumentEditor implements vscode.CustomReadonlyEditorProvider<S3CustomDocument> {
  
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new S3DocumentEditor(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      'software3.editor',
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    );
    return providerRegistration;
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * If the code comes in fenced form ```lang\n...```, extract language and raw code
   */
  private extractFencedCode(input: string): { language?: string; code: string } {
    if (!input) return { code: '' };
    const fenceMatch = input.match(/^```([a-zA-Z0-9_-]+)?\n([\s\S]*?)\n```\s*$/);
    if (fenceMatch) {
      const lang = fenceMatch[1] || undefined;
      const inner = fenceMatch[2] || '';
      return { language: lang, code: inner };
    }
    return { code: input };
  }

  /**
   * Apply VS Code native syntax highlighting to code
   */
  private applySyntaxHighlighting(code: string, language: string): string {
    // Simple tokenization for basic syntax highlighting
    let highlightedCode = this.escapeHtml(code);
    
    // Apply language-specific highlighting patterns
    switch (language) {
      case 'javascript':
      case 'typescript':
        highlightedCode = this.highlightJavaScript(highlightedCode);
        break;
      case 'python':
        highlightedCode = this.highlightPython(highlightedCode);
        break;
      case 'css':
        highlightedCode = this.highlightCSS(highlightedCode);
        break;
      case 'json':
        highlightedCode = this.highlightJSON(highlightedCode);
        break;
      default:
        highlightedCode = this.highlightGeneric(highlightedCode);
    }
    
    return highlightedCode;
  }

  /**
   * Use VS Code's built-in Markdown renderer (Shiki-based) to colorize code so it matches the active theme
   * Falls back to the local regex highlighter if the command is unavailable
   */
  private async renderCodeWithVSCode(code: string, language: string): Promise<string> {
    try {
      const fenced = `\`\`\`${language}\n${code}\n\`\`\``;
      const html = await vscode.commands.executeCommand('markdown.api.render', fenced) as string;
      // Extract the first <pre>...</pre> block
      const match = html.match(/<pre[\s\S]*?<\/pre>/i);
      if (match && match[0]) {
        const block = match[0];
        // If no shiki classes or span tokens are present, treat as un-highlighted and fallback
        const looksUnhighlighted = !/class\s*=\s*"[^"]*shiki[^"]*"/i.test(block) && !/<span\b[^>]*>/.test(block);
        if (!looksUnhighlighted) {
          return block;
        }
        // Fallback to internal highlighter
        const highlighted = this.applySyntaxHighlighting(code, language);
        return `<pre><code class="language-${language}">${highlighted}</code></pre>`;
      }
      // As a safe fallback, escape and wrap plainly
      return `<pre><code class="language-${language}">${this.escapeHtml(code)}</code></pre>`;
    } catch {
      // Fallback to local highlighter
      const highlighted = this.applySyntaxHighlighting(code, language);
      return `<pre><code class="language-${language}">${highlighted}</code></pre>`;
    }
  }

  /**
   * Highlight JavaScript/TypeScript code with VS Code theme colors
   */
  private highlightJavaScript(code: string): string {
    // Keywords
    code = code.replace(/\b(const|let|var|function|class|if|else|for|while|do|switch|case|default|break|continue|return|try|catch|finally|throw|new|this|super|extends|implements|import|export|from|as|async|await|typeof|instanceof)\b/g, 
      '<span class="token-keyword">$1</span>');
    
    // Strings (single and double quotes, template literals)
    code = code.replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="token-string">$1$2$1</span>');
    
    // Numbers
    code = code.replace(/\b\d+\.?\d*\b/g, '<span class="token-number">$&</span>');
    
    // Comments
    code = code.replace(/\/\/.*$/gm, '<span class="token-comment">$&</span>');
    code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="token-comment">$&</span>');
    
    // Functions
    code = code.replace(/\b(\w+)(?=\s*\()/g, '<span class="token-function">$1</span>');
    
    // Properties
    code = code.replace(/\.(\w+)/g, '.<span class="token-property">$1</span>');
    
    return code;
  }

  /**
   * Highlight Python code with VS Code theme colors
   */
  private highlightPython(code: string): string {
    // Keywords
    code = code.replace(/\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|break|continue|pass|lambda|and|or|not|in|is|True|False|None|async|await)\b/g, 
      '<span class="token-keyword">$1</span>');
    
    // Strings (single, double, triple quotes)
    code = code.replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, '<span class="token-string">$1</span>');
    
    // Numbers
    code = code.replace(/\b\d+\.?\d*\b/g, '<span class="token-number">$&</span>');
    
    // Comments
    code = code.replace(/#.*$/gm, '<span class="token-comment">$&</span>');
    
    // Functions
    code = code.replace(/\bdef\s+(\w+)/g, 'def <span class="token-function">$1</span>');
    code = code.replace(/\b(\w+)(?=\s*\()/g, '<span class="token-function">$1</span>');
    
    // Self keyword
    code = code.replace(/\bself\b/g, '<span class="token-keyword">$&</span>');
    
    // Decorators
    code = code.replace(/@\w+/g, '<span class="token-decorator">$&</span>');
    
    return code;
  }

  /**
   * Highlight CSS code with VS Code theme colors
   */
  private highlightCSS(code: string): string {
    // Properties
    code = code.replace(/(\w+(?:-\w+)*)\s*:/g, '<span class="token-property">$1</span>:');
    
    // Values
    code = code.replace(/:\s*([^;]+);/g, ': <span class="token-value">$1</span>;');
    
    // Selectors
    code = code.replace(/^([.#]?\w+(?:[-\w]*)*)/gm, '<span class="token-selector">$1</span>');
    
    return code;
  }

  /**
   * Highlight JSON code with VS Code theme colors
   */
  private highlightJSON(code: string): string {
    // Keys
    code = code.replace(/"(\w+)"(\s*:)/g, '<span class="token-property">"$1"</span>$2');
    
    // String values
    code = code.replace(/:\s*"([^"]*)"(?=\s*[,}])/g, ': <span class="token-string">"$1"</span>');
    
    // Numbers
    code = code.replace(/:\s*(\d+\.?\d*)(?=\s*[,}])/g, ': <span class="token-number">$1</span>');
    
    // Booleans and null
    code = code.replace(/:\s*(true|false|null)(?=\s*[,}])/g, ': <span class="token-keyword">$1</span>');
    
    return code;
  }

  /**
   * Generic highlighting for unknown languages
   */
  private highlightGeneric(code: string): string {
    // Strings
    code = code.replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="token-string">$1$2$1</span>');
    
    // Numbers
    code = code.replace(/\b\d+\.?\d*\b/g, '<span class="token-number">$&</span>');
    
    // Comments (various styles)
    code = code.replace(/\/\/.*$/gm, '<span class="token-comment">$&</span>');
    code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="token-comment">$&</span>');
    code = code.replace(/#.*$/gm, '<span class="token-comment">$&</span>');
    
    return code;
  }

  /**
   * Detect programming language from code content using simple pattern matching
   */
  private detectLanguage(code: string): string {
    try {
      // Simple pattern-based language detection - no external dependencies
      
      // Shebangs
      if (/^#!\/.+\bpython[0-9.]*\b/.test(code)) {
        return 'python';
      }

      // Check for specific language patterns
      if (code.includes('def ') || code.includes('import ') && code.includes('from ') || 
          code.includes('print(') || /^\s*#[^{]/.test(code)) {
        return 'python';
      }
      
      if (code.includes('function ') || code.includes('const ') || code.includes('let ') || 
          code.includes('console.log') || code.includes('=>') || code.includes('typeof')) {
        return 'javascript';
      }
      
      if (code.includes('interface ') || code.includes(': string') || code.includes(': number') ||
          code.includes('export ') || code.includes('import type')) {
        return 'typescript';
      }
      
      if (code.includes('public class') || code.includes('private ') || code.includes('System.out') ||
          code.includes('public static void main')) {
        return 'java';
      }
      
      if (code.includes('package main') || code.includes('func ') || code.includes('fmt.Print')) {
        return 'go';
      }
      
      if (code.includes('fn ') || code.includes('println!') || code.includes('let mut ')) {
        return 'rust';
      }
      
      if (code.includes('<?php') || code.includes('echo ') || code.includes('$')) {
        return 'php';
      }
      
      if (code.includes('class ') && (code.includes('def ') || code.includes('end'))) {
        return 'ruby';
      }
      
      if (code.includes('#include') || code.includes('std::') || code.includes('cout')) {
        return 'cpp';
      }
      
      if (code.includes('using ') || code.includes('Console.Write')) {
        return 'csharp';
      }
      
      if (code.includes('<html') || code.includes('<div') || code.includes('</')) {
        return 'html';
      }
      
      if (code.includes('{') && code.includes('}') && (code.includes(':') || code.includes('"'))) {
        // Check for JSON pattern
        try {
          JSON.parse(code);
          return 'json';
        } catch {
          // JSON parsing failed
        }
      }
      
      if (code.includes('body {') || code.includes('color:') || code.includes('.class')) {
        return 'css';
      }
      
      // Default fallback
      return 'javascript';
    } catch (error) {
      console.log('[S3Editor] Language detection failed, defaulting to javascript');
      return 'javascript';
    }
  }

  /**
   * Called when a new editor is opened.
   */
  async openCustomDocument(
    uri: vscode.Uri,
    openContext: { backupId?: string } | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken
  ): Promise<S3CustomDocument> {
    console.log('[S3Editor] openCustomDocument called for:', uri.toString());
    try {
      const document = await S3CustomDocument.create(uri, openContext?.backupId);
      console.log('[S3Editor] Document created successfully');
      return document;
    } catch (error) {
      console.error('[S3Editor] Error in openCustomDocument:', error);
      throw error;
    }
  }

  /**
   * Called when our custom editor is opened.
   */
  public async resolveCustomEditor(
    document: S3CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken
  ): Promise<void> {
    console.log('[S3Editor] resolveCustomEditor called');
    
    try {
      // Setup webview options
      webviewPanel.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          this.context.extensionUri,
          vscode.Uri.joinPath(this.context.extensionUri, 'media', 'fontawesome')
        ]
      };
      console.log('[S3Editor] Webview options set');

      // Function to update webview content
      const updateWebview = async () => {
        console.log('[S3Editor] Updating webview content...');
        try {
          const html = await this.getHtmlForWebview(webviewPanel.webview, document);
          webviewPanel.webview.html = html;
          console.log('[S3Editor] Webview HTML set successfully');
        } catch (error) {
          console.error('[S3Editor] Error updating webview:', error);
          webviewPanel.webview.html = this.getErrorHtml(`Failed to load content: ${error}`);
        }
      };

      // Set initial content
      await updateWebview();

    // Listen for document changes (for live updates)
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString()) {
        updateWebview();
      }
    });

    // Refresh when the active color theme changes to keep colors in sync
    const themeChangeSubscription = vscode.window.onDidChangeActiveColorTheme(() => {
      updateWebview();
    });

    // Clean up when editor is closed
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
      themeChangeSubscription.dispose();
    });

    // Handle messages from webview
    webviewPanel.webview.onDidReceiveMessage(e => {
      switch (e.type) {
        case 'copy':
          vscode.env.clipboard.writeText(e.text);
          vscode.window.showInformationMessage('Copied to clipboard');
          return;
        case 'openExternal':
          if (e.url) {
            vscode.env.openExternal(vscode.Uri.parse(e.url));
          }
          return;
      }
    });
    
      console.log('[S3Editor] resolveCustomEditor completed successfully');
    } catch (error) {
      console.error('[S3Editor] Error in resolveCustomEditor:', error);
      webviewPanel.webview.html = this.getErrorHtml(`Extension error: ${error}`);
    }
  }

  /**
   * Generate HTML content for the simplified webview
   */
  private async getHtmlForWebview(webview: vscode.Webview, document: S3CustomDocument): Promise<string> {
    console.log('[S3Editor] getHtmlForWebview called');
    
    try {
      // Get document content
      const decoder = new TextDecoder();
      const textContent = decoder.decode(document.documentData);
      console.log('[S3Editor] Document content decoded, length:', textContent.length);
      
      if (!textContent || textContent.trim() === '') {
        console.log('[S3Editor] Document is empty, creating template');
        return await this.getTemplateDocumentHtml();
      }
      
      const s3Document: S3Document = JSON.parse(textContent);
      console.log('[S3Editor] Document parsed successfully');
      
      if (!s3Document.instructions || !s3Document.code) {
        console.log('[S3Editor] Invalid document structure');
        return this.getErrorHtml('Invalid Software 3 document: must have "instructions" and "code" fields');
      }
      
      return await this.generateSimpleView(s3Document, webview);
    } catch (error: any) {
      console.error('[S3Editor] Error in getHtmlForWebview:', error);
      return this.getErrorHtml(`Failed to parse document: ${error.message}`);
    }
  }

  private async generateSimpleView(document: S3Document, webview: vscode.Webview): Promise<string> {
    const instructionsHtml = await this.renderMarkdownWithVSCode(document.instructions);
    // Allow fenced code inside the raw .s3 `code` field to specify language explicitly
    const { language: fencedLang, code: rawCode } = this.extractFencedCode(document.code);
    const detectedLanguage = fencedLang || this.detectLanguage(rawCode);
    const codeHtml = await this.renderCodeWithVSCode(rawCode, detectedLanguage);
    
    // Get local FontAwesome CSS URI
    const fontAwesomeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'fontawesome', 'css', 'all.min.css')
    );

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};">
        <title>Software 3 Document</title>
        <link rel="stylesheet" href="${fontAwesomeUri}">
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
          
          .code-icon {
            position: absolute;
            top: 15px;
            right: 15px;
            width: 32px;
            height: 32px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            z-index: 10;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .code-icon:hover {
            background: var(--vscode-button-hoverBackground);
          }
          
          .instructions-view {
            padding: 50px 25px 25px 25px;
            background: var(--vscode-editor-background);
          }
          
          .code-view {
            padding: 50px 25px 25px 25px;
            background: var(--vscode-editor-background);
            display: none;
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
          
          /* Theme-aware token colors using chart palette for strong contrast in webviews */
          .token-keyword {
            color: var(--vscode-charts-purple, #c586c0);
            font-weight: 600;
          }
          .token-string {
            color: var(--vscode-charts-green, #ce9178);
          }
          .token-comment {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            opacity: 0.85;
          }
          .token-number {
            color: var(--vscode-charts-orange, #d19a66);
          }
          .token-function {
            color: var(--vscode-charts-blue, #61afef);
          }
          .token-property {
            color: var(--vscode-charts-yellow, #e5c07b);
          }
          .token-decorator {
            color: var(--vscode-charts-red, #e06c75);
            font-weight: 600;
          }
          .token-selector {
            color: var(--vscode-charts-blue, #61afef);
          }
          .token-value {
            color: var(--vscode-charts-green, #98c379);
          }
          
          /* Theme-aware code block styling */
          .code-view {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
          }
          
          /* Enhanced Markdown Styling with VS Code Theme Integration */
          
          /* Markdown Headers */
          .markdown-h1, .markdown-h2, .markdown-h3, h1, h2, h3, h4, h5, h6 {
            color: var(--vscode-editor-foreground);
            font-weight: 600;
            line-height: 1.25;
            margin-top: 24px;
            margin-bottom: 16px;
            border-bottom: none;
          }
          
          .markdown-h1, h1 { 
            font-size: 2em; 
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 8px;
          }
          .markdown-h2, h2 { 
            font-size: 1.5em; 
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 4px;
          }
          .markdown-h3, h3 { font-size: 1.25em; }
          
          /* Markdown Paragraphs */
          .markdown-paragraph, p {
            margin-bottom: 16px;
            line-height: 1.6;
            color: var(--vscode-editor-foreground);
          }
          
          /* Markdown Text Formatting */
          .markdown-bold, strong { 
            font-weight: 600; 
            color: var(--vscode-editor-foreground);
          }
          .markdown-italic, em { 
            font-style: italic; 
            color: var(--vscode-editor-foreground);
          }
          
          /* Markdown Code Elements */
          /* Scope inline code styling to the instructions (markdown) area only */
          .instructions-view .markdown-inline-code, .instructions-view code {
            background: var(--vscode-textCodeBlock-background);
            color: var(--vscode-textPreformat-foreground);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
            font-size: 0.9em;
            border: 1px solid var(--vscode-panel-border);
          }
          
          /* Enhanced Code Blocks */
          /* Scope fenced code block styling to instructions markdown only */
          .instructions-view .markdown-code-block {
            margin: 16px 0;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            overflow: hidden;
            background: var(--vscode-textCodeBlock-background);
          }
          
          .instructions-view .code-block-header {
            background: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding: 8px 12px;
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
          }
          
          .instructions-view .code-block-language {
            font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .instructions-view .markdown-code-block pre {
            margin: 0;
            padding: 16px;
            background: transparent;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
            font-size: var(--vscode-editor-font-size, 14px);
            line-height: 1.45;
          }
          
          .instructions-view .markdown-code-block code {
            background: transparent;
            border: none;
            padding: 0;
          }
          
          /* Markdown Lists */
          .markdown-list, .markdown-ordered-list, ul, ol {
            margin-bottom: 16px;
            padding-left: 32px;
            color: var(--vscode-editor-foreground);
          }
          
          .markdown-list-item, .markdown-ordered-item, li {
            margin-bottom: 4px;
            line-height: 1.6;
          }
          
          .markdown-list {
            list-style-type: disc;
          }
          
          .markdown-ordered-list {
            list-style-type: decimal;
          }
          
          /* Markdown Links */
          .markdown-link, a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: all 0.2s ease;
          }
          
          .markdown-link:hover, a:hover {
            color: var(--vscode-textLink-activeForeground);
            border-bottom-color: var(--vscode-textLink-foreground);
          }
          
          /* Markdown Blockquotes */
          .markdown-blockquote, blockquote {
            margin: 16px 0;
            padding: 8px 16px;
            border-left: 4px solid var(--vscode-textLink-foreground);
            background: var(--vscode-textCodeBlock-background);
            color: var(--vscode-editor-foreground);
            font-style: italic;
            border-radius: 0 4px 4px 0;
          }
          
          /* Tables (if VS Code API renders them) */
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
            background: var(--vscode-editor-background);
          }
          
          th, td {
            border: 1px solid var(--vscode-panel-border);
            padding: 8px 12px;
            text-align: left;
          }
          
          th {
            background: var(--vscode-sideBar-background);
            font-weight: 600;
            color: var(--vscode-editor-foreground);
          }
          
          tr:nth-child(even) {
            background: var(--vscode-list-hoverBackground);
          }
          
          /* Horizontal Rules */
          hr {
            border: none;
            border-top: 1px solid var(--vscode-panel-border);
            margin: 24px 0;
          }

          .error-container {
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-inputValidation-errorForeground);
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
        </style>
    </head>
    <body class="vscode-body" data-vscode-theme-kind="vscode-theme-kind">
        <div class="s3-container">
            <button class="code-icon" onclick="toggleView()" title="Toggle between instructions and code">
                <i class="fas fa-code" id="toggle-icon"></i>
            </button>
            
            <div class="instructions-view" id="instructions">
                ${instructionsHtml}
            </div>
            
            <div class="code-view" id="code">
                ${codeHtml}
            </div>
        </div>
        
        <script>
          let showingCode = false;
          
          function toggleView() {
            const instructionsView = document.getElementById('instructions');
            const codeView = document.getElementById('code');
            const icon = document.getElementById('toggle-icon');
            const button = document.querySelector('.code-icon');
            
            if (showingCode) {
              // Show instructions
              instructionsView.style.display = 'block';
              codeView.style.display = 'none';
              icon.className = 'fas fa-code';
              button.title = 'View code';
              showingCode = false;
            } else {
              // Show code
              instructionsView.style.display = 'none';
              codeView.style.display = 'block';
              icon.className = 'fas fa-file-lines';
              button.title = 'Back to instructions';
              showingCode = true;
            }
          }
          
          // VS Code native syntax highlighting is already applied
          
          // Theme detection and body class management for better VS Code integration
          function detectTheme() {
            // VS Code provides theme information through CSS variables
            const styles = getComputedStyle(document.body);
            const backgroundColor = styles.getPropertyValue('--vscode-editor-background');
            const foregroundColor = styles.getPropertyValue('--vscode-foreground');
            
            // Determine theme based on background color brightness
            if (backgroundColor) {
              const rgb = backgroundColor.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/);
              if (rgb) {
                const brightness = (parseInt(rgb[1]) * 299 + parseInt(rgb[2]) * 587 + parseInt(rgb[3]) * 114) / 1000;
                const isDark = brightness < 128;
                document.body.className = isDark ? 'vscode-body vscode-dark' : 'vscode-body vscode-light';
              }
            }
          }
          
          // Apply theme detection on load
          window.addEventListener('load', detectTheme);
          
          // Listen for theme changes (VS Code can change themes dynamically)
          if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', detectTheme);
            window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', detectTheme);
          }
        </script>
    </body>
    </html>`;
  }

  private async getTemplateDocumentHtml(): Promise<string> {
    const templateDocument: S3Document = {
      instructions: "# Welcome to Software 3!\n\nWrite your documentation and explanations here using **Markdown**.\n\n## Getting Started\n- Click the code toggle to see the implementation\n- Edit both blocks directly\n- Save to preserve your changes\n\n## Features\n- **Dual-view blocks** with seamless toggling\n- **Syntax highlighting** for multiple languages\n- **Live editing** with instant preview\n- **Export capabilities** to HTML and Markdown",
      code: "// Write your code implementation here\nconsole.log('Hello, Software 3!');\n\n// Example function\nfunction example() {\n  return 'This is editable!';\n}\n\n// Try editing this code and switching views\nconst message = example();\nconsole.log(message);"
    };
    
    return await this.generateSimpleView(templateDocument, null as any);
  }

  private getErrorHtml(errorMessage: string): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>S3 Document Error</title>
        <style>
          body {
            font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 40px;
            max-width: 600px;
            margin: 0 auto;
          }
          .error-container {
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-inputValidation-errorForeground);
            padding: 20px;
            border-radius: 8px;
          }
          .error-details {
            font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
            background: var(--vscode-textCodeBlock-background);
            padding: 15px;
            border-radius: 4px;
            margin-top: 15px;
            overflow-x: auto;
            color: var(--vscode-textPreformat-foreground);
          }
        </style>
    </head>
    <body>
        <div class="error-container">
            <h2>Error Loading S3 Document</h2>
            <p>The Software 3 document could not be parsed. Please check your document syntax.</p>
            <div class="error-details">
                <strong>Error details:</strong><br>
                ${this.escapeHtml(errorMessage)}
            </div>
            <p><strong>Note:</strong> This file should contain valid Software 3 JSON format with at least a "blocks" array.</p>
        </div>
    </body>
    </html>`;
  }

  /**
   * Render markdown using VS Code's native markdown API for perfect 1:1 rendering
   */
  private async renderMarkdownWithVSCode(text: string): Promise<string> {
    if (!text) return '';
    
    try {
      // Use VS Code's native markdown rendering API
      const html = await vscode.commands.executeCommand('markdown.api.render', text) as string;
      
      // Apply VS Code theme-aware post-processing for better integration
      return this.enhanceMarkdownHtml(html);
    } catch (error) {
      console.log('[S3Editor] VS Code markdown API not available, falling back to simple renderer');
      // Fallback to enhanced simple markdown rendering
      return this.simpleMarkdownToHtml(text);
    }
  }

  /**
   * Enhanced simple markdown renderer with better code block support
   */
  private simpleMarkdownToHtml(text: string): string {
    if (!text) return '';
    
    let html = text;
    
    // Enhanced code block rendering with syntax highlighting
    html = html.replace(/```(\w+)?\s*\n([\s\S]*?)\n```/g, (match, language, code) => {
      const lang = language || 'text';
      const highlightedCode = this.applySyntaxHighlighting(code.trim(), lang);
      return `<div class="markdown-code-block">
        <div class="code-block-header">
          <span class="code-block-language">${lang}</span>
        </div>
        <pre><code class="language-${lang}">${highlightedCode}</code></pre>
      </div>`;
    });
    
    // Inline code with proper styling
    html = html.replace(/`([^`]+)`/g, '<code class="markdown-inline-code">$1</code>');
    
    // Headers with proper hierarchy
    html = html.replace(/^### (.*$)/gim, '<h3 class="markdown-h3">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="markdown-h2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="markdown-h1">$1</h1>');
    
    // Bold and italic
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="markdown-bold">$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em class="markdown-italic">$1</em>');
    
    // Links with proper styling
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="markdown-link">$1</a>');
    
    // Lists with better structure
    html = html.replace(/^\* (.+)$/gim, '<li class="markdown-list-item">$1</li>');
    html = html.replace(/^- (.+)$/gim, '<li class="markdown-list-item">$1</li>');
    html = html.replace(/^\d+\. (.+)$/gim, '<li class="markdown-ordered-item">$1</li>');
    
    // Blockquotes
    html = html.replace(/^> (.+)$/gim, '<blockquote class="markdown-blockquote">$1</blockquote>');
    
    // Line breaks and paragraphs
    html = html.replace(/\n\n/g, '</p><p class="markdown-paragraph">');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraphs
    html = html.replace(/^(.+)$/gm, '<p class="markdown-paragraph">$1</p>');
    
    // Clean up and structure lists properly
    html = html.replace(/<p class="markdown-paragraph"><\/p>/g, '');
    html = html.replace(/<p class="markdown-paragraph">(<h[1-6])/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p class="markdown-paragraph">(<li)/g, '<ul class="markdown-list">$1');
    html = html.replace(/(<\/li>)<\/p>/g, '$1</ul>');
    
    return html;
  }

  /**
   * Enhance VS Code rendered markdown HTML with additional styling and features
   */
  private enhanceMarkdownHtml(html: string): string {
    // Add custom classes for better styling control
    html = html.replace(/<h1>/g, '<h1 class="markdown-h1">');
    html = html.replace(/<h2>/g, '<h2 class="markdown-h2">');
    html = html.replace(/<h3>/g, '<h3 class="markdown-h3">');
    html = html.replace(/<p>/g, '<p class="markdown-paragraph">');
    html = html.replace(/<code>/g, '<code class="markdown-inline-code">');
    html = html.replace(/<pre><code/g, '<pre class="markdown-code-block"><code');
    html = html.replace(/<blockquote>/g, '<blockquote class="markdown-blockquote">');
    html = html.replace(/<ul>/g, '<ul class="markdown-list">');
    html = html.replace(/<ol>/g, '<ol class="markdown-ordered-list">');
    html = html.replace(/<li>/g, '<li class="markdown-list-item">');
    html = html.replace(/<a /g, '<a class="markdown-link" ');
    
    return html;
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}