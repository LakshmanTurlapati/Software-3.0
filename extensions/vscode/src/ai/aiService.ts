import * as vscode from 'vscode';
import { isRunningInVoid } from './voidDetection';

// System instruction content
const SYSTEM_INSTRUCTION = `# AI Agent Instructions for Software3 (.s3) Code Generation

## Core Principles
### 1. **NEVER Modify Instructions**
- The instructions field is sacred and must NEVER be altered
- Only generate or update the code, language, and requirements fields

### 2. **Supported Languages & Scope**
- **Python**: Complete scripts with requirements.txt generation
- **HTML**: Web applications with inline CSS only
- **No other languages** are currently supported

### 3. **Quality Standards**
- Generate **production-ready**, functional code
- Include proper error handling and validation
- Add comprehensive comments and documentation
- Follow language-specific best practices

## Language Detection
Analyze the instructions field to determine:
1. **Web Application Intent**: Keywords like "website", "web app", "HTML", "CSS", "frontend", "UI", "interface", "dashboard", "form", "landing page" → Generate HTML with inline CSS
2. **Python Script Intent**: Data processing, analysis, automation, mathematical calculations, algorithms, file operations, system tasks, API interactions, web scraping, machine learning, data science → Generate Python with requirements.txt

## Python Code Generation Rules
Always include:
- #!/usr/bin/env python3 shebang
- Comprehensive docstrings
- Type hints when beneficial
- Main() function with if __name__ == "__main__" guard
- Error handling with try-catch blocks
- Clear progress feedback with print statements
- Generate requirements field with specific versions

## HTML Web Application Generation Rules
Must include:
- All CSS inline (no external stylesheets)
- All JavaScript inline (no external scripts)
- Responsive design with media queries
- Modern HTML5 semantic structure
- ES6+ JavaScript features
- Accessible and user-friendly interface

## Output Format
Return JSON with:
{
  "instructions": "[PRESERVED EXACTLY AS PROVIDED]",
  "code": "[Generated implementation]",
  "language": "python|html",
  "requirements": "[For Python only: package==version format]"
}`;

export interface AIGenerationResult {
    code: string;
    language: string;
    requirements?: string;
    error?: string;
}

export class AIService {
    private static instance: AIService;
    private abortController: AbortController | null = null;
    private apiKey: string | undefined;
    private outputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Software3 AI');
    }

    public static getInstance(): AIService {
        if (!AIService.instance) {
            AIService.instance = new AIService();
        }
        return AIService.instance;
    }

    /**
     * Initialize the AI service with API key
     */
    public async initialize(context: vscode.ExtensionContext): Promise<boolean> {
        // AI features now available in all environments
        // No longer checking for Void-specific environment
        
        // Try to get API key from secret storage
        this.apiKey = await context.secrets.get('software3.xaiApiKey');
        
        if (!this.apiKey) {
            // Prompt user for API key
            const apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your xAI API key for grok-code-fast-1',
                password: true,
                placeHolder: 'xai-...',
                ignoreFocusOut: true
            });

            if (apiKey) {
                await context.secrets.store('software3.xaiApiKey', apiKey);
                this.apiKey = apiKey;
                this.outputChannel.appendLine('API key stored successfully');
                return true;
            } else {
                this.outputChannel.appendLine('No API key provided - AI features disabled');
                return false;
            }
        }

        this.outputChannel.appendLine('AI service initialized successfully');
        return true;
    }

    /**
     * Generate code based on instructions
     */
    public async generateCode(
        instructions: string,
        onProgress?: (message: string) => void
    ): Promise<AIGenerationResult> {
        if (!this.apiKey) {
            return { 
                code: '', 
                language: 'python',
                error: 'AI service not initialized. Please provide an API key.' 
            };
        }

        // Cancel any existing generation
        if (this.abortController) {
            this.abortController.abort();
        }

        this.abortController = new AbortController();

        try {
            onProgress?.('Analyzing instructions...');
            this.outputChannel.appendLine(`Generating code for: ${instructions.substring(0, 100)}...`);

            const response = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'grok-code-fast-1',
                    messages: [
                        {
                            role: 'system',
                            content: SYSTEM_INSTRUCTION
                        },
                        {
                            role: 'user',
                            content: `Generate code for the following instructions. Return ONLY valid JSON with no additional text or markdown formatting:\n\n${instructions}`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 8192,
                    stream: true
                }),
                signal: this.abortController.signal
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`API error: ${response.status} - ${error}`);
            }

            onProgress?.('Generating code...');

            // Process streaming response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices?.[0]?.delta?.content;
                                if (content) {
                                    fullResponse += content;
                                }
                            } catch (e) {
                                // Skip invalid JSON chunks
                            }
                        }
                    }
                }
            }

            onProgress?.('Parsing response...');

            // Extract JSON from response
            const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in response');
            }

            const result = JSON.parse(jsonMatch[0]);
            
            this.outputChannel.appendLine('Code generation completed successfully');
            
            return {
                code: result.code || '',
                language: result.language || 'python',
                requirements: result.requirements
            };

        } catch (error: any) {
            if (error.name === 'AbortError') {
                this.outputChannel.appendLine('Code generation cancelled');
                return { 
                    code: '', 
                    language: 'python',
                    error: 'Generation cancelled' 
                };
            }

            this.outputChannel.appendLine(`Error generating code: ${error.message}`);
            return { 
                code: '', 
                language: 'python',
                error: `Failed to generate code: ${error.message}` 
            };
        } finally {
            this.abortController = null;
        }
    }

    /**
     * Cancel ongoing generation
     */
    public cancelGeneration(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
            this.outputChannel.appendLine('Generation cancelled by user');
        }
    }

    /**
     * Check if AI service is available
     */
    public isAvailable(): boolean {
        // AI is now available in all environments if API key is present
        return !!this.apiKey;
    }

    /**
     * Clear API key
     */
    public async clearApiKey(context: vscode.ExtensionContext): Promise<void> {
        await context.secrets.delete('software3.xaiApiKey');
        this.apiKey = undefined;
        this.outputChannel.appendLine('API key cleared');
    }
}