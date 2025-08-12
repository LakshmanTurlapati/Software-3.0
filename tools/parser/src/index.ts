/**
 * Software 3 (.s3) Parser Library
 * Main entry point
 */

// Export all types
export * from './types';

// Export main parser class
export { S3Parser } from './parser';

// Export validator
export { Validator } from './validator';

// Export renderer
export { S3Renderer } from './renderer';

// Note: Utils temporarily disabled to avoid circular dependencies
// export { createDocument, createBlock } from './utils';

// Basic validation function
export function validateS3Content(content: string) {
  try {
    const document = JSON.parse(content);
    return !!(document.version && document.title && Array.isArray(document.blocks));
  } catch {
    return false;
  }
}

// Default export for convenience
export { S3Parser as default } from './parser'; 