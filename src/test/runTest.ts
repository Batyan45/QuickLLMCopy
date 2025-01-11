import * as path from 'path';
import { runTests } from '@vscode/test-electron';
import * as fs from 'fs';

async function main() {
    try {
        console.log('Starting test runner...');
        
        // The folder containing the Extension Manifest package.json
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        console.log('Extension path:', extensionDevelopmentPath);

        // The path to the extension test runner script
        const extensionTestsPath = path.resolve(__dirname, './suite/index');
        console.log('Test path:', extensionTestsPath);

        // Create test workspace if it doesn't exist
        const workspacePath = path.resolve(__dirname, '../../test-workspace');
        console.log('Workspace path:', workspacePath);
        
        if (!fs.existsSync(workspacePath)) {
            console.log('Creating workspace directory...');
            fs.mkdirSync(workspacePath, { recursive: true });
        }

        // Use system VS Code installation
        process.env.VSCODE_TEST_USE_SYSTEM_INSTALLATION = '1';
        
        console.log('Running tests...');
        // Run the integration test
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                workspacePath,
                '--disable-gpu',
                '--disable-workspace-trust',
                '--skip-welcome',
                '--skip-release-notes',
                '--disable-telemetry'
            ]
        });
        console.log('Tests completed successfully');
    } catch (err) {
        console.error('Failed to run tests:', err);
        process.exit(1);
    }
}

main(); 