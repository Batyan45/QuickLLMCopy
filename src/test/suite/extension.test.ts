import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('Extension Test Suite', () => {
	const testWorkspaceFolder = path.join(__dirname, '../../../test-workspace');
	const testFiles = {
		file1: 'test1.txt',
		file2: 'test2.txt',
		subdir: 'subdir',
		subdirFile: 'subdir/test3.txt'
	};

	suiteSetup(async function() {
		// Increase timeout for setup
		this.timeout(30000); // Increased timeout for slower systems

		console.log('Setting up test workspace...');
		
		// Create test workspace with sample files
		if (!fs.existsSync(testWorkspaceFolder)) {
			console.log(`Creating test workspace at ${testWorkspaceFolder}`);
			fs.mkdirSync(testWorkspaceFolder, { recursive: true });
		}
		
		// Create test files
		console.log('Creating test files...');
		fs.writeFileSync(path.join(testWorkspaceFolder, testFiles.file1), 'Test content 1');
		fs.writeFileSync(path.join(testWorkspaceFolder, testFiles.file2), 'Test content 2');
		
		// Create subdirectory with a file
		const subdirPath = path.join(testWorkspaceFolder, testFiles.subdir);
		if (!fs.existsSync(subdirPath)) {
			fs.mkdirSync(subdirPath);
		}
		fs.writeFileSync(path.join(testWorkspaceFolder, testFiles.subdirFile), 'Test content 3');

		// Wait for VS Code to fully initialize
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Wait for the extension to activate
		console.log('Waiting for extension to activate...');
		const ext = vscode.extensions.getExtension('batyan-soft.quick-llm-copy');
		if (!ext) {
			console.error('Available extensions:', vscode.extensions.all.map(e => e.id).join(', '));
			throw new Error('Extension not found');
		}

		if (!ext.isActive) {
			console.log('Activating extension...');
			await ext.activate();
		}
		
		console.log('Extension activated successfully');
	});

	suiteTeardown(async () => {
		console.log('Cleaning up test workspace...');
		try {
			if (fs.existsSync(testWorkspaceFolder)) {
				fs.rmSync(testWorkspaceFolder, { recursive: true, force: true });
			}
		} catch (error) {
			console.error('Error during cleanup:', error);
		}
	});

	test('Extension should be present and active', async function() {
		this.timeout(10000);
		console.log('Testing extension presence...');
		const ext = vscode.extensions.getExtension('batyan-soft.quick-llm-copy');
		assert.ok(ext, 'Extension should be present');
		assert.strictEqual(ext.isActive, true, 'Extension should be active');
	});

	test('Should copy single file content', async function() {
		this.timeout(10000);
		console.log('Testing single file copy...');
		
		const uri = vscode.Uri.file(path.join(testWorkspaceFolder, testFiles.file1));
		console.log('Copying file:', uri.fsPath);
		
		try {
			// Test with default prefix
			await vscode.commands.executeCommand('quick-llm-copy.copyFiles', uri);
			let clipboardContent = await vscode.env.clipboard.readText();
			console.log('Clipboard content:', clipboardContent);
			assert.ok(clipboardContent.includes('Provided code:'), 'Should include default header');
			assert.ok(clipboardContent.includes('test1.txt'), 'Should include filename');
			assert.ok(clipboardContent.includes('Test content 1'), 'Should include file content');

			// Test with custom prefix
			await vscode.workspace.getConfiguration().update('quickLLMCopy.prefixText', 'Custom Header:', true);
			await vscode.commands.executeCommand('quick-llm-copy.copyFiles', uri);
			clipboardContent = await vscode.env.clipboard.readText();
			assert.ok(clipboardContent.includes('Custom Header:'), 'Should include custom header');

			// Reset to default
			await vscode.workspace.getConfiguration().update('quickLLMCopy.prefixText', undefined, true);
		} catch (error) {
			console.error('Error during single file copy test:', error);
			throw error;
		}
	});

	test('Should copy multiple files', async function() {
		this.timeout(10000);
		console.log('Testing multiple files copy...');
		
		const uris = [
			vscode.Uri.file(path.join(testWorkspaceFolder, testFiles.file1)),
			vscode.Uri.file(path.join(testWorkspaceFolder, testFiles.file2))
		];
		
		try {
			await vscode.commands.executeCommand('quick-llm-copy.copyFiles', uris[0], uris);
			const clipboardContent = await vscode.env.clipboard.readText();
			console.log('Clipboard content:', clipboardContent);
			assert.ok(clipboardContent.includes('test1.txt'), 'Should include first filename');
			assert.ok(clipboardContent.includes('test2.txt'), 'Should include second filename');
			assert.ok(clipboardContent.includes('Test content 1'), 'Should include first file content');
			assert.ok(clipboardContent.includes('Test content 2'), 'Should include second file content');
		} catch (error) {
			console.error('Error during multiple files copy test:', error);
			throw error;
		}
	});

	test('Should copy directory contents recursively', async function() {
		this.timeout(10000);
		console.log('Testing directory copy...');
		
		const uri = vscode.Uri.file(path.join(testWorkspaceFolder, testFiles.subdir));
		try {
			await vscode.commands.executeCommand('quick-llm-copy.copyFiles', uri);
			const clipboardContent = await vscode.env.clipboard.readText();
			console.log('Clipboard content:', clipboardContent);
			assert.ok(clipboardContent.includes('test3.txt'), 'Should include file from subdirectory');
			assert.ok(clipboardContent.includes('Test content 3'), 'Should include content from subdirectory');
		} catch (error) {
			console.error('Error during directory copy test:', error);
			throw error;
		}
	});

	test('Should handle non-existent files gracefully', async function() {
		this.timeout(10000);
		console.log('Testing non-existent file handling...');
		
		const uri = vscode.Uri.file(path.join(testWorkspaceFolder, 'nonexistent.txt'));
		try {
			await vscode.commands.executeCommand('quick-llm-copy.copyFiles', uri);
			const clipboardContent = await vscode.env.clipboard.readText();
			console.log('Clipboard content:', clipboardContent);
			assert.ok(clipboardContent.includes('Provided code:'), 'Should still include header');
		} catch (error) {
			console.error('Error during non-existent file test:', error);
			throw error;
		}
	});
}); 