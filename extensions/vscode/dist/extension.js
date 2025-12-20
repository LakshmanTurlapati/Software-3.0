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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const editor_1 = require("./editor");
let outputChannel;
function activate(context) {
    try {
        console.log('Software3 extension: Starting activation...');
        // Software 3 extension is now active
        // Create output channel
        outputChannel = vscode.window.createOutputChannel('Software3');
        context.subscriptions.push(outputChannel);
        outputChannel.appendLine('Software3 extension activated');
        // Register custom editor for .s3 files
        try {
            const editorRegistration = editor_1.S3DocumentEditor.register(context);
            context.subscriptions.push(editorRegistration);
            outputChannel.appendLine('Custom editor registered successfully');
        }
        catch (error) {
            outputChannel.appendLine(`Failed to register custom editor: ${error.message}`);
            vscode.window.showErrorMessage(`Software3: Failed to register custom editor: ${error.message}`);
            console.error('Failed to register custom editor:', error);
        }
        // Register commands
        try {
            registerCommands(context);
            outputChannel.appendLine('Commands registered successfully');
        }
        catch (error) {
            outputChannel.appendLine(`Failed to register commands: ${error.message}`);
            vscode.window.showErrorMessage(`Software3: Failed to register commands: ${error.message}`);
            console.error('Failed to register commands:', error);
        }
        console.log('Software3 extension: Activation completed successfully');
    }
    catch (error) {
        console.error('Software3 extension: Activation failed:', error);
        vscode.window.showErrorMessage(`Software3: Extension activation failed: ${error.message}`);
        throw error;
    }
}
function registerCommands(context) {
    // Export to HTML command
    const exportHtmlCommand = vscode.commands.registerCommand('software3.export.html', async (uri) => {
        const resource = uri || vscode.window.activeTextEditor?.document.uri;
        if (!resource) {
            vscode.window.showErrorMessage('No .s3 file selected');
            return;
        }
        try {
            const content = await vscode.workspace.fs.readFile(resource);
            const decoder = new TextDecoder();
            const document = JSON.parse(decoder.decode(content));
            // Simple HTML generation
            const html = generateSimpleHtml(document);
            const outputPath = resource.fsPath.replace(/\.s3$/, '.html');
            const outputUri = vscode.Uri.file(outputPath);
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(outputUri, encoder.encode(html));
            vscode.window.showInformationMessage(`Exported to ${outputPath}`);
            const openFile = await vscode.window.showInformationMessage('Export complete! Would you like to open the HTML file?', 'Open File', 'Cancel');
            if (openFile === 'Open File') {
                await vscode.env.openExternal(outputUri);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Export failed: ${error.message || 'Unknown error'}`);
            outputChannel.appendLine(`Export error: ${error}`);
        }
    });
    // Export to Markdown command
    const exportMarkdownCommand = vscode.commands.registerCommand('software3.export.markdown', async (uri) => {
        const resource = uri || vscode.window.activeTextEditor?.document.uri;
        if (!resource) {
            vscode.window.showErrorMessage('No .s3 file selected');
            return;
        }
        try {
            const content = await vscode.workspace.fs.readFile(resource);
            const decoder = new TextDecoder();
            const document = JSON.parse(decoder.decode(content));
            // Simple Markdown generation
            const markdown = generateSimpleMarkdown(document);
            const outputPath = resource.fsPath.replace(/\.s3$/, '.md');
            const outputUri = vscode.Uri.file(outputPath);
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(outputUri, encoder.encode(markdown));
            vscode.window.showInformationMessage(`Exported to ${outputPath}`);
            const openFile = await vscode.window.showInformationMessage('Export complete! Would you like to open the Markdown file?', 'Open File', 'Cancel');
            if (openFile === 'Open File') {
                await vscode.commands.executeCommand('vscode.open', outputUri);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Export failed: ${error.message || 'Unknown error'}`);
            outputChannel.appendLine(`Export error: ${error}`);
        }
    });
    // Validate command
    const validateCommand = vscode.commands.registerCommand('software3.validate', async (uri) => {
        const resource = uri || vscode.window.activeTextEditor?.document.uri;
        if (!resource) {
            vscode.window.showErrorMessage('No .s3 file selected');
            return;
        }
        try {
            const content = await vscode.workspace.fs.readFile(resource);
            const validation = validateS3Document(content.toString());
            if (validation.valid) {
                vscode.window.showInformationMessage('Document is valid!');
            }
            else {
                const errorCount = validation.errors.length;
                vscode.window.showErrorMessage(`Validation failed: ${errorCount} error(s)`);
                // Show detailed errors in output channel
                outputChannel.clear();
                outputChannel.appendLine('Software3 Validation Results');
                outputChannel.appendLine('================================');
                validation.errors.forEach((error, index) => {
                    outputChannel.appendLine(`${index + 1}. ${error.message} (${error.path})`);
                });
                outputChannel.show();
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Validation failed: ${error.message || 'Unknown error'}`);
            outputChannel.appendLine(`Validation error: ${error}`);
        }
    });
    // Statistics command
    const statsCommand = vscode.commands.registerCommand('software3.stats', async (uri) => {
        const resource = uri || vscode.window.activeTextEditor?.document.uri;
        if (!resource) {
            vscode.window.showErrorMessage('No .s3 file selected');
            return;
        }
        try {
            const content = await vscode.workspace.fs.readFile(resource);
            const decoder = new TextDecoder();
            const document = JSON.parse(decoder.decode(content));
            const stats = generateStats(document);
            const message = `Document Statistics:

Blocks: ${stats.totalBlocks}
Estimated Reading Time: ${stats.estimatedReadingTime} minutes
Languages: ${stats.languages.join(', ')}`;
            vscode.window.showInformationMessage(message, { modal: true });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to generate statistics: ${error.message || 'Unknown error'}`);
        }
    });
    // Create new document command
    const createCommand = vscode.commands.registerCommand('software3.create', async () => {
        const title = await vscode.window.showInputBox({
            prompt: 'Enter document title',
            placeHolder: 'My Software 3 Document'
        });
        if (!title) {
            return;
        }
        const author = await vscode.window.showInputBox({
            prompt: 'Enter author name (optional)',
            placeHolder: 'Your Name'
        });
        const document = createS3Document(title, author || 'Unknown');
        const content = JSON.stringify(document, null, 2);
        const fileName = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.s3';
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        const newFileUri = vscode.Uri.file(`${workspaceRoot}/${fileName}`);
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(newFileUri, encoder.encode(content));
        await vscode.window.showTextDocument(newFileUri);
        vscode.window.showInformationMessage(`Created new Software3 document: ${fileName}`);
    });
    // Auto-populate empty .s3 files when opened
    const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(async (document) => {
        if (document.fileName.endsWith('.s3')) {
            const content = document.getText().trim();
            // Handle completely empty files
            if (content === '') {
                const defaultStructure = {
                    instructions: '',
                    code: '',
                    language: ''
                };
                const templateContent = JSON.stringify(defaultStructure, null, 2);
                const edit = new vscode.WorkspaceEdit();
                edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), templateContent);
                await vscode.workspace.applyEdit(edit);
                outputChannel.appendLine(`Initialized empty S3 file: ${document.fileName}`);
            }
        }
    });
    // Register all commands and event handlers
    context.subscriptions.push(exportHtmlCommand, exportMarkdownCommand, validateCommand, statsCommand, createCommand, onDidOpenTextDocument);
}
// Helper functions
function detectLanguage(code) {
    try {
        // Simple pattern-based language detection - no external dependencies
        // Python detection
        if (code.includes('def ') || code.includes('import ') && code.includes('from ') ||
            code.includes('print(') || /^\s*#[^{]/.test(code) || code.includes('__init__') ||
            code.includes('self.') || code.includes('async def') || code.includes('await ')) {
            return 'python';
        }
        // TypeScript detection (before JavaScript as it's a superset)
        if (code.includes('interface ') || code.includes(': string') || code.includes(': number') ||
            code.includes('export ') || code.includes('import type') || code.includes('enum ') ||
            code.includes(': boolean') || code.includes('<T>') || code.includes('as ')) {
            return 'typescript';
        }
        // JavaScript detection
        if (code.includes('function ') || code.includes('const ') || code.includes('let ') ||
            code.includes('console.log') || code.includes('=>') || code.includes('typeof') ||
            code.includes('require(') || code.includes('module.exports')) {
            return 'javascript';
        }
        // HTML detection
        if (code.includes('<!DOCTYPE') || code.includes('<html') || code.includes('<head>') ||
            code.includes('<body>') || code.includes('<div') || code.includes('</')) {
            return 'html';
        }
        // CSS detection
        if ((code.includes('{') && code.includes('}') && code.includes(':') && code.includes(';')) &&
            (code.includes('color:') || code.includes('background') || code.includes('margin') ||
                code.includes('padding') || code.includes('display:') || code.includes('.') || code.includes('#'))) {
            return 'css';
        }
        // Go detection
        if (code.includes('package main') || code.includes('func ') || code.includes('fmt.Print') ||
            code.includes('go ') || code.includes('import (')) {
            return 'go';
        }
        // Rust detection
        if (code.includes('fn ') || code.includes('println!') || code.includes('let mut ') ||
            code.includes('impl ') || code.includes('pub ') || code.includes('match ') ||
            code.includes('Result<')) {
            return 'rust';
        }
        // Java detection
        if (code.includes('public class') || code.includes('private ') || code.includes('System.out') ||
            code.includes('public static void main') || code.includes('protected ')) {
            return 'java';
        }
        // C++ detection
        if (code.includes('std::') || code.includes('cout') || code.includes('namespace ') ||
            code.includes('#include <iostream>') || code.includes('template<')) {
            return 'cpp';
        }
        // C detection
        if (code.includes('#include') || code.includes('int main') || code.includes('void ') ||
            code.includes('printf(') || code.includes('scanf(')) {
            return 'c';
        }
        // C# detection
        if (code.includes('using ') || code.includes('Console.Write') || code.includes('namespace ') ||
            code.includes('public class')) {
            return 'csharp';
        }
        // PHP detection
        if (code.includes('<?php') || code.includes('echo ') || code.includes('$_') ||
            code.includes('function ') && code.includes('$')) {
            return 'php';
        }
        // Ruby detection
        if (code.includes('class ') && (code.includes('def ') || code.includes('end')) ||
            code.includes('puts ') || code.includes('@')) {
            return 'ruby';
        }
        // SQL detection
        if (code.includes('SELECT ') || code.includes('FROM ') || code.includes('WHERE ') ||
            code.includes('INSERT INTO') || code.includes('UPDATE ') || code.includes('DELETE FROM')) {
            return 'sql';
        }
        // Shell/Bash detection
        if (code.includes('#!/bin/bash') || code.includes('echo ') || code.includes('if [') ||
            code.includes('then') || code.includes('fi') || code.includes('$1')) {
            return 'bash';
        }
        // YAML detection
        if (!code.includes('{') && (code.includes(':') && code.includes('\n') &&
            (code.includes('  -') || code.includes('- ')))) {
            return 'yaml';
        }
        // JSON detection
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
        console.log('[S3Extension] Language detection failed, defaulting to javascript');
        return 'javascript';
    }
}
function generateSimpleHtml(document) {
    // Handle both old and new format
    let instructions = '';
    let code = '';
    if (document.instructions && document.code) {
        // New simplified format
        instructions = document.instructions;
        code = document.code;
    }
    else if (document.blocks && document.blocks.length > 0) {
        // Old format fallback
        instructions = document.blocks[0].text || 'No instructions';
        code = document.blocks[0].code || '// No code';
    }
    else {
        instructions = '# Empty Document\nThis document is empty.';
        code = '// Empty document';
    }
    const detectedLanguage = detectLanguage(code);
    return `<!DOCTYPE html>
<html>
<head>
  <title>Software 3 Document</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-vs.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-${detectedLanguage}.min.js"></script>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
    .container { border: 1px solid #ccc; border-radius: 8px; overflow: hidden; position: relative; }
    .code-icon { position: absolute; top: 15px; right: 15px; background: #007acc; color: white; border: none; border-radius: 6px; width: 32px; height: 32px; cursor: pointer; z-index: 10; font-size: 14px; }
    .instructions { padding: 50px 25px 25px 25px; }
    .code { padding: 50px 25px 25px 25px; background: #1e1e1e; display: none; }
    pre { margin: 0; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; overflow-x: auto; background: transparent !important; }
    code { background: transparent !important; color: #d4d4d4 !important; }
  </style>
</head>
<body>
  <div class="container">
    <button class="code-icon" onclick="toggleView()"><i class="fas fa-code" id="toggle-icon"></i></button>
    <div class="instructions" id="instructions">${instructions.replace(/\n/g, '<br>')}</div>
    <div class="code" id="code"><pre><code class="language-${detectedLanguage}">${code}</code></pre></div>
  </div>
  <script>
    let showingCode = false;
    function toggleView() {
      const instructions = document.getElementById('instructions');
      const code = document.getElementById('code');
      const icon = document.getElementById('toggle-icon');
      const button = document.querySelector('.code-icon');
      if (showingCode) {
        instructions.style.display = 'block';
        code.style.display = 'none';
        icon.className = 'fas fa-code';
        button.title = 'View code';
        showingCode = false;
      } else {
        instructions.style.display = 'none';
        code.style.display = 'block';
        icon.className = 'fas fa-file-lines';
        button.title = 'Back to instructions';
        showingCode = true;
        Prism.highlightAll();
      }
    }
    window.addEventListener('load', function() {
      Prism.highlightAll();
    });
  </script>
</body>
</html>`;
}
function generateSimpleMarkdown(document) {
    // Handle both old and new format
    if (document.instructions && document.code) {
        // New simplified format
        return `${document.instructions}\n\n\`\`\`\n${document.code}\n\`\`\`\n`;
    }
    else if (document.blocks && document.blocks.length > 0) {
        // Old format fallback
        let markdown = `# ${document.title || 'Software 3 Document'}\n\n`;
        document.blocks.forEach((block) => {
            markdown += `${block.text}\n\n`;
            markdown += `\`\`\`${block.language || ''}\n${block.code}\n\`\`\`\n\n`;
        });
        return markdown;
    }
    else {
        return '# Empty Document\n\nThis document is empty.';
    }
}
function validateS3Document(content) {
    try {
        const document = JSON.parse(content);
        const errors = [];
        // Check for new simplified format
        if (document.instructions !== undefined && document.code !== undefined) {
            // New format is valid if both fields exist
            if (typeof document.instructions !== 'string') {
                errors.push({ message: 'Instructions must be a string', path: '/instructions', code: 'invalid_type' });
            }
            if (typeof document.code !== 'string') {
                errors.push({ message: 'Code must be a string', path: '/code', code: 'invalid_type' });
            }
        }
        else {
            // Fallback to old format validation
            if (!Array.isArray(document.blocks)) {
                errors.push({ message: 'Missing "instructions" and "code" fields, or "blocks" array for legacy format', path: '/', code: 'missing_field' });
            }
        }
        return { valid: errors.length === 0, errors };
    }
    catch (error) {
        return {
            valid: false,
            errors: [{ message: 'Invalid JSON', path: '', code: 'parse_error' }]
        };
    }
}
function generateStats(document) {
    const languages = new Set();
    document.blocks?.forEach((block) => {
        if (block.language === 'multi' && typeof block.code === 'object') {
            Object.keys(block.code).forEach(lang => languages.add(lang));
        }
        else {
            languages.add(block.language);
        }
    });
    return {
        totalBlocks: document.blocks?.length || 0,
        estimatedReadingTime: Math.ceil((document.blocks?.length || 0) * 2), // 2 minutes per block
        languages: Array.from(languages)
    };
}
function createS3Document(title, author) {
    return {
        instructions: '',
        code: '',
        language: ''
    };
}
function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
    }
}
//# sourceMappingURL=extension.js.map