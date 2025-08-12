"use strict";
/**
 * Software 3 (.s3) Parser Library
 * Main entry point
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.S3Renderer = exports.Validator = exports.S3Parser = void 0;
exports.validateS3Content = validateS3Content;
// Export all types
__exportStar(require("./types"), exports);
// Export main parser class
var parser_1 = require("./parser");
Object.defineProperty(exports, "S3Parser", { enumerable: true, get: function () { return parser_1.S3Parser; } });
// Export validator
var validator_1 = require("./validator");
Object.defineProperty(exports, "Validator", { enumerable: true, get: function () { return validator_1.Validator; } });
// Export renderer
var renderer_1 = require("./renderer");
Object.defineProperty(exports, "S3Renderer", { enumerable: true, get: function () { return renderer_1.S3Renderer; } });
// Note: Utils temporarily disabled to avoid circular dependencies
// export { createDocument, createBlock } from './utils';
// Basic validation function
function validateS3Content(content) {
    try {
        const document = JSON.parse(content);
        return !!(document.version && document.title && Array.isArray(document.blocks));
    }
    catch {
        return false;
    }
}
// Default export for convenience
var parser_2 = require("./parser");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return parser_2.S3Parser; } });
//# sourceMappingURL=index.js.map