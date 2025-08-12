# Software 3 (.s3) File Format Specification

**Version:** 1.0  
**Date:** January 26, 2025  
**Status:** Draft

## Abstract

The Software 3 (.s3) file format is a JSON-based specification designed to revolutionize technical documentation by providing dual-view blocks that seamlessly combine human-readable Markdown text with executable code snippets. This format enables users to toggle between documentation and code views within the same container, bridging the gap between explanation and implementation.

## 1. Introduction

### 1.1 Purpose

Traditional documentation formats force a choice between readability and executable code. Jupyter notebooks excel at code execution but struggle with rich documentation, while Markdown files provide excellent documentation but lack interactive code capabilities. The .s3 format solves this by providing:

- **Dual-view blocks** with switchable text/code content
- **Language-agnostic** support for any programming language
- **JSON-based structure** for easy parsing and tool integration
- **Rich metadata** for enhanced organization and filtering

### 1.2 Design Principles

1. **Simplicity**: Easy to read, write, and parse
2. **Extensibility**: Forward-compatible with future enhancements
3. **Language Agnostic**: Support for any programming language
4. **Tool Friendly**: JSON structure for easy integration
5. **Human Readable**: Meaningful even without specialized tools

## 2. File Format Structure

### 2.1 Basic Structure

A .s3 file is a valid JSON document with the following top-level structure:

```json
{
  "version": "1.0",
  "title": "Document Title",
  "metadata": { /* Document metadata */ },
  "blocks": [ /* Array of content blocks */ ]
}
```

### 2.2 Document Root Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | ✅ | Format version (currently "1.0") |
| `title` | string | ✅ | Document title |
| `metadata` | object | ❌ | Document-level metadata |
| `blocks` | array | ✅ | Array of content blocks |

### 2.3 Metadata Object

The metadata object provides document-level information:

```json
{
  "metadata": {
    "author": "Developer Name",
    "created": "2025-01-26",
    "modified": "2025-01-26",
    "description": "Brief document description",
    "tags": ["tutorial", "javascript", "authentication"],
    "version": "1.2.0",
    "license": "MIT",
    "language": "en",
    "category": "tutorial"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `author` | string | Document author |
| `created` | string | Creation date (ISO 8601) |
| `modified` | string | Last modification date (ISO 8601) |
| `description` | string | Brief document description |
| `tags` | array[string] | Document tags for categorization |
| `version` | string | Document version (semantic versioning) |
| `license` | string | License identifier |
| `language` | string | Primary language (ISO 639-1) |
| `category` | string | Document category |

## 3. Block Structure

### 3.1 Block Object

Each block represents a dual-view container with both text and code content:

```json
{
  "id": "block-1",
  "text": "# Authentication Setup\nThis code demonstrates JWT authentication implementation.",
  "code": "const jwt = require('jsonwebtoken');\n\nfunction generateToken(user) {\n  return jwt.sign({ id: user.id }, process.env.SECRET);\n}",
  "language": "javascript",
  "metadata": {
    "tags": ["auth", "jwt", "security"],
    "complexity": "intermediate",
    "executionTime": "< 1ms",
    "dependencies": ["jsonwebtoken"]
  }
}
```

### 3.2 Block Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique block identifier |
| `text` | string | ✅ | Markdown-formatted text content |
| `code` | string | ✅ | Source code content |
| `language` | string | ✅ | Programming language identifier |
| `metadata` | object | ❌ | Block-level metadata |

### 3.3 Block Metadata

Block metadata provides additional context and organization:

| Field | Type | Description |
|-------|------|-------------|
| `tags` | array[string] | Block tags for filtering |
| `complexity` | string | Complexity level (beginner, intermediate, advanced) |
| `executionTime` | string | Expected execution time |
| `dependencies` | array[string] | Required dependencies |
| `outputs` | array[object] | Expected outputs (for validation) |
| `hidden` | boolean | Whether block is hidden by default |
| `readonly` | boolean | Whether code is read-only |

### 3.4 Language Identifiers

Use standard language identifiers for syntax highlighting:

- `javascript`, `typescript`, `python`, `java`, `csharp`, `cpp`, `c`
- `go`, `rust`, `php`, `ruby`, `swift`, `kotlin`, `scala`
- `html`, `css`, `sql`, `bash`, `powershell`, `yaml`, `json`
- `dockerfile`, `terraform`, `nginx`, `apache`

## 4. Advanced Features

### 4.1 Multi-language Blocks

Blocks can contain code in multiple languages:

```json
{
  "id": "multi-lang-block",
  "text": "# Database Connection\nHere's how to connect to a database in different languages:",
  "code": {
    "javascript": "const mysql = require('mysql2');\nconst connection = mysql.createConnection(config);",
    "python": "import mysql.connector\nconnection = mysql.connector.connect(**config)",
    "java": "Connection conn = DriverManager.getConnection(url, user, password);"
  },
  "language": "multi",
  "metadata": {
    "defaultLanguage": "javascript"
  }
}
```

### 4.2 Executable Blocks

Blocks can include execution metadata:

```json
{
  "id": "executable-block",
  "text": "# API Test\nThis code tests our authentication endpoint:",
  "code": "curl -X POST http://localhost:3000/auth \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"username\":\"demo\",\"password\":\"test\"}'",
  "language": "bash",
  "metadata": {
    "executable": true,
    "environment": "nodejs",
    "expectedOutput": {
      "type": "json",
      "schema": {
        "token": "string",
        "expires": "number"
      }
    }
  }
}
```

### 4.3 Import/Export Support

Blocks can reference external files:

```json
{
  "id": "import-block",
  "text": "# Configuration\nLoad configuration from external file:",
  "code": "@import:./config/database.js",
  "language": "javascript",
  "metadata": {
    "importType": "file",
    "importPath": "./config/database.js"
  }
}
```

## 5. Validation and Schema

### 5.1 JSON Schema

The format includes a JSON Schema for validation (see `schema.json`).

### 5.2 Validation Rules

1. **Document Level**:
   - Must be valid JSON
   - Must conform to JSON Schema
   - Version must be supported
   - Blocks array cannot be empty

2. **Block Level**:
   - IDs must be unique within document
   - Text content must be valid Markdown
   - Language must be recognized identifier
   - Code content must be non-empty string

3. **Metadata Level**:
   - Dates must be valid ISO 8601
   - Tags must be non-empty strings
   - Complexity must be valid level

## 6. File Conventions

### 6.1 File Extension

- Primary: `.s3`
- Alternative: `.software3`

### 6.2 MIME Type

- Proposed: `application/vnd.software3+json`
- Alternative: `application/s3+json`

### 6.3 Encoding

- UTF-8 encoding required
- Line endings: LF (Unix-style) preferred
- Indentation: 2 spaces for JSON formatting

## 7. Migration and Compatibility

### 7.1 Version Management

- Major version changes for breaking changes
- Minor version for new features
- Patch version for bug fixes

### 7.2 Forward Compatibility

- Unknown fields ignored by parsers
- New metadata fields safely added
- Block structure extensible

### 7.3 Backward Compatibility

- Version 1.x parsers must handle all 1.x documents
- Graceful degradation for unknown features

## 8. Security Considerations

### 8.1 Code Execution

- Code blocks are display-only by default
- Execution requires explicit user consent
- Sandboxing recommended for execution environments

### 8.2 Content Validation

- Markdown content should be sanitized
- Code injection prevention in parsers
- File path validation for imports

## 9. Implementation Guidelines

### 9.1 Parser Requirements

1. **JSON Validation**: Strict JSON parsing
2. **Schema Validation**: JSON Schema compliance
3. **Markdown Rendering**: CommonMark compatibility
4. **Syntax Highlighting**: Language-specific highlighting
5. **Error Handling**: Graceful degradation

### 9.2 Editor Requirements

1. **Syntax Highlighting**: JSON with S3 extensions
2. **Live Preview**: Real-time dual-view rendering
3. **Block Navigation**: Jump between blocks
4. **Validation**: Real-time error checking

### 9.3 Viewer Requirements

1. **Toggle Interface**: Smooth text/code switching
2. **Responsive Design**: Mobile-friendly layout
3. **Syntax Highlighting**: Prism.js or similar
4. **Export Options**: HTML, PDF, Markdown

## 10. Examples

See the `examples/` directory for comprehensive examples including:

- `basic-tutorial.s3` - Simple tutorial format
- `api-documentation.s3` - API guide with examples
- `multi-language.s3` - Multi-language code blocks
- `advanced-features.s3` - All advanced features demo

## 11. References

- [CommonMark Specification](https://commonmark.org/)
- [JSON Schema](https://json-schema.org/)
- [ISO 8601 Date Format](https://en.wikipedia.org/wiki/ISO_8601)
- [Semantic Versioning](https://semver.org/)

---

*This specification is open source and released under the MIT License.* 