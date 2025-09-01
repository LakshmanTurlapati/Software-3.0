# Live Server Integration & Code Execution

## Overview
The Software 3.0 VS Code extension now includes integrated code execution with Live Server support for HTML files and direct execution for other languages.

## Features

### 1. Play Button Execution
- Click the **Play** button (▶️) in the top-right corner to execute the current code
- The button changes to a **Stop** button (⏹️) while code is running
- Supports multiple programming languages

### 2. Output Panel
- Automatically appears below the code editor when execution starts
- Shows execution results, errors, and server URLs
- Features:
  - **Collapsible**: Click the header or chevron to expand/collapse
  - **Clear button**: Remove all output messages
  - **Auto-scroll**: Automatically scrolls to show new messages
  - **Clickable URLs**: Click on server URLs to open in browser

### 3. Language Support

#### HTML
- **With Live Server Extension**: 
  - Creates a temporary HTML file
  - Launches Live Server automatically
  - Displays the server URL in the output panel
  - Click the URL to open in your default browser
- **Without Live Server**: 
  - Opens a simple preview in a new VS Code panel
  - Note: Install the Live Server extension for better experience

#### JavaScript
- Executes code using Node.js
- Shows console output in the output panel
- Supports all Node.js features

#### Python
- Executes code using Python interpreter
- Automatically detects `python3` or `python` command
- Shows print statements and errors in output panel

#### TypeScript
- Attempts to use `ts-node` if available
- Falls back to simple transpilation if `ts-node` is not installed
- Shows execution results in output panel

#### CSS
- Creates a sample HTML preview with your CSS styles
- Useful for testing CSS snippets quickly

### 4. Output Types
- **Info** (blue): General information and stdout
- **Success** (green): Successful completion messages
- **Error** (red): Error messages and stderr
- **URL** (blue, underlined): Clickable links to open in browser

## Installation Requirements

### Required
- VS Code 1.74.0 or higher
- Node.js (for JavaScript execution)

### Recommended
- **Live Server extension** (`ritwickdey.liveserver`) for HTML preview
- Python 3.x for Python code execution
- ts-node for TypeScript execution (`npm install -g ts-node`)

## Usage

1. **Open an S3 file** with HTML, JavaScript, Python, or other supported code
2. **Click the Play button** to execute the code
3. **View the output** in the panel that appears below
4. **For HTML**: Click the server URL to open in browser
5. **Click Stop** or wait for execution to complete

## Configuration

### Live Server Settings
Configure Live Server through VS Code settings:
- `liveServer.settings.port`: Default port (default: 5500)
- `liveServer.settings.host`: Server host (default: 127.0.0.1)

## Troubleshooting

### HTML not opening with Live Server
- Ensure Live Server extension is installed
- Check that no other process is using port 5500
- Try changing the port in Live Server settings

### JavaScript errors
- Ensure Node.js is installed and in PATH
- Check for syntax errors in your code

### Python not executing
- Ensure Python is installed and in PATH
- Try both `python` and `python3` commands in terminal

### TypeScript issues
- Install ts-node globally: `npm install -g ts-node`
- Or the extension will use basic transpilation

## Technical Details

### Temporary Files
- Temporary files are created in the extension's global storage
- Files are automatically cleaned up after execution
- Location: `~/.vscode/extensions/[extension-id]/temp/`

### Security
- Code executes in isolated temporary files
- No permanent changes to your file system
- Execution timeout: 30 seconds (prevents infinite loops)

## Future Enhancements
- Support for more languages (Go, Rust, Java, etc.)
- Interactive input support
- Debugging capabilities
- Custom run configurations
- Terminal integration