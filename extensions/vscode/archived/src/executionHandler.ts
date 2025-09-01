import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ExecutionHandler {
    private runningProcesses: Map<string, any> = new Map();
    private tempFiles: Map<string, string> = new Map();
    private runningServers: Map<string, http.Server> = new Map();

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Execute code based on language type
     */
    async execute(code: string, language: string, webviewPanel: vscode.WebviewPanel): Promise<void> {
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
                    await this.executePython(code, webviewPanel);
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
        } catch (error: any) {
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
    private async executeHTML(code: string, webviewPanel: vscode.WebviewPanel): Promise<void> {
        try {
            // Get workspace folder or use temp directory
            let tempDir: string;
            
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                // Use workspace root for temp files
                const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                tempDir = path.join(workspaceRoot, '.s3-preview');
            } else {
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
            
        } catch (error: any) {
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
    private async startHTMLServer(filePath: string, webviewPanel: vscode.WebviewPanel): Promise<void> {
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
                        res.writeHead(404, {'Content-Type': 'text/plain'});
                        res.end('File not found');
                    } else {
                        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                        res.end(data);
                    }
                });
            } else {
                // For other resources, try to serve from the same directory
                const resourcePath = path.join(path.dirname(filePath), req.url || '');
                fs.readFile(resourcePath, (err, data) => {
                    if (err) {
                        res.writeHead(404, {'Content-Type': 'text/plain'});
                        res.end('Resource not found');
                    } else {
                        // Determine content type based on extension
                        const ext = path.extname(resourcePath).toLowerCase();
                        let contentType = 'text/plain';
                        if (ext === '.css') contentType = 'text/css';
                        else if (ext === '.js') contentType = 'application/javascript';
                        else if (ext === '.json') contentType = 'application/json';
                        else if (ext === '.png') contentType = 'image/png';
                        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
                        else if (ext === '.gif') contentType = 'image/gif';
                        else if (ext === '.svg') contentType = 'image/svg+xml';
                        
                        res.writeHead(200, {'Content-Type': contentType});
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
        server.on('error', (error: any) => {
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
    private async findAvailablePort(): Promise<number> {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.listen(0, '127.0.0.1', () => {
                const port = (server.address() as net.AddressInfo).port;
                server.close(() => resolve(port));
            });
        });
    }

    /**
     * Create a simple HTML preview without Live Server
     */
    private async createSimpleHTMLPreview(code: string, webviewPanel: vscode.WebviewPanel): Promise<void> {
        // Create a new webview panel for preview
        const previewPanel = vscode.window.createWebviewPanel(
            'htmlPreview',
            'HTML Preview',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

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
    private async executeJavaScript(code: string, webviewPanel: vscode.WebviewPanel): Promise<void> {
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

            webviewPanel.webview.postMessage({ type: 'execution-complete' });

            // Clean up temp file
            fs.unlinkSync(tempFilePath);
            this.tempFiles.delete(webviewPanel.webview.toString());

        } catch (error: any) {
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
     * Execute Python code
     */
    private async executePython(code: string, webviewPanel: vscode.WebviewPanel): Promise<void> {
        try {
            // Create temporary Python file
            const tempDir = path.join(this.context.globalStorageUri.fsPath, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempFileName = `script_${Date.now()}.py`;
            const tempFilePath = path.join(tempDir, tempFileName);
            
            // Write code to temp file
            fs.writeFileSync(tempFilePath, code);
            this.tempFiles.set(webviewPanel.webview.toString(), tempFilePath);

            // Try python3 first, then python
            let pythonCommand = 'python3';
            try {
                await execAsync('python3 --version');
            } catch {
                pythonCommand = 'python';
            }

            // Execute with Python
            const { stdout, stderr } = await execAsync(`${pythonCommand} "${tempFilePath}"`, {
                cwd: tempDir,
                timeout: 30000 // 30 second timeout
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

            webviewPanel.webview.postMessage({ type: 'execution-complete' });

            // Clean up temp file
            fs.unlinkSync(tempFilePath);
            this.tempFiles.delete(webviewPanel.webview.toString());

        } catch (error: any) {
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
    private async executeTypeScript(code: string, webviewPanel: vscode.WebviewPanel): Promise<void> {
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
            } catch {
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

        } catch (error: any) {
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
    private simpleTranspileTS(code: string): string {
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
    private async executeCSS(code: string, webviewPanel: vscode.WebviewPanel): Promise<void> {
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
    async stopExecution(webviewId: string): Promise<void> {
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
    private cleanupOldPreviews(tempDir: string): void {
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
                    } catch (error) {
                        console.error(`[ExecutionHandler] Failed to delete ${files[i].name}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error('[ExecutionHandler] Error cleaning up old previews:', error);
        }
    }

    /**
     * Clean up all resources
     */
    dispose(): void {
        // Stop all executions
        for (const [webviewId] of this.tempFiles) {
            this.stopExecution(webviewId);
        }
    }
}