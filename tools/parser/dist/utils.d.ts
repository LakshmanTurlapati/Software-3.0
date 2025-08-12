import { S3Document, Block, DocumentMetadata, BlockMetadata, ValidationResult, ProgrammingLanguage, ComplexityLevel } from './types';
/**
 * Create a new S3 document with default values
 */
export declare function createDocument(title: string, options?: {
    metadata?: Partial<DocumentMetadata>;
    blocks?: Block[];
}): S3Document;
/**
 * Create a new block with default values
 */
export declare function createBlock(id: string, text: string, code: string, language: ProgrammingLanguage, options?: {
    metadata?: Partial<BlockMetadata>;
}): Block;
/**
 * Create a multi-language block
 */
export declare function createMultiLanguageBlock(id: string, text: string, codeVariants: Record<string, string>, options?: {
    defaultLanguage?: string;
    metadata?: Partial<BlockMetadata>;
}): Block;
/**
 * Basic validation function for S3 content
 * Note: For full validation, use S3Parser.validate() method
 */
export declare function validateS3File(content: string): ValidationResult;
/**
 * Convert a simple text document to S3 format
 */
export declare function textToS3Document(title: string, text: string, options?: {
    author?: string;
    language?: ProgrammingLanguage;
    splitByHeadings?: boolean;
}): S3Document;
/**
 * Generate a unique block ID within a document
 */
export declare function generateUniqueBlockId(document: S3Document, baseName?: string): string;
/**
 * Extract all code from a document by language
 */
export declare function extractCodeByLanguage(document: S3Document, language?: ProgrammingLanguage): Record<string, string[]>;
/**
 * Get all unique tags from a document
 */
export declare function extractTags(document: S3Document): string[];
/**
 * Filter blocks by criteria
 */
export declare function filterBlocks(document: S3Document, criteria: {
    tags?: string[];
    languages?: ProgrammingLanguage[];
    complexity?: ComplexityLevel[];
    searchText?: string;
    executable?: boolean;
    hidden?: boolean;
}): Block[];
/**
 * Estimate reading time for a document
 */
export declare function estimateReadingTime(document: S3Document): {
    text: number;
    code: number;
    total: number;
};
/**
 * Clone a document deeply
 */
export declare function cloneDocument(document: S3Document): S3Document;
/**
 * Validate block ID format
 */
export declare function isValidBlockId(id: string): boolean;
/**
 * Sanitize block ID to make it valid
 */
export declare function sanitizeBlockId(id: string): string;
//# sourceMappingURL=utils.d.ts.map