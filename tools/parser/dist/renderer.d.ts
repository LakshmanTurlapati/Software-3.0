import { S3Document, Block, HtmlRenderOptions, MarkdownExportOptions, RenderOptions } from './types';
/**
 * Simplified renderer class for Software 3 (.s3) documents
 * Note: In production, this would use external libraries for rendering
 */
export declare class S3Renderer {
    constructor();
    /**
     * Render document to HTML (simplified version)
     */
    renderToHtml(document: S3Document, options?: HtmlRenderOptions): string;
    /**
     * Render a single block to HTML (simplified version)
     */
    renderBlockToHtml(block: Block, options?: RenderOptions): string;
    /**
     * Export document to Markdown (simplified version)
     */
    exportToMarkdown(document: S3Document, options?: MarkdownExportOptions): string;
    /**
     * Get document statistics as HTML
     */
    renderStatsToHtml(document: S3Document): string;
    private simpleMarkdownToHtml;
    private renderCodeToHtml;
    private renderMultiLanguageCodeToHtml;
    private renderBlockToMarkdown;
    private formatCodeBlock;
    private renderMetadataToHtml;
    private wrapInHtmlDocument;
    private getStylesheets;
    private getJavaScript;
    private getDefaultCSS;
    private escapeHtml;
}
//# sourceMappingURL=renderer.d.ts.map