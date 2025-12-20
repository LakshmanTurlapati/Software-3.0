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
exports.ExecutionHandler = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const net = __importStar(require("net"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ExecutionHandler {
    constructor(context) {
        this.context = context;
        this.runningProcesses = new Map();
        this.tempFiles = new Map();
        this.runningServers = new Map();
    }
    /**
     * Execute code based on language type
     */
    async execute(code, language, webviewPanel, s3FilePath, requirements) {
        console.log(`[ExecutionHandler] Executing ${language} code`);
        try {
            switch (language.toLowerCase()) {
                case 'html':
                case 'htm':
                    await this.executeHTML(code, webviewPanel);
                    break;
                case 'javascript':
                case 'js':
                    await this.executeJavaScript(code, webviewPanel);
                    break;
                case 'python':
                case 'py':
                    await this.executePython(code, webviewPanel, s3FilePath, requirements);
                    break;
                case 'typescript':
                case 'ts':
                    await this.executeTypeScript(code, webviewPanel);
                    break;
                case 'css':
                    await this.executeCSS(code, webviewPanel);
                    break;
                default:
                    webviewPanel.webview.postMessage({
                        type: 'output',
                        text: `Language '${language}' is not supported for execution yet.`,
                        outputType: 'error'
                    });
                    webviewPanel.webview.postMessage({ type: 'execution-complete' });
            }
        }
        catch (error) {
            console.error(`[ExecutionHandler] Error executing ${language}:`, error);
            webviewPanel.webview.postMessage({
                type: 'execution-error',
                error: error.message || 'Unknown error occurred'
            });
        }
    }
    /**
     * Execute HTML code with custom HTTP server
     */
    async executeHTML(code, webviewPanel) {
        try {
            // Get workspace folder or use temp directory
            let tempDir;
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                // Use workspace root for temp files
                const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                tempDir = path.join(workspaceRoot, '.s3-preview');
            }
            else {
                // Fallback to global storage if no workspace
                tempDir = path.join(this.context.globalStorageUri.fsPath, 'temp');
            }
            // Create temp directory if it doesn't exist
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            // Clean up old preview files (keep only last 5)
            this.cleanupOldPreviews(tempDir);
            const tempFileName = `preview_${Date.now()}.html`;
            const tempFilePath = path.join(tempDir, tempFileName);
            // Write code to temp file
            fs.writeFileSync(tempFilePath, code);
            this.tempFiles.set(webviewPanel.webview.toString(), tempFilePath);
            // Start our custom HTTP server
            await this.startHTMLServer(tempFilePath, webviewPanel);
        }
        catch (error) {
            console.error('[ExecutionHandler] Error executing HTML:', error);
            webviewPanel.webview.postMessage({
                type: 'execution-error',
                error: error.message || 'Failed to start HTML preview server'
            });
        }
    }
    /**
     * Start a custom HTTP server to serve HTML file
     */
    async startHTMLServer(filePath, webviewPanel) {
        // Find an available port
        const port = await this.findAvailablePort();
        // Create HTTP server
        const server = http.createServer((req, res) => {
            // Set CORS headers to allow access
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            // Handle the request
            if (req.url === '/' || req.url === '') {
                // Serve the HTML file
                fs.readFile(filePath, (err, data) => {
                    if (err) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('File not found');
                    }
                    else {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(data);
                    }
                });
            }
            else {
                // For other resources, try to serve from the same directory
                const resourcePath = path.join(path.dirname(filePath), req.url || '');
                fs.readFile(resourcePath, (err, data) => {
                    if (err) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('Resource not found');
                    }
                    else {
                        // Determine content type based on extension
                        const ext = path.extname(resourcePath).toLowerCase();
                        let contentType = 'text/plain';
                        if (ext === '.css')
                            contentType = 'text/css';
                        else if (ext === '.js')
                            contentType = 'application/javascript';
                        else if (ext === '.json')
                            contentType = 'application/json';
                        else if (ext === '.png')
                            contentType = 'image/png';
                        else if (ext === '.jpg' || ext === '.jpeg')
                            contentType = 'image/jpeg';
                        else if (ext === '.gif')
                            contentType = 'image/gif';
                        else if (ext === '.svg')
                            contentType = 'image/svg+xml';
                        res.writeHead(200, { 'Content-Type': contentType });
                        res.end(data);
                    }
                });
            }
        });
        // Start the server
        server.listen(port, '127.0.0.1', () => {
            console.log(`[ExecutionHandler] HTML server started on port ${port}`);
            // Store server reference for cleanup
            this.runningServers.set(webviewPanel.webview.toString(), server);
            // Send server URL to webview
            const serverUrl = `http://127.0.0.1:${port}`;
            webviewPanel.webview.postMessage({
                type: 'server-started',
                url: serverUrl
            });
            webviewPanel.webview.postMessage({
                type: 'output',
                text: `Preview server started. Click the URL above to open in browser.`,
                outputType: 'success'
            });
        });
        // Handle server errors
        server.on('error', (error) => {
            console.error('[ExecutionHandler] Server error:', error);
            webviewPanel.webview.postMessage({
                type: 'execution-error',
                error: `Server error: ${error.message}`
            });
        });
    }
    /**
     * Find an available port for the server
     */
    async findAvailablePort() {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.listen(0, '127.0.0.1', () => {
                const port = server.address().port;
                server.close(() => resolve(port));
            });
        });
    }
    /**
     * Create a simple HTML preview without Live Server
     */
    async createSimpleHTMLPreview(code, webviewPanel) {
        // Create a new webview panel for preview
        const previewPanel = vscode.window.createWebviewPanel('htmlPreview', 'HTML Preview', vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        // Set the HTML content directly
        previewPanel.webview.html = code;
        webviewPanel.webview.postMessage({
            type: 'output',
            text: 'HTML preview opened in new panel.',
            outputType: 'success'
        });
        webviewPanel.webview.postMessage({ type: 'execution-complete' });
    }
    /**
     * Execute JavaScript code with Node.js
     */
    async executeJavaScript(code, webviewPanel) {
        try {
            // Create temporary JS file
            const tempDir = path.join(this.context.globalStorageUri.fsPath, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempFileName = `script_${Date.now()}.js`;
            const tempFilePath = path.join(tempDir, tempFileName);
            // Write code to temp file
            fs.writeFileSync(tempFilePath, code);
            this.tempFiles.set(webviewPanel.webview.toString(), tempFilePath);
            // Execute with Node.js
            const { stdout, stderr } = await execAsync(`node "${tempFilePath}"`, {
                cwd: tempDir,
                timeout: 30000 // 30 second timeout
            });
            if (stdout !== undefined && stdout !== null) {
                const lines = stdout.split('\n');
                if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
                    webviewPanel.webview.postMessage({
                        type: 'output',
                        text: '(Program completed with no output)',
                        outputType: 'info'
                    });
                }
                else {
                    for (const line of lines) {
                        // Skip only the very last empty line if it exists
                        if (line === '' && lines.indexOf(line) === lines.length - 1) {
                            continue;
                        }
                        webviewPanel.webview.postMessage({
                            type: 'output',
                            text: line || ' ',
                            outputType: 'info'
                        });
                    }
                }
            }
            else if (!stderr) {
                // No stdout and no stderr
                webviewPanel.webview.postMessage({
                    type: 'output',
                    text: '(Program completed with no output)',
                    outputType: 'info'
                });
            }
            if (stderr) {
                webviewPanel.webview.postMessage({
                    type: 'output',
                    text: stderr,
                    outputType: 'error'
                });
            }
            webviewPanel.webview.postMessage({ type: 'execution-complete' });
            // Clean up temp file
            fs.unlinkSync(tempFilePath);
            this.tempFiles.delete(webviewPanel.webview.toString());
        }
        catch (error) {
            console.error('[ExecutionHandler] Error executing JavaScript:', error);
            webviewPanel.webview.postMessage({
                type: 'output',
                text: error.message || 'Error executing JavaScript',
                outputType: 'error'
            });
            webviewPanel.webview.postMessage({ type: 'execution-error', error: error.message });
        }
    }
    /**
     * Execute Python code with virtual environment support
     */
    async executePython(code, webviewPanel, s3FilePath, requirements) {
        try {
            let pythonCommand = 'python3';
            let venvPath = null;
            // Check if we should use a virtual environment
            if (s3FilePath && requirements && requirements.trim()) {
                // Create venv path based on S3 file location
                const s3Dir = path.dirname(s3FilePath);
                const s3FileName = path.basename(s3FilePath, '.s3').replace(/[^a-zA-Z0-9_-]/g, '_');
                venvPath = path.join(s3Dir, `.venv_${s3FileName}`);
                // Check if venv exists, create if not
                if (!fs.existsSync(venvPath)) {
                    webviewPanel.webview.postMessage({
                        type: 'output',
                        text: `Creating virtual environment at ${venvPath}...`,
                        outputType: 'info'
                    });
                    try {
                        // Create virtual environment
                        await execAsync(`python3 -m venv "${venvPath}"`, {
                            timeout: 60000 // 60 second timeout for venv creation
                        });
                        webviewPanel.webview.postMessage({
                            type: 'output',
                            text: 'Virtual environment created successfully.',
                            outputType: 'success'
                        });
                    }
                    catch (error) {
                        webviewPanel.webview.postMessage({
                            type: 'output',
                            text: `Failed to create virtual environment: ${error}`,
                            outputType: 'error'
                        });
                        // Fall back to system Python
                        venvPath = null;
                    }
                }
                // Install requirements if venv was created successfully
                if (venvPath && fs.existsSync(venvPath)) {
                    const reqFile = path.join(venvPath, 'requirements.txt');
                    fs.writeFileSync(reqFile, requirements);
                    // Determine pip path based on OS
                    const isWindows = process.platform === 'win32';
                    const pipPath = isWindows
                        ? path.join(venvPath, 'Scripts', 'pip.exe')
                        : path.join(venvPath, 'bin', 'pip');
                    webviewPanel.webview.postMessage({
                        type: 'output',
                        text: 'Installing requirements...',
                        outputType: 'info'
                    });
                    try {
                        const { stdout: pipOutput } = await execAsync(`"${pipPath}" install -r "${reqFile}"`, {
                            timeout: 120000 // 2 minute timeout for pip install
                        });
                        // Show condensed pip output
                        const lines = pipOutput.split('\n').filter(line => line.trim());
                        const successfulInstalls = lines.filter(line => line.includes('Successfully installed') ||
                            line.includes('Requirement already satisfied'));
                        if (successfulInstalls.length > 0) {
                            webviewPanel.webview.postMessage({
                                type: 'output',
                                text: 'Requirements installed successfully.',
                                outputType: 'success'
                            });
                        }
                    }
                    catch (pipError) {
                        webviewPanel.webview.postMessage({
                            type: 'output',
                            text: `Warning: Some requirements may have failed to install: ${pipError.message}`,
                            outputType: 'warning'
                        });
                    }
                    // Set Python command to venv Python
                    pythonCommand = isWindows
                        ? path.join(venvPath, 'Scripts', 'python.exe')
                        : path.join(venvPath, 'bin', 'python');
                }
            }
            else {
                // No requirements or S3 file path, use system Python
                try {
                    await execAsync('python3 --version');
                    console.log('[ExecutionHandler] Using python3');
                }
                catch (error) {
                    console.log('[ExecutionHandler] python3 not found, trying python');
                    try {
                        await execAsync('python --version');
                        pythonCommand = 'python';
                        console.log('[ExecutionHandler] Using python');
                    }
                    catch (error2) {
                        console.error('[ExecutionHandler] Neither python3 nor python found in PATH');
                        throw new Error('Python is not installed or not in PATH. Please install Python to run Python code.');
                    }
                }
            }
            // Create temporary Python file
            const tempDir = venvPath
                ? path.dirname(s3FilePath)
                : path.join(this.context.globalStorageUri.fsPath, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempFileName = `script_${Date.now()}.py`;
            const tempFilePath = path.join(tempDir, tempFileName);
            // Write code to temp file
            fs.writeFileSync(tempFilePath, code);
            this.tempFiles.set(webviewPanel.webview.toString(), tempFilePath);
            // Execute with Python (venv or system)
            const executionEnv = venvPath ? 'virtual environment' : 'system';
            console.log(`[ExecutionHandler] Executing Python with ${executionEnv}: "${pythonCommand}" "${tempFilePath}"`);
            webviewPanel.webview.postMessage({
                type: 'output',
                text: `Executing with ${executionEnv} Python...`,
                outputType: 'info'
            });
            let stdout = '';
            let stderr = '';
            try {
                const result = await execAsync(`"${pythonCommand}" "${tempFilePath}"`, {
                    cwd: tempDir,
                    timeout: 30000 // 30 second timeout
                });
                stdout = result.stdout || '';
                stderr = result.stderr || '';
                console.log(`[ExecutionHandler] Python execution completed. Stdout length: ${stdout.length}, Stderr length: ${stderr.length}`);
            }
            catch (execError) {
                console.error('[ExecutionHandler] Python execution error:', execError);
                if (execError.stdout)
                    stdout = execError.stdout;
                if (execError.stderr)
                    stderr = execError.stderr;
                if (!stdout && !stderr) {
                    stderr = execError.message || 'Unknown execution error';
                }
            }
            // Handle stdout - don't filter empty lines, but show them
            if (stdout) {
                const lines = stdout.split('\n');
                if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
                    // No output produced
                    webviewPanel.webview.postMessage({
                        type: 'output',
                        text: '(Program completed with no output)',
                        outputType: 'info'
                    });
                }
                else {
                    // Show all lines, including empty ones
                    for (const line of lines) {
                        // Skip only the very last empty line if it exists
                        if (line === '' && lines.indexOf(line) === lines.length - 1) {
                            continue;
                        }
                        webviewPanel.webview.postMessage({
                            type: 'output',
                            text: line || ' ', // Show empty lines as a space
                            outputType: 'info'
                        });
                    }
                }
            }
            else if (!stderr) {
                // No stdout and no stderr
                webviewPanel.webview.postMessage({
                    type: 'output',
                    text: '(Program completed with no output)',
                    outputType: 'info'
                });
            }
            if (stderr) {
                webviewPanel.webview.postMessage({
                    type: 'output',
                    text: stderr,
                    outputType: 'error'
                });
            }
            webviewPanel.webview.postMessage({ type: 'execution-complete' });
            // Clean up temp file
            fs.unlinkSync(tempFilePath);
            this.tempFiles.delete(webviewPanel.webview.toString());
        }
        catch (error) {
            console.error('[ExecutionHandler] Error executing Python:', error);
            webviewPanel.webview.postMessage({
                type: 'output',
                text: error.message || 'Error executing Python. Make sure Python is installed.',
                outputType: 'error'
            });
            webviewPanel.webview.postMessage({ type: 'execution-error', error: error.message });
        }
    }
    /**
     * Execute TypeScript code
     */
    async executeTypeScript(code, webviewPanel) {
        try {
            // Create temporary TS file
            const tempDir = path.join(this.context.globalStorageUri.fsPath, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempFileName = `script_${Date.now()}.ts`;
            const tempFilePath = path.join(tempDir, tempFileName);
            // Write code to temp file
            fs.writeFileSync(tempFilePath, code);
            this.tempFiles.set(webviewPanel.webview.toString(), tempFilePath);
            // Check if ts-node is available
            try {
                await execAsync('npx ts-node --version');
                // Execute with ts-node
                const { stdout, stderr } = await execAsync(`npx ts-node "${tempFilePath}"`, {
                    cwd: tempDir,
                    timeout: 30000
                });
                if (stdout) {
                    const lines = stdout.split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        webviewPanel.webview.postMessage({
                            type: 'output',
                            text: line,
                            outputType: 'info'
                        });
                    }
                }
                if (stderr && !stderr.includes('ts-node')) {
                    webviewPanel.webview.postMessage({
                        type: 'output',
                        text: stderr,
                        outputType: 'error'
                    });
                }
            }
            catch {
                // Fallback: Transpile to JS and run
                webviewPanel.webview.postMessage({
                    type: 'output',
                    text: 'ts-node not found. Transpiling TypeScript to JavaScript...',
                    outputType: 'info'
                });
                const jsFileName = tempFileName.replace('.ts', '.js');
                const jsFilePath = path.join(tempDir, jsFileName);
                // Simple transpilation (remove type annotations)
                const jsCode = this.simpleTranspileTS(code);
                fs.writeFileSync(jsFilePath, jsCode);
                const { stdout, stderr } = await execAsync(`node "${jsFilePath}"`, {
                    cwd: tempDir,
                    timeout: 30000
                });
                if (stdout) {
                    const lines = stdout.split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        webviewPanel.webview.postMessage({
                            type: 'output',
                            text: line,
                            outputType: 'info'
                        });
                    }
                }
                if (stderr) {
                    webviewPanel.webview.postMessage({
                        type: 'output',
                        text: stderr,
                        outputType: 'error'
                    });
                }
                fs.unlinkSync(jsFilePath);
            }
            webviewPanel.webview.postMessage({ type: 'execution-complete' });
            // Clean up temp file
            fs.unlinkSync(tempFilePath);
            this.tempFiles.delete(webviewPanel.webview.toString());
        }
        catch (error) {
            console.error('[ExecutionHandler] Error executing TypeScript:', error);
            webviewPanel.webview.postMessage({
                type: 'output',
                text: error.message || 'Error executing TypeScript',
                outputType: 'error'
            });
            webviewPanel.webview.postMessage({ type: 'execution-error', error: error.message });
        }
    }
    /**
     * Simple TypeScript to JavaScript transpilation (removes type annotations)
     */
    simpleTranspileTS(code) {
        // Remove type annotations (very basic, not comprehensive)
        return code
            .replace(/:\s*\w+(\[\])?/g, '') // Remove type annotations
            .replace(/as\s+\w+/g, '') // Remove type assertions
            .replace(/interface\s+\w+\s*{[^}]*}/g, '') // Remove interfaces
            .replace(/type\s+\w+\s*=\s*[^;]+;/g, ''); // Remove type aliases
    }
    /**
     * Execute CSS code (show preview with sample HTML)
     */
    async executeCSS(code, webviewPanel) {
        // Create a sample HTML with the CSS
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CSS Preview</title>
    <style>
        ${code}
    </style>
</head>
<body>
    <h1>CSS Preview</h1>
    <p>This is a paragraph to test your CSS styles.</p>
    <div class="container">
        <div class="box">Box 1</div>
        <div class="box">Box 2</div>
        <div class="box">Box 3</div>
    </div>
    <button>Sample Button</button>
    <input type="text" placeholder="Sample Input">
    <ul>
        <li>List Item 1</li>
        <li>List Item 2</li>
        <li>List Item 3</li>
    </ul>
</body>
</html>`;
        await this.executeHTML(html, webviewPanel);
    }
    /**
     * Stop execution
     */
    async stopExecution(webviewId) {
        // Stop custom HTTP server if it's running for this webview
        const server = this.runningServers.get(webviewId);
        if (server) {
            server.close(() => {
                console.log('[ExecutionHandler] Custom HTTP server stopped');
            });
            this.runningServers.delete(webviewId);
        }
        // Clean up temp files
        const tempFile = this.tempFiles.get(webviewId);
        if (tempFile && fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
            this.tempFiles.delete(webviewId);
        }
        // Kill any running processes
        const process = this.runningProcesses.get(webviewId);
        if (process) {
            process.kill();
            this.runningProcesses.delete(webviewId);
        }
    }
    /**
     * Clean up old preview files
     */
    cleanupOldPreviews(tempDir) {
        try {
            if (!fs.existsSync(tempDir)) {
                return;
            }
            const files = fs.readdirSync(tempDir)
                .filter(file => file.startsWith('preview_') && file.endsWith('.html'))
                .map(file => ({
                name: file,
                path: path.join(tempDir, file),
                time: fs.statSync(path.join(tempDir, file)).mtime.getTime()
            }))
                .sort((a, b) => b.time - a.time);
            // Keep only the 5 most recent files
            if (files.length > 5) {
                for (let i = 5; i < files.length; i++) {
                    try {
                        fs.unlinkSync(files[i].path);
                        console.log(`[ExecutionHandler] Cleaned up old preview: ${files[i].name}`);
                    }
                    catch (error) {
                        console.error(`[ExecutionHandler] Failed to delete ${files[i].name}:`, error);
                    }
                }
            }
        }
        catch (error) {
            console.error('[ExecutionHandler] Error cleaning up old previews:', error);
        }
    }
    /**
     * Clean up all resources
     */
    dispose() {
        // Stop all executions
        for (const [webviewId] of this.tempFiles) {
            this.stopExecution(webviewId);
        }
    }
}
exports.ExecutionHandler = ExecutionHandler;
//# sourceMappingURL=executionHandler.js.map