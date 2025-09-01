# Release Notes - Software 3.0 Extension v1.4.0

## 🚀 Version 1.4.0 - Live Server Integration & Code Execution

**Release Date**: August 29, 2024

### ✨ New Features

#### 1. **Live Server Integration for HTML**
- Automatic Live Server launch when executing HTML code
- Temporary file creation and management
- Server URL display in output panel
- One-click browser opening from output panel
- Fallback to simple preview if Live Server not installed

#### 2. **Multi-Language Code Execution**
- **JavaScript**: Execute with Node.js runtime
- **Python**: Execute with Python 3.x interpreter
- **TypeScript**: Execute with ts-node or transpilation fallback
- **CSS**: Preview with sample HTML template
- **HTML**: Live preview with hot reload capability

#### 3. **Interactive Output Panel**
- New collapsible output panel below code editor
- Real-time streaming of execution output
- Color-coded message types:
  - 🔵 Info messages (blue)
  - 🟢 Success messages (green)
  - 🔴 Error messages (red)
  - 🔗 Clickable URLs (blue, underlined)
- Clear output button
- Auto-expand on execution
- Auto-scroll to latest messages

#### 4. **Enhanced Play Button**
- Dynamic state changes (Play ▶️ / Stop ⏹️)
- Loading indicator during execution
- Language-aware execution
- Automatic language detection
- Visual feedback for running state

### 🔧 Technical Improvements

#### Architecture
- New `ExecutionHandler` module for code execution
- Improved message passing between webview and extension
- Resource cleanup and temp file management
- Error handling with user-friendly messages

#### Files Added
- `src/executionHandler.ts` - Core execution logic
- `LIVE_SERVER_INTEGRATION.md` - Feature documentation
- `IMPLEMENTATION_DOCUMENTATION.md` - Technical documentation with Mermaid diagrams
- Test examples for HTML, JavaScript, and Python

#### Files Modified
- `src/editor.ts` - Integrated execution handling
- `src/editor-simple-editable.ts` - Added output panel UI
- `media/webview.js` - Enhanced interactivity

### 📋 Requirements

#### Required
- VS Code 1.74.0 or higher
- Node.js (for JavaScript execution)

#### Recommended
- Live Server extension (`ritwickdey.liveserver`)
- Python 3.x (for Python execution)
- ts-node (for TypeScript execution)

### 🐛 Bug Fixes
- Improved error handling for missing dependencies
- Better cleanup of temporary files
- Fixed message passing reliability

### 📦 Installation

Install the extension by:
1. Opening VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Click "Install from VSIX..."
4. Select `software3-1.4.0.vsix`

Or via command line:
```bash
code --install-extension software3-1.4.0.vsix
```

### 🎯 Usage

1. Open any `.s3` file
2. Write your code in the code section
3. Click the **Play button** (▶️) in the top-right corner
4. View output in the panel below
5. For HTML: Click the server URL to open in browser

### 📝 Notes

- Execution timeout: 30 seconds (prevents infinite loops)
- Temporary files are automatically cleaned up
- Live Server starts on port 5500 by default
- Output panel is collapsible to save screen space

### 🔮 Coming Next
- Support for more languages (Go, Rust, Java)
- Interactive input support
- Debugging capabilities
- Custom run configurations

### 🙏 Acknowledgments
Thanks to the Live Server extension by Ritwick Dey for enabling HTML preview functionality.

---

**Full Changelog**: v1.3.0...v1.4.0  
**Download**: [software3-1.4.0.vsix](software3-1.4.0.vsix)