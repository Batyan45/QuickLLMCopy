// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('copy-for-llm.copyFiles', async (uri: vscode.Uri, uris: vscode.Uri[]) => {
		try {
			// Use the array of uris if multiple files are selected, otherwise use the single uri
			const filesToProcess = uris || [uri];
			
			let resultText = 'Provided code:\n\n';

			for (const fileUri of filesToProcess) {
				const document = await vscode.workspace.openTextDocument(fileUri);
				const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, fileUri.fsPath);
				
				resultText += `File: ${relativePath}\n`;
				resultText += '```\n';
				resultText += document.getText();
				resultText += '\n```\n\n';
			}

			await vscode.env.clipboard.writeText(resultText);
			vscode.window.showInformationMessage('Code copied to clipboard!');
		} catch (error) {
			vscode.window.showErrorMessage('Failed to copy code: ' + error);
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
