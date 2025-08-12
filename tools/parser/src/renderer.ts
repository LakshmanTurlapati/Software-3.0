// Note: In a real implementation, these would be imported from npm packages
// import { marked } from 'marked';
// import { JSDOM } from 'jsdom';
// import createDOMPurify from 'dompurify';
// import Prism from 'prismjs';

import {
  S3Document,
  Block,
  HtmlRenderOptions,
  MarkdownExportOptions,
  RenderOptions,
  MultiLanguageCode
} from './types';

/**
 * Simplified renderer class for Software 3 (.s3) documents
 * Note: In production, this would use external libraries for rendering
 */
export class S3Renderer {
  constructor() {
    // Note: In production, this would initialize DOMPurify and other libraries
  }

  /**
   * Render document to HTML (simplified version)
   */
  renderToHtml(document: S3Document, options: HtmlRenderOptions = {}): string {
    const defaultOptions: Required<HtmlRenderOptions> = {
      theme: 'light',
      syntaxHighlighting: true,
      showLineNumbers: false,
      enableToggle: true,
      defaultView: 'text',
      sanitizeMarkdown: true,
      baseUrl: '',
      customCss: '',
      includeBootstrap: true,
      includePrism: true,
      embedAssets: false,
      wrapInDocument: true,
      title: document.title,
      ...options
    };

    const blocksHtml = document.blocks.map(block => 
      this.renderBlockToHtml(block, defaultOptions)
    ).join('\n');

    const metadataHtml = this.renderMetadataToHtml(document, defaultOptions);

    if (defaultOptions.wrapInDocument) {
      return this.wrapInHtmlDocument(
        metadataHtml + blocksHtml,
        defaultOptions
      );
    }

    return metadataHtml + blocksHtml;
  }

  /**
   * Render a single block to HTML (simplified version)
   */
  renderBlockToHtml(block: Block, options: RenderOptions = {}): string {
    const defaultOptions: Required<RenderOptions> = {
      theme: 'light',
      syntaxHighlighting: true,
      showLineNumbers: false,
      enableToggle: true,
      defaultView: 'text',
      sanitizeMarkdown: true,
      baseUrl: '',
      customCss: '',
      ...options
    };

    // Simple text rendering (in production, would use marked.js)
    const textHtml = this.simpleMarkdownToHtml(block.text);
    const codeHtml = this.renderCodeToHtml(block, defaultOptions);

    if (!defaultOptions.enableToggle) {
      return `
        <div class="s3-block" data-block-id="${block.id}">
          <div class="s3-content">
            <div class="s3-text">${textHtml}</div>
            <div class="s3-code">${codeHtml}</div>
          </div>
        </div>
      `;
    }

    const defaultView = defaultOptions.defaultView;
    const textActive = defaultView === 'text' ? 'active' : '';
    const codeActive = defaultView === 'code' ? 'active' : '';

    return `
      <div class="s3-block" data-block-id="${block.id}">
        <div class="s3-toggle-container">
          <div class="s3-toggle-buttons">
            <button class="s3-toggle-btn ${textActive}" data-view="text">
              📄 Documentation
            </button>
            <button class="s3-toggle-btn ${codeActive}" data-view="code">
              💻 Code
            </button>
          </div>
        </div>
        <div class="s3-content">
          <div class="s3-view s3-text-view ${textActive}" data-view="text">
            ${textHtml}
          </div>
          <div class="s3-view s3-code-view ${codeActive}" data-view="code">
            ${codeHtml}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Export document to Markdown (simplified version)
   */
  exportToMarkdown(document: S3Document, options: MarkdownExportOptions = {}): string {
    const defaultOptions: Required<MarkdownExportOptions> = {
      includeCodeBlocks: true,
      codeBlockStyle: 'fenced',
      includeMetadata: true,
      frontMatter: true,
      preserveIds: false,
      ...options
    };

    let markdown = '';

    // Add front matter metadata
    if (defaultOptions.includeMetadata && defaultOptions.frontMatter && document.metadata) {
      markdown += '---\n';
      markdown += `title: "${document.title}"\n`;
      if (document.metadata.author) markdown += `author: "${document.metadata.author}"\n`;
      if (document.metadata.created) markdown += `date: ${document.metadata.created}\n`;
      if (document.metadata.description) markdown += `description: "${document.metadata.description}"\n`;
      if (document.metadata.tags) markdown += `tags: [${document.metadata.tags.map(t => `"${t}"`).join(', ')}]\n`;
      markdown += '---\n\n';
    }

    // Add title
    markdown += `# ${document.title}\n\n`;

    // Add metadata as regular content
    if (defaultOptions.includeMetadata && !defaultOptions.frontMatter && document.metadata) {
      if (document.metadata.description) {
        markdown += `${document.metadata.description}\n\n`;
      }
      if (document.metadata.author) {
        markdown += `**Author:** ${document.metadata.author}\n\n`;
      }
      if (document.metadata.created) {
        markdown += `**Created:** ${document.metadata.created}\n\n`;
      }
    }

    // Add blocks
    document.blocks.forEach(block => {
      markdown += this.renderBlockToMarkdown(block, defaultOptions);
      markdown += '\n\n';
    });

    return markdown.trim();
  }

  /**
   * Get document statistics as HTML
   */
  renderStatsToHtml(document: S3Document): string {
    const blockCount = document.blocks.length;
    const languages = new Set(
      document.blocks.map(block => 
        block.language === 'multi' && typeof block.code === 'object'
          ? Object.keys(block.code).join(', ')
          : block.language
      )
    );

    return `
      <div class="s3-stats">
        <h3>Document Statistics</h3>
        <ul>
          <li><strong>Total Blocks:</strong> ${blockCount}</li>
          <li><strong>Languages:</strong> ${Array.from(languages).join(', ')}</li>
        </ul>
      </div>
    `;
  }

  // Private helper methods

  private simpleMarkdownToHtml(text: string): string {
    // Simple markdown conversion (in production, would use marked.js)
    return text
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  private renderCodeToHtml(block: Block, options: RenderOptions): string {
    if (block.language === 'multi' && typeof block.code === 'object') {
      return this.renderMultiLanguageCodeToHtml(block.code, block.metadata?.defaultLanguage, options);
    }

    const code = block.code as string;
    const language = block.language;

    // Simple code rendering (in production, would use Prism.js)
    return `<pre><code class="language-${language}">${this.escapeHtml(code)}</code></pre>`;
  }

  private renderMultiLanguageCodeToHtml(
    code: MultiLanguageCode, 
    defaultLanguage?: string, 
    options: RenderOptions = {}
  ): string {
    const languages = Object.keys(code);
    const defaultLang = defaultLanguage || languages[0];

    let html = '<div class="s3-multi-language-code">';
    
    // Language tabs
    html += '<div class="s3-language-tabs">';
    languages.forEach(lang => {
      const active = lang === defaultLang ? 'active' : '';
      html += `<button class="s3-language-tab ${active}" data-language="${lang}">${lang}</button>`;
    });
    html += '</div>';

    // Code blocks
    html += '<div class="s3-language-content">';
    languages.forEach(lang => {
      const active = lang === defaultLang ? 'active' : '';
      const codeHtml = `<pre><code class="language-${lang}">${this.escapeHtml(code[lang])}</code></pre>`;
      
      html += `<div class="s3-language-block ${active}" data-language="${lang}">${codeHtml}</div>`;
    });
    html += '</div>';

    html += '</div>';
    return html;
  }

  private renderBlockToMarkdown(block: Block, options: MarkdownExportOptions): string {
    let markdown = '';

    // Add block ID as comment if preserveIds is enabled
    if (options.preserveIds) {
      markdown += `<!-- Block ID: ${block.id} -->\n`;
    }

    // Add text content
    markdown += block.text;

    // Add code if enabled
    if (options.includeCodeBlocks) {
      markdown += '\n\n';
      
      if (block.language === 'multi' && typeof block.code === 'object') {
        Object.entries(block.code).forEach(([lang, code]) => {
          markdown += `### ${lang}\n\n`;
          markdown += this.formatCodeBlock(code, lang, options.codeBlockStyle || 'fenced');
          markdown += '\n\n';
        });
      } else {
        markdown += this.formatCodeBlock(block.code as string, block.language, options.codeBlockStyle || 'fenced');
      }
    }

    return markdown;
  }

  private formatCodeBlock(code: string, language: string, style: 'fenced' | 'indented'): string {
    if (style === 'fenced') {
      return `\`\`\`${language}\n${code}\n\`\`\``;
    } else {
      return code.split('\n').map(line => `    ${line}`).join('\n');
    }
  }

  private renderMetadataToHtml(document: S3Document, options: HtmlRenderOptions): string {
    if (!document.metadata) return '';

    let html = '<div class="s3-metadata">';
    
    if (document.metadata.description) {
      html += `<p class="s3-description">${this.escapeHtml(document.metadata.description)}</p>`;
    }

    if (document.metadata.author || document.metadata.created) {
      html += '<div class="s3-meta-info">';
      if (document.metadata.author) {
        html += `<span class="s3-author">By ${this.escapeHtml(document.metadata.author)}</span>`;
      }
      if (document.metadata.created) {
        html += `<span class="s3-date">${this.escapeHtml(document.metadata.created)}</span>`;
      }
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  private wrapInHtmlDocument(content: string, options: HtmlRenderOptions): string {
    const title = options.title || 'Software 3 Document';
    const theme = options.theme || 'light';

    return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  ${this.getStylesheets(options)}
  ${this.getJavaScript()}
</head>
<body>
  <div class="s3-document">
    <header class="s3-header">
      <h1>${this.escapeHtml(title)}</h1>
    </header>
    <main class="s3-main">
      ${content}
    </main>
  </div>
</body>
</html>`;
  }

  private getStylesheets(options: HtmlRenderOptions): string {
    let styles = `<style>${this.getDefaultCSS()}</style>`;

    if (options.customCss) {
      styles += `<style>${options.customCss}</style>`;
    }

    return styles;
  }

  private getJavaScript(): string {
    return `
      <script>
        // Software 3 toggle functionality
        document.addEventListener('DOMContentLoaded', function() {
          document.querySelectorAll('.s3-toggle-btn').forEach(btn => {
            btn.addEventListener('click', function() {
              const block = this.closest('.s3-block');
              const view = this.dataset.view;
              
              // Update active button
              block.querySelectorAll('.s3-toggle-btn').forEach(b => b.classList.remove('active'));
              this.classList.add('active');
              
              // Update active view
              block.querySelectorAll('.s3-view').forEach(v => v.classList.remove('active'));
              const targetView = block.querySelector(\`.s3-view[data-view="\${view}"]\`);
              if (targetView) targetView.classList.add('active');
            });
          });

          // Multi-language code switching
          document.querySelectorAll('.s3-language-tab').forEach(tab => {
            tab.addEventListener('click', function() {
              const container = this.closest('.s3-multi-language-code');
              const language = this.dataset.language;
              
              // Update active tab
              container.querySelectorAll('.s3-language-tab').forEach(t => t.classList.remove('active'));
              this.classList.add('active');
              
              // Update active code block
              container.querySelectorAll('.s3-language-block').forEach(b => b.classList.remove('active'));
              const targetBlock = container.querySelector(\`.s3-language-block[data-language="\${language}"]\`);
              if (targetBlock) targetBlock.classList.add('active');
            });
          });
        });
      </script>
    `;
  }

  private getDefaultCSS(): string {
    return `
      .s3-document {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      }

      .s3-block {
        margin-bottom: 2rem;
        border: 1px solid #e1e5e9;
        border-radius: 8px;
        overflow: hidden;
      }

      .s3-toggle-container {
        background: #f8f9fa;
        border-bottom: 1px solid #e1e5e9;
        padding: 0;
      }

      .s3-toggle-buttons {
        display: flex;
        margin: 0;
      }

      .s3-toggle-btn {
        flex: 1;
        padding: 12px 16px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .s3-toggle-btn:hover {
        background: #e9ecef;
      }

      .s3-toggle-btn.active {
        background: white;
        border-bottom: 2px solid #007bff;
        color: #007bff;
      }

      .s3-view {
        display: none;
        padding: 1.5rem;
      }

      .s3-view.active {
        display: block;
      }

      .s3-multi-language-code {
        border: 1px solid #e1e5e9;
        border-radius: 4px;
        overflow: hidden;
      }

      .s3-language-tabs {
        display: flex;
        background: #f8f9fa;
        border-bottom: 1px solid #e1e5e9;
      }

      .s3-language-tab {
        padding: 8px 16px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      }

      .s3-language-tab:hover {
        background: #e9ecef;
      }

      .s3-language-tab.active {
        background: white;
        border-bottom: 2px solid #007bff;
        color: #007bff;
      }

      .s3-language-block {
        display: none;
      }

      .s3-language-block.active {
        display: block;
      }

      .s3-metadata {
        margin-bottom: 2rem;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 4px;
      }

      pre {
        margin: 0;
        border-radius: 4px;
        overflow-x: auto;
        background: #f8f9fa;
        padding: 1rem;
      }

      code {
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      }

      @media (max-width: 768px) {
        .s3-document {
          padding: 10px;
        }

        .s3-toggle-btn {
          padding: 10px 12px;
          font-size: 14px;
        }

        .s3-view {
          padding: 1rem;
        }
      }
    `;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
} 