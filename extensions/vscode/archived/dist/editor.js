"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3DocumentEditor = void 0;
const vscode = __importStar(require("vscode"));
const editor_simple_editable_1 = require("./editor-simple-editable");
const executionHandler_1 = require("./executionHandler");
/**
 * Custom Document for S3 files with editing support
 */
class S3CustomDocument extends vscode.Disposable {
    static async create(uri, backupId) {
        const dataFile = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri;
        const fileData = await vscode.workspace.fs.readFile(dataFile);
        return new S3CustomDocument(uri, fileData);
    }
    constructor(uri, initialData) {
        super(() => {
            // Cleanup resources
        });
        this._edits = [];
        this._savedEdits = [];
        this._onDidChange = new vscode.EventEmitter();
        this.onDidChange = this._onDidChange.event;
        this._onDidChangeDocument = new vscode.EventEmitter();
        this.onDidChangeDocument = this._onDidChangeDocument.event;
        this._onDidDispose = new vscode.EventEmitter();
        this.onDidDispose = this._onDidDispose.event;
        this._uri = uri;
        this._documentData = initialData;
    }
    get uri() { return this._uri; }
    get documentData() { return this._documentData; }
    get isDirty() {
        return this._edits.length > this._savedEdits.length;
    }
    dispose() {
        this._onDidDispose.fire();
        this._onDidChange.dispose();
        this._onDidChangeDocument.dispose();
        super.dispose();
    }
    /**
     * Apply an edit to the document
     */
    makeEdit(edit) {
        this._edits.push(edit);
        // Apply the edit to document data
        const s3Doc = this.getS3Document();
        if (edit.type === 'instructions') {
            s3Doc.instructions = edit.content;
        }
        else if (edit.type === 'code') {
            s3Doc.code = edit.content;
        }
        else if (edit.type === 'language') {
            s3Doc.language = edit.content;
        }
        const newData = new TextEncoder().encode(JSON.stringify(s3Doc, null, 2));
        this._documentData = newData;
        this._onDidChange.fire({
            label: `Edit ${edit.type}`,
            undo: () => {
                // Remove the last edit and revert
                this._edits.pop();
                this.revertToEdits();
            },
            redo: () => {
                // Re-apply the edit
                this._edits.push(edit);
                this.revertToEdits();
            }
        });
        this._onDidChangeDocument.fire({
            content: this._documentData,
            edits: this._edits
        });
    }
    /**
     * Save the document
     */
    save() {
        this._savedEdits = [...this._edits];
    }
    /**
     * Revert all unsaved changes
     */
    revert() {
        this._edits = [...this._savedEdits];
        this.revertToEdits();
    }
    /**
     * Get the current S3 document content
     */
    getS3Document() {
        const decoder = new TextDecoder();
        const textContent = decoder.decode(this._documentData);
        try {
            return JSON.parse(textContent);
        }
        catch {
            // Return default document if parsing fails
            return { instructions: '', code: '', language: '' };
        }
    }
    revertToEdits() {
        // Rebuild document from base + edits
        const decoder = new TextDecoder();
        const baseContent = decoder.decode(this._documentData);
        let s3Doc;
        try {
            s3Doc = JSON.parse(baseContent);
        }
        catch {
            s3Doc = { instructions: '', code: '', language: '' };
        }
        // Apply all saved edits
        for (const edit of this._edits) {
            if (edit.type === 'instructions') {
                s3Doc.instructions = edit.content;
            }
            else if (edit.type === 'code') {
                s3Doc.code = edit.content;
            }
            else if (edit.type === 'language') {
                s3Doc.language = edit.content;
            }
        }
        this._documentData = new TextEncoder().encode(JSON.stringify(s3Doc, null, 2));
        this._onDidChangeDocument.fire({
            content: this._documentData,
            edits: this._edits
        });
    }
}
/**
 * Custom Editor Provider for Software 3 (.s3) files
 * Jupyter-like interface with instructions/code editing
 */
class S3DocumentEditor {
    static register(context) {
        const provider = new S3DocumentEditor(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider('software3.editor', provider, {
            webviewOptions: {
                retainContextWhenHidden: true,
            },
            supportsMultipleEditorsPerDocument: false,
        });
        return providerRegistration;
    }
    constructor(context) {
        this.context = context;
        this._onDidChangeCustomDocument = new vscode.EventEmitter();
        this.onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;
        this.executionHandler = new executionHandler_1.ExecutionHandler(context);
    }
    /**
     * Save a custom document.
     */
    async saveCustomDocument(document, cancellation) {
        await this.saveDocument(document);
    }
    /**
     * Save a custom document to a new location.
     */
    async saveCustomDocumentAs(document, destination, cancellation) {
        await this.saveDocumentAs(document, destination);
    }
    /**
     * Revert a custom document to its last saved state.
     */
    async revertCustomDocument(document, cancellation) {
        document.revert();
    }
    /**
     * Back up a custom document.
     */
    async backupCustomDocument(document, context, cancellation) {
        return {
            id: context.destination.toString(),
            delete: async () => {
                try {
                    await vscode.workspace.fs.delete(context.destination);
                }
                catch {
                    // Ignore errors
                }
            }
        };
    }
    async saveDocument(document) {
        await vscode.workspace.fs.writeFile(document.uri, document.documentData);
        document.save();
    }
    async saveDocumentAs(document, destination) {
        await vscode.workspace.fs.writeFile(destination, document.documentData);
        document.save();
    }
    /**
     * If the code comes in fenced form ```lang\n...```, extract language and raw code
     */
    extractFencedCode(input) {
        if (!input)
            return { code: '' };
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
    applySyntaxHighlighting(code, language) {
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
     * Enhanced syntax highlighting with improved fallback strategies
     * Uses inline styles for reliable rendering in webview contexts
     */
    async renderCodeWithVSCode(code, language) {
        const config = vscode.workspace.getConfiguration('software3');
        const engine = config.get('syntaxHighlighting.engine', 'vscode');
        // Format HTML code for better readability
        let codeToRender = code;
        if (language === 'html' || language === 'htm') {
            codeToRender = this.formatHtmlCode(code);
        }
        // Try multiple highlighting approaches for reliability
        const engines = ['hljs', 'inline', 'vscode', 'basic'];
        for (const currentEngine of engines) {
            try {
                switch (currentEngine) {
                    case 'hljs':
                        const hljsResult = this.renderWithHighlightJS(codeToRender, language);
                        return hljsResult;
                    case 'vscode':
                        const vsCodeResult = await this.renderWithVSCodeAPI(codeToRender, language);
                        if (vsCodeResult) {
                            return vsCodeResult;
                        }
                        break;
                    case 'inline':
                        const inlineResult = this.renderWithInlineStyles(codeToRender, language);
                        return inlineResult;
                    case 'basic':
                        const basicResult = this.renderBasicHighlighting(codeToRender, language);
                        return basicResult;
                }
            }
            catch (error) {
                console.error(`[S3Editor] ${currentEngine} highlighting failed:`, error);
                continue;
            }
        }
        // Ultimate fallback
        return `<pre><code class="language-${language}">${this.escapeHtml(code)}</code></pre>`;
    }
    /**
     * VS Code API-based highlighting using markdown renderer
     */
    async renderWithVSCodeAPI(code, language) {
        try {
            const fenced = `\`\`\`${language}\n${code}\n\`\`\``;
            const html = await vscode.commands.executeCommand('markdown.api.render', fenced);
            const match = html.match(/<pre[\s\S]*?<\/pre>/i);
            if (match && match[0]) {
                const block = match[0];
                // Check if highlighting was successful (has shiki classes, hljs classes, or span elements)
                const hasShikiHighlighting = /class\s*=\s*"[^"]*shiki[^"]*"/i.test(block);
                const hasHljsHighlighting = /class\s*=\s*"[^"]*hljs[^"]*"/i.test(block);
                const hasSpanHighlighting = /<span\b[^>]*class\s*=\s*"[^"]*token[^"]*"[^>]*>/.test(block);
                const hasAnySpan = /<span\b[^>]*>/.test(block);
                const hasHighlighting = hasShikiHighlighting || hasHljsHighlighting || hasSpanHighlighting || hasAnySpan;
                if (hasHighlighting) {
                    return block;
                }
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Prism.js-based highlighting with theme synchronization
     */
    async renderWithPrism(code, language, theme) {
        try {
            // Map language aliases to Prism.js language identifiers
            const languageMap = {
                'javascript': 'javascript',
                'js': 'javascript',
                'typescript': 'typescript',
                'ts': 'typescript',
                'python': 'python',
                'py': 'python',
                'go': 'go',
                'rust': 'rust',
                'java': 'java',
                'cpp': 'cpp',
                'c++': 'cpp',
                'csharp': 'csharp',
                'c#': 'csharp',
                'php': 'php',
                'ruby': 'ruby',
                'css': 'css',
                'html': 'markup',
                'xml': 'markup',
                'json': 'json',
                'yaml': 'yaml',
                'yml': 'yaml',
                'bash': 'bash',
                'shell': 'bash',
                'sql': 'sql',
                'markdown': 'markdown',
                'md': 'markdown'
            };
            const prismLang = languageMap[language.toLowerCase()] || language.toLowerCase();
            // Determine theme based on VS Code's current theme
            let prismTheme = theme;
            if (theme === 'auto') {
                const currentTheme = vscode.window.activeColorTheme;
                prismTheme = currentTheme?.kind === vscode.ColorThemeKind.Dark ? 'vs-dark' : 'vs';
            }
            // Use Prism.js highlighting via web view script execution
            // This is a simplified implementation - in a full implementation,
            // you would include Prism.js files and execute highlighting
            const highlighted = this.highlightWithPrismFallback(code, prismLang, prismTheme);
            return `<pre class="language-${prismLang}" data-theme="${prismTheme}"><code class="language-${prismLang}">${highlighted}</code></pre>`;
        }
        catch {
            return null;
        }
    }
    /**
     * Simplified Prism.js-style highlighting fallback
     */
    highlightWithPrismFallback(code, language, theme) {
        // Enhanced regex-based highlighting that mimics Prism.js structure
        let highlighted = this.escapeHtml(code);
        // Apply language-specific patterns with Prism.js-style classes
        switch (language) {
            case 'javascript':
            case 'typescript':
                highlighted = this.highlightJavaScriptPrism(highlighted);
                break;
            case 'python':
                highlighted = this.highlightPythonPrism(highlighted);
                break;
            case 'go':
                highlighted = this.highlightGoPrism(highlighted);
                break;
            case 'rust':
                highlighted = this.highlightRustPrism(highlighted);
                break;
            default:
                highlighted = this.highlightGenericPrism(highlighted);
        }
        return highlighted;
    }
    /**
     * Inline styles highlighting - reliable method using hardcoded colors
     */
    renderWithInlineStyles(code, language) {
        // Detect theme (light/dark) based on VS Code context
        const isDark = vscode.window.activeColorTheme?.kind === vscode.ColorThemeKind.Dark;
        // Define color schemes - using transparent for elements that were orange
        const colors = isDark ? {
            keyword: '#FF00FF', // Bright magenta
            string: '#00FF00', // Bright green
            comment: '#FFFF00', // Bright yellow
            number: '#FF0000', // Bright red
            function: '#00FFFF', // Bright cyan
            property: 'transparent', // Changed from orange to transparent
            decorator: '#FF69B4', // Hot pink
            builtin: '#9370DB', // Medium purple
            operator: '#FFFFFF', // White
            punctuation: '#FFFFFF' // White
        } : {
            keyword: '#FF00FF', // Bright magenta
            string: '#008000', // Green
            comment: '#FF0000', // Red
            number: '#0000FF', // Blue
            function: 'transparent', // Changed from orange to transparent
            property: '#800080', // Purple
            decorator: '#FF1493', // Deep pink
            builtin: '#2E8B57', // Sea green
            operator: '#000000', // Black
            punctuation: '#000000' // Black
        };
        let highlighted = this.escapeHtml(code);
        // Apply language-specific highlighting with inline styles
        switch (language.toLowerCase()) {
            case 'javascript':
            case 'js':
            case 'typescript':
            case 'ts':
                highlighted = this.highlightJavaScriptInline(highlighted, colors);
                break;
            case 'python':
            case 'py':
                highlighted = this.highlightPythonInline(highlighted, colors);
                break;
            case 'go':
                highlighted = this.highlightGoInline(highlighted, colors);
                break;
            case 'rust':
                highlighted = this.highlightRustInline(highlighted, colors);
                break;
            default:
                highlighted = this.highlightGenericInline(highlighted, colors);
        }
        return `<pre><code class="language-${language}">${highlighted}</code></pre>`;
    }
    /**
     * Highlight.js-based highlighting - relies on client-side JS
     */
    renderWithHighlightJS(code, language) {
        // Map some language names to highlight.js names
        const langMap = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python'
        };
        const hljsLang = langMap[language.toLowerCase()] || language.toLowerCase();
        const escapedCode = this.escapeHtml(code);
        // Return HTML that Highlight.js can process
        return `<pre><code class="language-${hljsLang} hljs">${escapedCode}</code></pre>`;
    }
    /**
     * Basic highlighting using simple patterns
     */
    renderBasicHighlighting(code, language) {
        const highlighted = this.applySyntaxHighlighting(code, language);
        return `<pre><code class="language-${language}">${highlighted}</code></pre>`;
    }
    /**
     * JavaScript highlighting with inline styles
     */
    highlightJavaScriptInline(code, colors) {
        // Keywords
        code = code.replace(/\b(abstract|as|async|await|boolean|break|case|catch|class|const|constructor|continue|debugger|declare|default|delete|do|else|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|instanceof|interface|is|keyof|let|module|namespace|never|new|null|number|object|of|package|private|protected|public|readonly|return|set|static|string|super|switch|symbol|this|throw|true|try|type|typeof|undefined|unique|unknown|var|void|while|with|yield)\b/g, `<span style="color: ${colors.keyword}; font-weight: 600;">$1</span>`);
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
    /**
     * Python highlighting with inline styles
     */
    highlightPythonInline(code, colors) {
        // Keywords
        code = code.replace(/\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\b/g, `<span style="color: ${colors.keyword}; font-weight: 600;">$1</span>`);
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
    /**
     * Go highlighting with inline styles
     */
    highlightGoInline(code, colors) {
        // Keywords
        code = code.replace(/\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/g, `<span style="color: ${colors.keyword}; font-weight: 600;">$1</span>`);
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
    /**
     * Rust highlighting with inline styles
     */
    highlightRustInline(code, colors) {
        // Keywords
        code = code.replace(/\b(as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while)\b/g, `<span style="color: ${colors.keyword}; font-weight: 600;">$1</span>`);
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
    /**
     * Generic highlighting with inline styles
     */
    highlightGenericInline(code, colors) {
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
    /**
     * Enhanced JavaScript/TypeScript highlighting with Prism.js-style classes
     */
    highlightJavaScriptPrism(code) {
        // Keywords with more comprehensive list
        code = code.replace(/\b(abstract|as|async|await|boolean|break|case|catch|class|const|constructor|continue|debugger|declare|default|delete|do|else|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|instanceof|interface|is|keyof|let|module|namespace|never|new|null|number|object|of|package|private|protected|public|readonly|return|set|static|string|super|switch|symbol|this|throw|true|try|type|typeof|undefined|unique|unknown|var|void|while|with|yield)\b/g, '<span class="token keyword">$1</span>');
        // Strings with better template literal support
        code = code.replace(/(`)((?:\\.|\$\{[^}]*\}|(?!\1)[^\\])*?)\1/g, '<span class="token template-string"><span class="token string">$1$2$1</span></span>');
        code = code.replace(/(['"])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="token string">$1$2$1</span>');
        // Numbers and hex
        code = code.replace(/\b(0x[a-fA-F0-9]+|\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, '<span class="token number">$&</span>');
        // Comments
        code = code.replace(/\/\/.*$/gm, '<span class="token comment">$&</span>');
        code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="token comment">$&</span>');
        // Functions and methods
        code = code.replace(/\b(\w+)(?=\s*\()/g, '<span class="token function">$1</span>');
        // Properties and attributes
        code = code.replace(/\.(\w+)/g, '.<span class="token property">$1</span>');
        // Operators
        code = code.replace(/([+\-*/%=<>!&|^~?:])/g, '<span class="token operator">$1</span>');
        // Punctuation
        code = code.replace(/([{}\[\]();,])/g, '<span class="token punctuation">$1</span>');
        return code;
    }
    /**
     * Enhanced Python highlighting with Prism.js-style classes
     */
    highlightPythonPrism(code) {
        // Keywords
        code = code.replace(/\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\b/g, '<span class="token keyword">$1</span>');
        // Built-in functions
        code = code.replace(/\b(abs|all|any|ascii|bin|bool|bytearray|bytes|callable|chr|classmethod|compile|complex|delattr|dict|dir|divmod|enumerate|eval|exec|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|isinstance|issubclass|iter|len|list|locals|map|max|memoryview|min|next|object|oct|open|ord|pow|print|property|range|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|vars|zip)\b/g, '<span class="token builtin">$1</span>');
        // Strings with f-strings and raw strings
        code = code.replace(/(f|r|fr|rf)?(['"])((?:\\.|(?!\2)[^\\])*?)\2/g, '<span class="token string">$1$2$3$2</span>');
        code = code.replace(/(f|r|fr|rf)?("""|''')((?:\\.|(?!\2)[\s\S])*?)\2/g, '<span class="token string">$1$2$3$2</span>');
        // Numbers
        code = code.replace(/\b(\d+\.?\d*(?:[eE][+-]?\d+)?[jJ]?)\b/g, '<span class="token number">$&</span>');
        // Comments
        code = code.replace(/#.*$/gm, '<span class="token comment">$&</span>');
        // Decorators
        code = code.replace(/@\w+/g, '<span class="token decorator">$&</span>');
        // Functions and classes
        code = code.replace(/\b(def|class)\s+(\w+)/g, '$1 <span class="token function">$2</span>');
        // Self parameter
        code = code.replace(/\bself\b/g, '<span class="token keyword">$&</span>');
        return code;
    }
    /**
     * Go language highlighting with Prism.js-style classes
     */
    highlightGoPrism(code) {
        // Keywords
        code = code.replace(/\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/g, '<span class="token keyword">$1</span>');
        // Built-in types
        code = code.replace(/\b(bool|byte|complex128|complex64|error|float32|float64|int|int16|int32|int64|int8|rune|string|uint|uint16|uint32|uint64|uint8|uintptr)\b/g, '<span class="token builtin">$1</span>');
        // Strings
        code = code.replace(/(`)((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="token string">$1$2$1</span>');
        code = code.replace(/(['"])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="token string">$1$2$1</span>');
        // Numbers
        code = code.replace(/\b(\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, '<span class="token number">$&</span>');
        // Comments
        code = code.replace(/\/\/.*$/gm, '<span class="token comment">$&</span>');
        code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="token comment">$&</span>');
        // Functions
        code = code.replace(/\bfunc\s+(\w+)/g, 'func <span class="token function">$1</span>');
        return code;
    }
    /**
     * Rust language highlighting with Prism.js-style classes
     */
    highlightRustPrism(code) {
        // Keywords
        code = code.replace(/\b(as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while)\b/g, '<span class="token keyword">$1</span>');
        // Built-in types
        code = code.replace(/\b(bool|char|f32|f64|i8|i16|i32|i64|i128|isize|str|u8|u16|u32|u64|u128|usize)\b/g, '<span class="token builtin">$1</span>');
        // Strings and characters
        code = code.replace(/(r#*)?(['"])((?:\\.|(?!\2)[^\\])*?)\2(#*)?/g, '<span class="token string">$1$2$3$2$4</span>');
        // Numbers
        code = code.replace(/\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[fiu]?(?:8|16|32|64|128|size)?)\b/g, '<span class="token number">$&</span>');
        // Comments
        code = code.replace(/\/\/.*$/gm, '<span class="token comment">$&</span>');
        code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="token comment">$&</span>');
        // Macros
        code = code.replace(/(\w+!)\s*\(/g, '<span class="token macro">$1</span>(');
        // Functions
        code = code.replace(/\bfn\s+(\w+)/g, 'fn <span class="token function">$1</span>');
        return code;
    }
    /**
     * Generic highlighting for unknown languages
     */
    highlightGenericPrism(code) {
        // Strings
        code = code.replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="token string">$1$2$1</span>');
        // Numbers
        code = code.replace(/\b\d+\.?\d*\b/g, '<span class="token number">$&</span>');
        // Comments (various styles)
        code = code.replace(/\/\/.*$/gm, '<span class="token comment">$&</span>');
        code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="token comment">$&</span>');
        code = code.replace(/#.*$/gm, '<span class="token comment">$&</span>');
        return code;
    }
    /**
     * Legacy JavaScript/TypeScript highlighting with VS Code theme colors
     */
    highlightJavaScript(code) {
        // Keywords
        code = code.replace(/\b(const|let|var|function|class|if|else|for|while|do|switch|case|default|break|continue|return|try|catch|finally|throw|new|this|super|extends|implements|import|export|from|as|async|await|typeof|instanceof)\b/g, '<span class="token-keyword">$1</span>');
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
    highlightPython(code) {
        // Keywords
        code = code.replace(/\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|break|continue|pass|lambda|and|or|not|in|is|True|False|None|async|await)\b/g, '<span class="token-keyword">$1</span>');
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
    highlightCSS(code) {
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
    highlightJSON(code) {
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
    highlightGeneric(code) {
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
    detectLanguage(code) {
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
                }
                catch {
                    // JSON parsing failed
                }
            }
            if (code.includes('body {') || code.includes('color:') || code.includes('.class')) {
                return 'css';
            }
            // Default fallback
            return 'javascript';
        }
        catch (error) {
            console.log('[S3Editor] Language detection failed, defaulting to javascript');
            return 'javascript';
        }
    }
    /**
     * Called when a new editor is opened.
     */
    async openCustomDocument(uri, openContext, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token) {
        console.log('[S3Editor] openCustomDocument called for:', uri.toString());
        try {
            const document = await S3CustomDocument.create(uri, openContext?.backupId);
            console.log('[S3Editor] Document created successfully');
            return document;
        }
        catch (error) {
            console.error('[S3Editor] Error in openCustomDocument:', error);
            throw error;
        }
    }
    /**
     * Called when our custom editor is opened.
     */
    async resolveCustomEditor(document, webviewPanel, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token) {
        console.log('[S3Editor] resolveCustomEditor called');
        try {
            // Setup webview options
            webviewPanel.webview.options = {
                enableScripts: true,
                localResourceRoots: [
                    this.context.extensionUri,
                    vscode.Uri.joinPath(this.context.extensionUri, 'media'),
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
                }
                catch (error) {
                    console.error('[S3Editor] Error updating webview:', error);
                    webviewPanel.webview.html = this.getErrorHtml(`Failed to load content: ${error}`);
                }
            };
            // Set initial content
            await updateWebview();
            // Listen for document changes (for live updates)
            const changeDocumentSubscription = document.onDidChangeDocument(() => {
                updateWebview();
            });
            // Refresh when the active color theme changes to keep colors in sync
            const themeChangeSubscription = vscode.window.onDidChangeActiveColorTheme(() => {
                updateWebview();
            });
            // Clean up when editor is closed
            webviewPanel.onDidDispose(() => {
                changeDocumentSubscription.dispose();
                themeChangeSubscription.dispose();
                // Clean up any running executions
                this.executionHandler.stopExecution(webviewPanel.webview.toString());
            });
            // Handle messages from webview
            webviewPanel.webview.onDidReceiveMessage(async (e) => {
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
                    case 'edit':
                        // Handle edit from webview
                        if (e.editType && e.content !== undefined) {
                            const edit = {
                                type: e.editType,
                                content: e.content,
                                timestamp: Date.now()
                            };
                            document.makeEdit(edit);
                            // Fire the change event for VS Code
                            this._onDidChangeCustomDocument.fire({
                                document,
                                undo: () => document.revert(),
                                redo: () => document.makeEdit(edit),
                                label: `Edit ${edit.type}`
                            });
                        }
                        return;
                    case 'save':
                        // Handle save request from webview
                        try {
                            await this.saveDocument(document);
                            webviewPanel.webview.postMessage({ type: 'saved' });
                        }
                        catch (error) {
                            vscode.window.showErrorMessage(`Failed to save: ${error}`);
                        }
                        return;
                    case 'execute':
                        // Handle code execution request
                        console.log('[S3Editor] Execute request received');
                        if (e.code && e.language) {
                            try {
                                await this.executionHandler.execute(e.code, e.language, webviewPanel);
                            }
                            catch (error) {
                                console.error('[S3Editor] Execution error:', error);
                                webviewPanel.webview.postMessage({
                                    type: 'execution-error',
                                    error: error.message || 'Execution failed'
                                });
                            }
                        }
                        return;
                    case 'stop-execution':
                        // Handle stop execution request
                        console.log('[S3Editor] Stop execution request received');
                        try {
                            await this.executionHandler.stopExecution(webviewPanel.webview.toString());
                            webviewPanel.webview.postMessage({
                                type: 'output',
                                text: 'Execution stopped.',
                                outputType: 'info'
                            });
                            webviewPanel.webview.postMessage({ type: 'execution-complete' });
                        }
                        catch (error) {
                            console.error('[S3Editor] Error stopping execution:', error);
                        }
                        return;
                }
            });
            console.log('[S3Editor] resolveCustomEditor completed successfully');
        }
        catch (error) {
            console.error('[S3Editor] Error in resolveCustomEditor:', error);
            webviewPanel.webview.html = this.getErrorHtml(`Extension error: ${error}`);
        }
    }
    /**
     * Generate HTML content for the simplified webview
     */
    async getHtmlForWebview(webview, document) {
        console.log('[S3Editor] getHtmlForWebview called');
        try {
            // Get document content
            const decoder = new TextDecoder();
            const textContent = decoder.decode(document.documentData);
            console.log('[S3Editor] Document content decoded, length:', textContent.length);
            if (!textContent || textContent.trim() === '') {
                console.log('[S3Editor] Document is empty, creating template');
                return await this.getTemplateDocumentHtml(webview);
            }
            const s3Document = JSON.parse(textContent);
            console.log('[S3Editor] Document parsed successfully');
            if (!s3Document.instructions || !s3Document.code) {
                console.log('[S3Editor] Invalid document structure');
                return this.getErrorHtml('Invalid Software 3 document: must have "instructions" and "code" fields');
            }
            return await this.generateSimpleView(s3Document, webview);
        }
        catch (error) {
            console.error('[S3Editor] Error in getHtmlForWebview:', error);
            return this.getErrorHtml(`Failed to parse document: ${error.message}`);
        }
    }
    async generateSimpleView(document, webview) {
        const instructionsHtml = await this.renderMarkdownWithVSCode(document.instructions);
        // Allow fenced code inside the raw .s3 `code` field to specify language explicitly
        const { language: fencedLang, code: rawCode } = this.extractFencedCode(document.code);
        // Use document.language first, then fenced language, then detect
        const detectedLanguage = document.language || fencedLang || this.detectLanguage(rawCode);
        const codeHtml = await this.renderCodeWithVSCode(rawCode, detectedLanguage);
        // Get local FontAwesome CSS URI
        const fontAwesomeUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'fontawesome', 'css', 'all.min.css'));
        // Get JavaScript file URI
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview.js'));
        return (0, editor_simple_editable_1.generateSimpleEditableHTML)(document, webview, fontAwesomeUri, instructionsHtml, codeHtml, detectedLanguage, scriptUri);
    }
    async getTemplateDocumentHtml(webview) {
        const templateDocument = {
            instructions: "",
            code: "",
            language: ""
        };
        if (!webview) {
            // Return a simple HTML template without webview-specific resources
            return this.getSimpleTemplateHtml(templateDocument);
        }
        return await this.generateSimpleView(templateDocument, webview);
    }
    getSimpleTemplateHtml(document) {
        return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Software 3 Document</title>
        <style>
          body {
            font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
          }
          .container {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            background: var(--vscode-editor-background);
          }
          h1 { color: var(--vscode-editor-foreground); }
          code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
          }
          pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 12px;
            border-radius: 4px;
            overflow-x: auto;
          }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Welcome to Software 3</h1>
            <p>This is a new Software 3 document. The editor will load once the document is saved with content.</p>
            <p>The S3 format includes:</p>
            <ul>
                <li><strong>instructions</strong> - Documentation in markdown format</li>
                <li><strong>code</strong> - Your code implementation</li>
                <li><strong>language</strong> - The programming language</li>
            </ul>
            <p>Example structure:</p>
            <pre><code>{
  "instructions": "Your documentation here",
  "code": "Your code here",
  "language": "javascript"
}</code></pre>
        </div>
    </body>
    </html>`;
    }
    getErrorHtml(errorMessage) {
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
            <p><strong>Note:</strong> This file should contain valid Software 3 JSON format with "instructions", "code", and optional "language" fields.</p>
        </div>
    </body>
    </html>`;
    }
    /**
     * Render markdown using VS Code's native markdown API for perfect 1:1 rendering
     */
    async renderMarkdownWithVSCode(text) {
        if (!text)
            return '';
        try {
            // Use VS Code's native markdown rendering API
            const html = await vscode.commands.executeCommand('markdown.api.render', text);
            // Apply VS Code theme-aware post-processing for better integration
            return this.enhanceMarkdownHtml(html);
        }
        catch (error) {
            console.log('[S3Editor] VS Code markdown API not available, falling back to simple renderer');
            // Fallback to enhanced simple markdown rendering
            return this.simpleMarkdownToHtml(text);
        }
    }
    /**
     * Enhanced simple markdown renderer with better code block support
     */
    simpleMarkdownToHtml(text) {
        if (!text)
            return '';
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
    enhanceMarkdownHtml(html) {
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
    escapeHtml(text) {
        if (!text)
            return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    formatHtmlCode(html) {
        if (!html)
            return '';
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
        const result = [];
        for (let line of lines) {
            line = line.trim();
            if (!line)
                continue;
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
}
exports.S3DocumentEditor = S3DocumentEditor;
//# sourceMappingURL=editor.js.map