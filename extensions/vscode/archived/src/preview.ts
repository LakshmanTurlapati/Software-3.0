// Note: In a real implementation, these would be properly configured
// import * as vscode from 'vscode';
// import { S3Parser, S3Renderer } from '@software3/parser';

declare const vscode: any;

/**
 * Simplified preview panel for Software 3 files
 * Note: In production, this would use the full parser and renderer
 */
export class S3PreviewPanel {
  /**
   * Track the currently active panels. Only allow a single panel per .s3 file.
   */
  public static currentPanels: Map<string, S3PreviewPanel> = new Map();

  public static readonly viewType = 'software3Preview';

  private readonly _panel: any;
  private readonly _extensionUri: any;
  private readonly _documentUri: any;
  private _disposables: any[] = [];

  public static createOrShow(extensionUri: any, documentUri: any) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    const existingPanel = S3PreviewPanel.currentPanels.get(documentUri.toString());
    if (existingPanel) {
      existingPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      S3PreviewPanel.viewType,
      'Software3 Preview',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media'),
          vscode.Uri.joinPath(extensionUri, 'dist')
        ]
      }
    );

    S3PreviewPanel.currentPanels.set(
      documentUri.toString(),
      new S3PreviewPanel(panel, extensionUri, documentUri)
    );
  }

  public static revive(
    panel: any,
    extensionUri: any,
    documentUri: any
  ) {
    S3PreviewPanel.currentPanels.set(
      documentUri.toString(),
      new S3PreviewPanel(panel, extensionUri, documentUri)
    );
  }

  private constructor(
    panel: any,
    extensionUri: any,
    documentUri: any
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._documentUri = documentUri;

    // Set the webview's initial HTML
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables
    );

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message: any) => {
        switch (message.command) {
          case 'alert':
            vscode.window.showErrorMessage(message.text);
            return;
          case 'copy':
            vscode.env.clipboard.writeText(message.text);
            vscode.window.showInformationMessage('Copied to clipboard');
            return;
          case 'openFile':
            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(message.uri));
            return;
        }
      },
      null,
      this._disposables
    );

    // Watch for changes to the document
    const watcher = vscode.workspace.onDidChangeTextDocument((e: any) => {
      if (e.document.uri.toString() === this._documentUri.toString()) {
        this._update();
      }
    });
    this._disposables.push(watcher);

    // Watch for document save events
    const saveWatcher = vscode.workspace.onDidSaveTextDocument((e: any) => {
      if (e.uri.toString() === this._documentUri.toString()) {
        this._update();
      }
    });
    this._disposables.push(saveWatcher);
  }

  public dispose() {
    S3PreviewPanel.currentPanels.delete(this._documentUri.toString());

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private async _update() {
    const webview = this._panel.webview;

    this._panel.title = `Preview: ${this._getFileName()}`;
    this._panel.webview.html = await this._getHtmlForWebview(webview);
  }

  private _getFileName(): string {
    return this._documentUri.path.split('/').pop() || 'document.s3';
  }

  private async _getHtmlForWebview(webview: any): Promise<string> {
    try {
      // Read the document content
      const document = await vscode.workspace.openTextDocument(this._documentUri);
      const content = document.getText();

      // Simple parsing and rendering
      const s3Document = JSON.parse(content);
      
      // Wrap in VS Code-compatible HTML
      return await this._wrapInVSCodeHtml(s3Document, webview);

    } catch (error: any) {
      return this._getErrorHtml(error.message || 'Unknown error');
    }
  }

  private async _wrapInVSCodeHtml(document: any, webview: any): Promise<string> {
    // Get VS Code theme
    const theme = vscode.window.activeColorTheme?.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light';

    let blocksHtml = '';
    if (Array.isArray(document.blocks)) {
      for (let index = 0; index < document.blocks.length; index++) {
        const block = document.blocks[index];
        const { lang: fencedLang, code: raw } = this._extractFenced(block.code);
        const language = fencedLang || (block.language || 'text');
        const codeHtml = await this._renderCodeWithVSCode(raw, language);
        blocksHtml += `
          <div class="s3-block">
            <div class="s3-toggle-container">
              <div class="s3-toggle-buttons">
                <button class="s3-toggle-btn active" onclick="showView(${index}, 'text')">Documentation</button>
                <button class="s3-toggle-btn" onclick="showView(${index}, 'code')">Code</button>
              </div>
            </div>
            <div class="s3-content">
              <div class="s3-view active" id="text-${index}">
                ${this._simpleMarkdownToHtml(block.text)}
              </div>
              <div class="s3-view" id="code-${index}">
                ${codeHtml}
              </div>
            </div>
          </div>
        `;
      }
    }

    return `<!DOCTYPE html>
    <html lang="en" data-vscode-theme="${theme}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:;">
        <title>Software3 Preview</title>
        <style>
          body {
            padding: 20px;
            line-height: 1.6;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
          }
          
          .s3-document {
            max-width: none;
            margin: 0;
            padding: 0;
          }
          
          .s3-block {
            border: 1px solid var(--vscode-panel-border);
            background: var(--vscode-editor-background);
            margin-bottom: 20px;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .s3-toggle-container {
            background: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          
          .s3-toggle-buttons {
            display: flex;
          }
          
          .s3-toggle-btn {
            flex: 1;
            padding: 12px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: 1px solid var(--vscode-button-border);
            cursor: pointer;
            font-weight: 500;
          }
          
          .s3-toggle-btn:hover {
            background: var(--vscode-button-hoverBackground);
          }
          
          .s3-toggle-btn.active {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }
          
          .s3-content {
            padding: 20px;
          }
          
          .s3-view {
            display: none;
          }
          
          .s3-view.active {
            display: block;
          }
          
          pre {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
          }
          
          /* Don’t affect Shiki-rendered code in the code view */
          .s3-view#code-${0} code { /* placeholder to anchor specificity without changing behavior */ }

          /* Scope inline code and fenced code styles to the text (markdown) view only */
          .s3-view[id^="text-"] code {
            background: var(--vscode-textCodeBlock-background);
            font-family: var(--vscode-editor-font-family);
          }
          
          h1, h2, h3 {
            color: var(--vscode-titleBar-activeForeground);
          }
        </style>
    </head>
    <body>
        <div class="s3-document">
            <h1>${this._escapeHtml(document.title)}</h1>
            ${blocksHtml}
        </div>
        
        <script>
          function showView(blockIndex, viewType) {
            const block = document.querySelectorAll('.s3-block')[blockIndex];
            if (!block) return;
            
            // Update buttons
            block.querySelectorAll('.s3-toggle-btn').forEach(btn => btn.classList.remove('active'));
            const targetBtn = block.querySelector(\`button[onclick*="\${viewType}"]\`);
            if (targetBtn) targetBtn.classList.add('active');
            
            // Update views
            block.querySelectorAll('.s3-view').forEach(view => view.classList.remove('active'));
            const targetView = block.querySelector(\`#\${viewType}-\${blockIndex}\`);
            if (targetView) targetView.classList.add('active');
          }
        </script>
    </body>
    </html>`;
  }

  private async _renderCodeWithVSCode(code: string, language: string): Promise<string> {
    const config = vscode.workspace.getConfiguration('software3');
    const engine = config.get('syntaxHighlighting.engine', 'vscode') as string;
    
    
    // Try VS Code API first, then fallback to inline styles
    try {
      if (engine === 'vscode') {
        const fenced = `\`\`\`${language}\n${code}\n\`\`\``;
        const html = await vscode.commands.executeCommand('markdown.api.render', fenced) as string;
        const match = html.match(/<pre[\s\S]*?<\/pre>/i);
        if (match && match[0]) {
          const block = match[0];
          const hasHighlighting = /class\s*=\s*"[^"]*shiki[^"]*"/i.test(block) || /<span\b[^>]*>/.test(block);
          if (hasHighlighting) {
            return block;
          }
        }
      }
      
      // Enhanced fallback with inline styles highlighting
      return this._renderWithInlineStyles(code, language);
    } catch (error) {
      return this._renderWithInlineStyles(code, language);
    }
  }

  private _renderWithInlineStyles(code: string, language: string): string {
    // Detect theme (light/dark) based on VS Code context
    const isDark = vscode.window.activeColorTheme?.kind === vscode.ColorThemeKind.Dark;
    
    // Define color schemes
    const colors = isDark ? {
      keyword: '#C586C0',
      string: '#CE9178',
      comment: '#6A9955',
      number: '#B5CEA8',
      function: '#DCDCAA',
      property: '#4EC9B0',
      decorator: '#569CD6',
      builtin: '#4FC1FF',
      operator: '#D4D4D4',
      punctuation: '#CCCCCC'
    } : {
      keyword: '#AF00DB',
      string: '#A31515',
      comment: '#008000',
      number: '#098658',
      function: '#795E26',
      property: '#001080',
      decorator: '#0000FF',
      builtin: '#267F99',
      operator: '#000000',
      punctuation: '#000000'
    };

    let highlighted = this._escapeHtml(code);
    
    // Apply language-specific highlighting with inline styles
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
      case 'typescript':
      case 'ts':
        highlighted = this._highlightJavaScriptInline(highlighted, colors);
        break;
      case 'python':
      case 'py':
        highlighted = this._highlightPythonInline(highlighted, colors);
        break;
      case 'go':
        highlighted = this._highlightGoInline(highlighted, colors);
        break;
      case 'rust':
        highlighted = this._highlightRustInline(highlighted, colors);
        break;
      default:
        highlighted = this._highlightGenericInline(highlighted, colors);
    }
    
    return `<pre><code class="language-${language}">${highlighted}</code></pre>`;
  }

  private _renderWithBasicHighlighting(code: string, language: string): string {
    const config = vscode.workspace.getConfiguration('software3');
    const enableHighlighting = config.get('preview.syntaxHighlighting', true) as boolean;
    
    if (!enableHighlighting) {
      return `<pre><code class="language-${language}">${this._escapeHtml(code)}</code></pre>`;
    }
    
    // Apply basic syntax highlighting based on language
    let highlighted = this._escapeHtml(code);
    
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
      case 'typescript':
      case 'ts':
        highlighted = this._highlightJavaScript(highlighted);
        break;
      case 'python':
      case 'py':
        highlighted = this._highlightPython(highlighted);
        break;
      case 'go':
        highlighted = this._highlightGo(highlighted);
        break;
      case 'rust':
        highlighted = this._highlightRust(highlighted);
        break;
      default:
        highlighted = this._highlightGeneric(highlighted);
    }
    
    return `<pre><code class="language-${language}">${highlighted}</code></pre>`;
  }

  private _highlightJavaScript(code: string): string {
    // Keywords
    code = code.replace(/\b(const|let|var|function|class|if|else|for|while|do|switch|case|default|break|continue|return|try|catch|finally|throw|new|this|super|extends|implements|import|export|from|as|async|await|typeof|instanceof|interface|type)\b/g, 
      '<span style="color: var(--vscode-charts-purple, #c586c0); font-weight: 600;">$1</span>');
    
    // Strings
    code = code.replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span style="color: var(--vscode-charts-green, #ce9178);">$1$2$1</span>');
    
    // Numbers
    code = code.replace(/\b\d+\.?\d*\b/g, '<span style="color: var(--vscode-charts-orange, #d19a66);">$&</span>');
    
    // Comments
    code = code.replace(/\/\/.*$/gm, '<span style="color: var(--vscode-descriptionForeground); font-style: italic; opacity: 0.85;">$&</span>');
    code = code.replace(/\/\*[\s\S]*?\*\//g, '<span style="color: var(--vscode-descriptionForeground); font-style: italic; opacity: 0.85;">$&</span>');
    
    // Functions
    code = code.replace(/\b(\w+)(?=\s*\()/g, '<span style="color: var(--vscode-charts-blue, #61afef);">$1</span>');
    
    return code;
  }

  private _highlightPython(code: string): string {
    // Keywords
    code = code.replace(/\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|break|continue|pass|lambda|and|or|not|in|is|True|False|None|async|await)\b/g, 
      '<span style="color: var(--vscode-charts-purple, #c586c0); font-weight: 600;">$1</span>');
    
    // Strings
    code = code.replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, '<span style="color: var(--vscode-charts-green, #ce9178);">$1</span>');
    
    // Numbers
    code = code.replace(/\b\d+\.?\d*\b/g, '<span style="color: var(--vscode-charts-orange, #d19a66);">$&</span>');
    
    // Comments
    code = code.replace(/#.*$/gm, '<span style="color: var(--vscode-descriptionForeground); font-style: italic; opacity: 0.85;">$&</span>');
    
    // Decorators
    code = code.replace(/@\w+/g, '<span style="color: var(--vscode-charts-red, #e06c75); font-weight: 600;">$&</span>');
    
    return code;
  }

  private _highlightGo(code: string): string {
    // Keywords
    code = code.replace(/\b(package|func|var|const|type|struct|interface|map|chan|if|else|for|range|switch|case|default|break|continue|return|go|defer|select)\b/g,
      '<span style="color: var(--vscode-charts-purple, #c586c0); font-weight: 600;">$1</span>');
    
    // Strings
    code = code.replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span style="color: var(--vscode-charts-green, #ce9178);">$1$2$1</span>');
    
    // Numbers
    code = code.replace(/\b\d+\.?\d*\b/g, '<span style="color: var(--vscode-charts-orange, #d19a66);">$&</span>');
    
    // Comments
    code = code.replace(/\/\/.*$/gm, '<span style="color: var(--vscode-descriptionForeground); font-style: italic; opacity: 0.85;">$&</span>');
    
    return code;
  }

  private _highlightRust(code: string): string {
    // Keywords
    code = code.replace(/\b(fn|let|mut|const|struct|enum|impl|trait|for|if|else|match|while|loop|break|continue|return|use|mod|pub|self|Self|super|crate)\b/g,
      '<span style="color: var(--vscode-charts-purple, #c586c0); font-weight: 600;">$1</span>');
    
    // Strings
    code = code.replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span style="color: var(--vscode-charts-green, #ce9178);">$1$2$1</span>');
    
    // Numbers
    code = code.replace(/\b\d+\.?\d*\b/g, '<span style="color: var(--vscode-charts-orange, #d19a66);">$&</span>');
    
    // Comments
    code = code.replace(/\/\/.*$/gm, '<span style="color: var(--vscode-descriptionForeground); font-style: italic; opacity: 0.85;">$&</span>');
    
    // Macros
    code = code.replace(/(\w+!)(?=\s*\()/g, '<span style="color: var(--vscode-charts-red, #e06c75); font-weight: 600;">$1</span>');
    
    return code;
  }

  private _highlightGeneric(code: string): string {
    // Strings
    code = code.replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span style="color: var(--vscode-charts-green, #ce9178);">$1$2$1</span>');
    
    // Numbers
    code = code.replace(/\b\d+\.?\d*\b/g, '<span style="color: var(--vscode-charts-orange, #d19a66);">$&</span>');
    
    // Comments (various styles)
    code = code.replace(/\/\/.*$/gm, '<span style="color: var(--vscode-descriptionForeground); font-style: italic; opacity: 0.85;">$&</span>');
    code = code.replace(/\/\*[\s\S]*?\*\//g, '<span style="color: var(--vscode-descriptionForeground); font-style: italic; opacity: 0.85;">$&</span>');
    code = code.replace(/#.*$/gm, '<span style="color: var(--vscode-descriptionForeground); font-style: italic; opacity: 0.85;">$&</span>');
    
    return code;
  }

  private _extractFenced(input: string): { lang?: string; code: string } {
    if (!input) return { code: '' };
    const fence = input.match(/^```([a-zA-Z0-9_-]+)?\n([\s\S]*?)\n```\s*$/);
    if (fence) {
      return { lang: fence[1] || undefined, code: fence[2] || '' };
    }
    return { code: input };
  }

  /**
   * Inline highlighting methods for preview
   */
  private _highlightJavaScriptInline(code: string, colors: any): string {
    // Keywords
    code = code.replace(/\b(abstract|as|async|await|boolean|break|case|catch|class|const|constructor|continue|debugger|declare|default|delete|do|else|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|instanceof|interface|is|keyof|let|module|namespace|never|new|null|number|object|of|package|private|protected|public|readonly|return|set|static|string|super|switch|symbol|this|throw|true|try|type|typeof|undefined|unique|unknown|var|void|while|with|yield)\b/g, 
      `<span style="color: ${colors.keyword}; font-weight: 600;">$1</span>`);
    
    // Comments (do before strings to avoid conflicts)
    code = code.replace(/\/\/.*$/gm, `<span style="color: ${colors.comment}; font-style: italic;">$&</span>`);
    code = code.replace(/\/\*[\s\S]*?\*\//g, `<span style="color: ${colors.comment}; font-style: italic;">$&</span>`);
    
    // Strings (template literals, single, double quotes)
    code = code.replace(/(`)((?:[^`\\]|\\.)*)(`)/g, `<span style="color: ${colors.string};">$1$2$3</span>`);
    code = code.replace(/(')((?:[^'\\]|\\.)*?)(')/g, `<span style="color: ${colors.string};">$1$2$3</span>`);
    code = code.replace(/(")((?:[^"\\]|\\.)*?)(")/g, `<span style="color: ${colors.string};">$1$2$3</span>`);
    
    // Numbers
    code = code.replace(/\b(0x[a-fA-F0-9]+|\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, `<span style="color: ${colors.number};">$1</span>`);
    
    // Functions
    code = code.replace(/\b(\w+)(?=\s*\()/g, `<span style="color: ${colors.function};">$1</span>`);
    
    return code;
  }

  private _highlightPythonInline(code: string, colors: any): string {
    // Keywords
    code = code.replace(/\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\b/g, 
      `<span style="color: ${colors.keyword}; font-weight: 600;">$1</span>`);
    
    // Comments
    code = code.replace(/#.*$/gm, `<span style="color: ${colors.comment}; font-style: italic;">$&</span>`);
    
    // Strings (triple quotes, single, double)
    code = code.replace(/("""[\s\S]*?""")/g, `<span style="color: ${colors.string};">$1</span>`);
    code = code.replace(/('''[\s\S]*?''')/g, `<span style="color: ${colors.string};">$1</span>`);
    code = code.replace(/(')((?:[^'\\]|\\.)*?)(')/g, `<span style="color: ${colors.string};">$1$2$3</span>`);
    code = code.replace(/(")((?:[^"\\]|\\.)*?)(")/g, `<span style="color: ${colors.string};">$1$2$3</span>`);
    
    // Numbers
    code = code.replace(/\b(\d+\.?\d*(?:[eE][+-]?\d+)?[jJ]?)\b/g, `<span style="color: ${colors.number};">$1</span>`);
    
    // Decorators
    code = code.replace(/@\w+/g, `<span style="color: ${colors.decorator}; font-weight: 600;">$&</span>`);
    
    // Functions and classes
    code = code.replace(/\b(def|class)\s+(\w+)/g, `$1 <span style="color: ${colors.function};">$2</span>`);
    
    return code;
  }

  private _highlightGoInline(code: string, colors: any): string {
    // Keywords
    code = code.replace(/\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/g,
      `<span style="color: ${colors.keyword}; font-weight: 600;">$1</span>`);
    
    // Comments
    code = code.replace(/\/\/.*$/gm, `<span style="color: ${colors.comment}; font-style: italic;">$&</span>`);
    
    // Strings
    code = code.replace(/(')((?:[^'\\]|\\.)*?)(')/g, `<span style="color: ${colors.string};">$1$2$3</span>`);
    code = code.replace(/(")((?:[^"\\]|\\.)*?)(")/g, `<span style="color: ${colors.string};">$1$2$3</span>`);
    code = code.replace(/(`)((?:[^`\\]|\\.)*?)(`)/g, `<span style="color: ${colors.string};">$1$2$3</span>`);
    
    // Numbers
    code = code.replace(/\b(\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, `<span style="color: ${colors.number};">$1</span>`);
    
    // Functions
    code = code.replace(/\bfunc\s+(\w+)/g, `func <span style="color: ${colors.function};">$1</span>`);
    
    return code;
  }

  private _highlightRustInline(code: string, colors: any): string {
    // Keywords
    code = code.replace(/\b(as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while)\b/g,
      `<span style="color: ${colors.keyword}; font-weight: 600;">$1</span>`);
    
    // Comments
    code = code.replace(/\/\/.*$/gm, `<span style="color: ${colors.comment}; font-style: italic;">$&</span>`);
    
    // Strings
    code = code.replace(/(')((?:[^'\\]|\\.)*?)(')/g, `<span style="color: ${colors.string};">$1$2$3</span>`);
    code = code.replace(/(")((?:[^"\\]|\\.)*?)(")/g, `<span style="color: ${colors.string};">$1$2$3</span>`);
    
    // Numbers
    code = code.replace(/\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[fiu]?(?:8|16|32|64|128|size)?)\b/g, `<span style="color: ${colors.number};">$1</span>`);
    
    // Macros
    code = code.replace(/(\w+!)(?=\s*\()/g, `<span style="color: ${colors.decorator}; font-weight: 600;">$1</span>`);
    
    // Functions
    code = code.replace(/\bfn\s+(\w+)/g, `fn <span style="color: ${colors.function};">$1</span>`);
    
    return code;
  }

  private _highlightGenericInline(code: string, colors: any): string {
    // Comments (various styles)
    code = code.replace(/\/\/.*$/gm, `<span style="color: ${colors.comment}; font-style: italic;">$&</span>`);
    code = code.replace(/\/\*[\s\S]*?\*\//g, `<span style="color: ${colors.comment}; font-style: italic;">$&</span>`);
    code = code.replace(/#.*$/gm, `<span style="color: ${colors.comment}; font-style: italic;">$&</span>`);
    
    // Strings
    code = code.replace(/(')((?:[^'\\]|\\.)*?)(')/g, `<span style="color: ${colors.string};">$1$2$3</span>`);
    code = code.replace(/(")((?:[^"\\]|\\.)*?)(")/g, `<span style="color: ${colors.string};">$1$2$3</span>`);
    code = code.replace(/(`)((?:[^`\\]|\\.)*?)(`)/g, `<span style="color: ${colors.string};">$1$2$3</span>`);
    
    // Numbers
    code = code.replace(/\b\d+\.?\d*\b/g, `<span style="color: ${colors.number};">$1</span>`);
    
    return code;
  }

  private _getErrorHtml(errorMessage: string): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Software3 Preview Error</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
          }
          .error {
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-inputValidation-errorForeground);
            padding: 15px;
            border-radius: 5px;
          }
          .error h1 {
            margin-top: 0;
            color: var(--vscode-errorForeground);
          }
          .error-details {
            font-family: var(--vscode-editor-font-family);
            background: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 3px;
            margin-top: 10px;
            overflow-x: auto;
          }
        </style>
    </head>
    <body>
        <div class="error">
            <h1>Error parsing .s3 file</h1>
            <p>The Software 3 document could not be parsed. Please check your document syntax.</p>
            <div class="error-details">
                <strong>Error details:</strong><br>
                ${this._escapeHtml(errorMessage)}
            </div>
            <p>
                <strong>Common issues:</strong>
            </p>
            <ul>
                <li>Invalid JSON syntax</li>
                <li>Missing required fields (version, title, blocks)</li>
                <li>Duplicate block IDs</li>
                <li>Invalid block structure</li>
            </ul>
        </div>
    </body>
    </html>`;
  }

  private _simpleMarkdownToHtml(text: string): string {
    return text
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  private _escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
} 