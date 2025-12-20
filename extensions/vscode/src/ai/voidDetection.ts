import * as vscode from 'vscode';

/**
 * Detects if the extension is running in Void editor
 */
export function isRunningInVoid(): boolean {
    // Check multiple indicators to confirm Void environment
    const appName = vscode.env.appName;
    const appHost = vscode.env.appHost;
    
    // Void uses "Void" as appName instead of "Visual Studio Code"
    const isVoid = appName === 'Void' || 
                   appName?.toLowerCase().includes('void') ||
                   appHost?.toLowerCase().includes('void');
    
    return isVoid;
}

/**
 * Gets environment information for debugging
 */
export function getEnvironmentInfo(): {
    appName: string;
    appHost: string;
    appRoot: string;
    isVoid: boolean;
} {
    return {
        appName: vscode.env.appName,
        appHost: vscode.env.appHost,
        appRoot: vscode.env.appRoot,
        isVoid: isRunningInVoid()
    };
}