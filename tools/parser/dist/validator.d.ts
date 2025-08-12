import { S3Document, ValidationResult, ParserConfig } from './types';
/**
 * Simplified validator class for .s3 documents
 * In production, this would use AJV with the full JSON schema
 */
export declare class Validator {
    private config;
    constructor(config: ParserConfig);
    /**
     * Validate a .s3 document
     */
    validate(document: S3Document): ValidationResult;
    private validateBasicStructure;
    private validateBlock;
    private validateBlockIds;
    private validateLanguageConsistency;
    private validateMetadata;
}
//# sourceMappingURL=validator.d.ts.map