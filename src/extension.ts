// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
async function isDirectory(uri: vscode.Uri): Promise<boolean> {
	try {
		const stat = await vscode.workspace.fs.stat(uri);
		return (stat.type & vscode.FileType.Directory) !== 0;
	} catch (error) {
		return false;
	}
}

async function getAllFiles(uri: vscode.Uri): Promise<vscode.Uri[]> {
	const result: vscode.Uri[] = [];
	const stat = await vscode.workspace.fs.stat(uri);

	if ((stat.type & vscode.FileType.Directory) !== 0) {
		const entries = await vscode.workspace.fs.readDirectory(uri);
		for (const [name, type] of entries) {
			const childUri = vscode.Uri.joinPath(uri, name);
			if (type === vscode.FileType.Directory) {
				result.push(...await getAllFiles(childUri));
			} else if (type === vscode.FileType.File) {
				result.push(childUri);
			}
		}
	} else {
		result.push(uri);
	}

	return result;
}

async function generateDirectoryTree(rootUri: vscode.Uri, indent: string = ''): Promise<string> {
	let tree = '';
	const entries = await vscode.workspace.fs.readDirectory(rootUri);
	
	// Sort entries: directories first, then files
    entries.sort((a, b) => {
    	const aIsDir = a[1] === vscode.FileType.Directory;
    	const bIsDir = b[1] === vscode.FileType.Directory;
    	
    	if (aIsDir && !bIsDir) { return -1; }
    	if (!aIsDir && bIsDir) { return 1; }
    	return a[0].localeCompare(b[0]);
    });
	
	for (let i = 0; i < entries.length; i++) {
		const [name, type] = entries[i];
		const isLast = i === entries.length - 1;
		const prefix = isLast ? '└── ' : '├── ';
		const childIndent = isLast ? indent + '    ' : indent + '│   ';
		
		tree += `${indent}${prefix}${name}${type === vscode.FileType.Directory ? '/' : ''}\n`;
		
		if (type === vscode.FileType.Directory) {
			const childUri = vscode.Uri.joinPath(rootUri, name);
			tree += await generateDirectoryTree(childUri, childIndent);
		}
	}
	
	return tree;
}

export function activate(context: vscode.ExtensionContext) {
	// Register the original command
	let disposable = vscode.commands.registerCommand('quick-llm-copy.copyFiles', async (uri: vscode.Uri, uris: vscode.Uri[]) => {
		try {
			// Use the array of uris if multiple files/directories are selected, otherwise use the single uri
			const itemsToProcess = uris || [uri];
			let allFiles: vscode.Uri[] = [];

			// Process each selected item (file or directory)
			for (const item of itemsToProcess) {
				if (await isDirectory(item)) {
					allFiles.push(...await getAllFiles(item));
				} else {
					allFiles.push(item);
				}
			}

			// Get prefix text from configuration
			const config = vscode.workspace.getConfiguration('quickLLMCopy');
			const prefixText = config.get<string>('prefixText', 'Provided code:');

			let resultText = `${prefixText}\n\n`;

			for (const fileUri of allFiles) {
				try {
					const document = await vscode.workspace.openTextDocument(fileUri);
					const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, fileUri.fsPath);
					
					resultText += `File: ${relativePath}\n`;
					resultText += '```\n';
					resultText += document.getText();
					resultText += '\n```\n\n';
				} catch (error) {
					console.error(`Failed to process file ${fileUri.fsPath}: ${error}`);
					// Skip files that can't be read and continue with others
					continue;
				}
			}

			await vscode.env.clipboard.writeText(resultText);
			vscode.window.showInformationMessage('Code copied to clipboard!');
		} catch (error) {
			vscode.window.showErrorMessage('Failed to copy code: ' + error);
		}
	});

	// Register the new command with codebase tree
	let disposableWithCodebase = vscode.commands.registerCommand('quick-llm-copy.copyFilesWithCodebase', async (uri: vscode.Uri, uris: vscode.Uri[]) => {
		try {
			// Use the array of uris if multiple files/directories are selected, otherwise use the single uri
			const itemsToProcess = uris || [uri];
			let allFiles: vscode.Uri[] = [];

			// Process each selected item (file or directory)
			for (const item of itemsToProcess) {
				if (await isDirectory(item)) {
					allFiles.push(...await getAllFiles(item));
				} else {
					allFiles.push(item);
				}
			}

			// Get configuration
			const config = vscode.workspace.getConfiguration('quickLLMCopy');
			const prefixText = config.get<string>('prefixText', 'Provided code:');
			const codebaseText = config.get<string>('codebaseText', 'You can ask for other files from the codebase if needed:');

			let resultText = `${prefixText}\n\n`;

			// Add selected files
			for (const fileUri of allFiles) {
				try {
					const document = await vscode.workspace.openTextDocument(fileUri);
					const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, fileUri.fsPath);
					
					resultText += `File: ${relativePath}\n`;
					resultText += '```\n';
					resultText += document.getText();
					resultText += '\n```\n\n';
				} catch (error) {
					console.error(`Failed to process file ${fileUri.fsPath}: ${error}`);
					// Skip files that can't be read and continue with others
					continue;
				}
			}

			// Add codebase tree
			resultText += `${codebaseText}\n\n`;
			resultText += '```\n';
			resultText += `Project structure:\n`;
			
			if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
				const rootUri = vscode.workspace.workspaceFolders[0].uri;
				resultText += await generateDirectoryTree(rootUri);
			}
			
			resultText += '```\n';

			await vscode.env.clipboard.writeText(resultText);
			vscode.window.showInformationMessage('Code with codebase structure copied to clipboard!');
		} catch (error) {
			vscode.window.showErrorMessage('Failed to copy code with codebase: ' + error);
		}
	});

	context.subscriptions.push(disposable, disposableWithCodebase);

	// Register command to copy SCM changes from the Source Control view input icon
	let disposableScm = vscode.commands.registerCommand('quick-llm-copy.copyScmChanges', async () => {
		try {
			const config = vscode.workspace.getConfiguration('quickLLMCopy');
			const prefixText = config.get<string>('prefixText', 'Provided code:');

			// Access Git extension API
			const gitExtension = vscode.extensions.getExtension('vscode.git');
			const gitExports = gitExtension?.exports as any;
			const gitApi = gitExports?.getAPI?.(1);

			if (!gitApi) {
				vscode.window.showErrorMessage('Git extension API is not available.');
				return;
			}

			const repositories: any[] = gitApi.repositories || [];
			const changedFileUris: Map<string, vscode.Uri> = new Map();

			for (const repo of repositories) {
				const state = repo.state;
				const indexChanges: any[] = state?.indexChanges ?? [];
				const workingTreeChanges: any[] = state?.workingTreeChanges ?? [];
				const mergeChanges: any[] = state?.mergeChanges ?? [];

				// Prefer working tree changes over index changes when duplicates exist
				for (const change of [...indexChanges, ...mergeChanges, ...workingTreeChanges]) {
					const uri: vscode.Uri | undefined = change?.uri ?? change?.resourceUri;
					if (!uri) { continue; }
					const key = uri.fsPath;
					changedFileUris.set(key, uri);
				}
			}

			if (changedFileUris.size === 0) {
				vscode.window.showInformationMessage('No changes to copy.');
				return;
			}

			let resultText = `${prefixText}\n\n`;

			for (const uri of changedFileUris.values()) {
				try {
					// Skip deleted files (they may no longer exist on disk)
					try {
						await vscode.workspace.fs.stat(uri);
					} catch {
						continue;
					}

					const document = await vscode.workspace.openTextDocument(uri);
					const relativePath = vscode.workspace.asRelativePath(uri);

					resultText += `File: ${relativePath}\n`;
					resultText += '```\n';
					resultText += document.getText();
					resultText += '\n```\n\n';
				} catch (error) {
					console.error(`Failed to process changed file ${uri.fsPath}: ${error}`);
					continue;
				}
			}

			await vscode.env.clipboard.writeText(resultText);
			vscode.window.showInformationMessage('SCM changes copied to clipboard!');
		} catch (error) {
			vscode.window.showErrorMessage('Failed to copy SCM changes: ' + error);
		}
	});

	context.subscriptions.push(disposableScm);

  // Register command to copy SCM diffs (unified patches) instead of full files
  let disposableScmDiff = vscode.commands.registerCommand('quick-llm-copy.copyScmDiff', async () => {
    try {
      const config = vscode.workspace.getConfiguration('quickLLMCopy');
      const prefixText = config.get<string>('prefixText', 'Provided code:');

      // Access Git extension API
      const gitExtension = vscode.extensions.getExtension('vscode.git');
      const gitExports = gitExtension?.exports as any;
      const gitApi = gitExports?.getAPI?.(1);

      if (!gitApi) {
        vscode.window.showErrorMessage('Git extension API is not available.');
        return;
      }

      const repositories: any[] = gitApi.repositories || [];
      if (repositories.length === 0) {
        vscode.window.showInformationMessage('No Git repositories found.');
        return;
      }

      let resultText = `${prefixText}\n\n`;
      let anyDiffs = false;

      for (const repo of repositories) {
        const rootUri: vscode.Uri | undefined = repo.rootUri ?? repo.root;
        if (!rootUri) {
          continue;
        }

        const cwd = rootUri.fsPath;

        // Collect combined diff against HEAD (covers staged + unstaged)
        let diffCombined = '';
        try {
          const { stdout } = await execFileAsync('git', ['diff', '--no-color', 'HEAD'], { cwd, maxBuffer: 1024 * 1024 * 50 });
          diffCombined = stdout.trim();
        } catch (err: any) {
          const stdout = (err?.stdout as string | undefined)?.toString() ?? '';
          const stderr = (err?.stderr as string | undefined)?.toString() ?? '';
          // git diff exits with 1 when diffs exist in some versions; prefer capturing stdout
          if (stdout.trim().length > 0) {
            diffCombined = stdout.trim();
          } else if (stderr.trim().length > 0) {
            console.error('git diff HEAD error:', stderr);
          }
        }

        // Collect untracked files and generate diffs from /dev/null
        let untrackedList: string[] = [];
        try {
          const { stdout } = await execFileAsync('git', ['ls-files', '--others', '--exclude-standard'], { cwd });
          untrackedList = stdout.split('\n').map(s => s.trim()).filter(Boolean);
        } catch (err) {
          console.error('git ls-files error:', err);
        }

        let untrackedDiffs = '';
        for (const relPath of untrackedList) {
          try {
            const { stdout } = await execFileAsync('git', ['diff', '--no-color', '--no-index', '--', '/dev/null', relPath], { cwd, maxBuffer: 1024 * 1024 * 50 });
            if (stdout && stdout.trim().length > 0) {
              untrackedDiffs += (untrackedDiffs ? '\n' : '') + stdout.trim();
            }
          } catch (err: any) {
            const stdout = (err?.stdout as string | undefined)?.toString() ?? '';
            // For --no-index, git returns exit code 1 when there are differences; take stdout
            if (stdout.trim().length > 0) {
              untrackedDiffs += (untrackedDiffs ? '\n' : '') + stdout.trim();
            } else {
              const stderr = (err?.stderr as string | undefined)?.toString() ?? '';
              if (stderr.trim().length > 0) {
                console.error(`git diff --no-index for ${relPath} error:`, stderr);
              }
            }
          }
        }

        const combinedForRepo = [diffCombined, untrackedDiffs].filter(Boolean).join('\n');
        if (combinedForRepo.length === 0) {
          continue;
        }

        anyDiffs = true;
        const repoLabel = path.basename(cwd);
        resultText += `Repository: ${repoLabel}\n`;
        resultText += '```\n';
        resultText += combinedForRepo;
        resultText += '\n```\n\n';
      }

      if (!anyDiffs) {
        vscode.window.showInformationMessage('No changes to copy.');
        return;
      }

      await vscode.env.clipboard.writeText(resultText);
      vscode.window.showInformationMessage('SCM diffs copied to clipboard!');
    } catch (error) {
      vscode.window.showErrorMessage('Failed to copy SCM diffs: ' + error);
    }
  });

  context.subscriptions.push(disposableScmDiff);
}

// This method is called when your extension is deactivated
export function deactivate() {}
