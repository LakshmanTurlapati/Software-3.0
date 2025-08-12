import { S3Document, Block, ValidationResult, ParserConfig, DocumentStats } from './types';
/**
 * Main parser class for Software 3 (.s3) documents
 */
export declare class S3Parser {
    private validator;
    private config;
    constructor(config?: ParserConfig);
    /**
     * Parse a .s3 file content from string
     */
    parse(content: string): S3Document;
    /**
     * Parse .s3 file from file system (Node.js only)
     * Note: This method will only work in Node.js environments
     */
    parseFile(filePath: string): Promise<S3Document>;
    /**
     * Validate a .s3 document
     */
    validate(document: S3Document): ValidationResult;
    /**
     * Generate a new .s3 document
     */
    create(title: string, blocks?: Block[]): S3Document;
    /**
     * Add a block to a document
     */
    addBlock(document: S3Document, block: Block): void;
    /**
     * Remove a block from a document
     */
    removeBlock(document: S3Document, blockId: string): boolean;
    /**
     * Update a block in a document
     */
    updateBlock(document: S3Document, blockId: string, updates: Partial<Block>): boolean;
    /**
     * Reorder blocks in a document
     */
    reorderBlocks(document: S3Document, blockOrder: string[]): void;
    /**
     * Generate document statistics
     */
    generateStats(document: S3Document): DocumentStats;
    /**
     * Serialize document back to JSON string
     */
    stringify(document: S3Document, indent?: number): string;
    /**
     * Clone a document
     */
    clone(document: S3Document): S3Document;
    /**
     * Merge two documents
     */
    merge(doc1: S3Document, doc2: S3Document, title?: string): S3Document;
    /**
     * Extract blocks by criteria
     */
    extractBlocks(document: S3Document, criteria: {
        tags?: string[];
        languages?: string[];
        complexity?: string[];
        ids?: string[];
    }): Block[];
    private normalizeDocument;
    private ensureUniqueBlockIds;
    private generateUniqueBlockId;
}
//# sourceMappingURL=parser.d.ts.map